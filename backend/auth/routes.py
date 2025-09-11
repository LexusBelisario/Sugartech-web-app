from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text  # Add this import
from pydantic import BaseModel
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
import re

from db import get_auth_db, set_current_cred_number
from auth.models import User, Credentials

router = APIRouter(prefix="/auth", tags=["authentication"])

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    cred_number: int

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    message: str

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

def validate_password(password: str) -> tuple[bool, str]:
    """
    Validate password requirements:
    - At least 8 characters
    - Contains at least one uppercase letter
    - Contains at least one lowercase letter
    - Contains at least one digit
    - Contains at least one special character
    
    Returns: (is_valid, error_message)
    """
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
        
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
        
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
        
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character (!@#$%^&*(),.?\":{}|<>)"
        
    return True, ""

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    except Exception as e:
        print(f"Password verification error: {e}")
        return False

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest, auth_db: Session = Depends(get_auth_db)):
    # Get user from auth DB
    user = auth_db.query(User).filter(User.user_name == request.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify password
    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Get credentials info
    credentials = auth_db.query(Credentials).filter(
        Credentials.cred_number == user.cred_number
    ).first()
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No database credentials found for user"
        )
    
    # Test connection to main DB
    try:
        from db import create_main_engine
        engine = create_main_engine(credentials)
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))  # Wrap SQL in text()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Cannot connect to database: {str(e)}"
        )
    
    # Set current credential number for backward compatibility
    set_current_cred_number(user.cred_number)
    
    # Create JWT token
    token_data = {
        "user_id": user.id,
        "username": user.user_name,
        "cred_number": user.cred_number
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": f"Connected to {credentials.dbname} database"
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, auth_db: Session = Depends(get_auth_db)):
    # Validate password
    is_valid, error_message = validate_password(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    
    # Check if user already exists
    existing_user = auth_db.query(User).filter(User.user_name == request.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )
    
    # Check if credentials exist
    credentials = auth_db.query(Credentials).filter(
        Credentials.cred_number == request.cred_number
    ).first()
    
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid credential number"
        )
    
    # Create new user with hashed password
    hashed_pw = hash_password(request.password)
    new_user = User(
        user_name=request.username,
        password=hashed_pw,
        cred_number=request.cred_number
    )
    
    auth_db.add(new_user)
    auth_db.commit()
    auth_db.refresh(new_user)
    
    return {
        "message": "User registered successfully",
        "username": new_user.user_name,
        "cred_number": new_user.cred_number,
        "password_requirements": "Password meets all security requirements"
    }