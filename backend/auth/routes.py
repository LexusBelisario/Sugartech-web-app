from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
import re

from db import get_auth_db
from auth.models import User, Credentials, Admin
from auth.access_control import AccessControl

router = APIRouter(prefix="/auth", tags=["authentication"])

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    message: str
    access_status: str
    access_message: str
    user_type: str

# JWT settings
SECRET_KEY = os.getenv("SECRET_KEY", "secret_ngani")
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
    # First, try to find user in admin table
    admin = auth_db.query(Admin).filter(Admin.user_name == request.username).first()
    
    if admin:
        # Admin login flow
        if not verify_password(request.password, admin.password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )
        
        # Create JWT token for admin
        token_data = {
            "user_id": admin.id,
            "username": admin.user_name,
            "email": admin.email,
            "user_type": "admin",
            "full_name": f"{admin.first_name} {admin.last_name}"
        }
        access_token = create_access_token(token_data)
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "message": "Admin login successful",
            "access_status": "approved",
            "access_message": "Full admin access granted",
            "user_type": "admin"
        }
    
    # If not admin, check regular users table
    user = auth_db.query(User).filter(User.user_name == request.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Regular user login flow
    if not verify_password(request.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # Check user access using AccessControl
    access_info = AccessControl.check_user_access(user)
    
    # Create JWT token for regular user
    token_data = {
        "user_id": user.id,
        "username": user.user_name,
        "user_type": "user",
        "provincial_access": user.provincial_access,
        "municipal_access": user.municipal_access,
        "access_status": access_info['status']
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login successful" if access_info['status'] == 'approved' else "Login successful but with limited access",
        "access_status": access_info['status'],
        "access_message": access_info['message'],
        "user_type": "user"
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
    
    # Create new user with hashed password
    hashed_pw = hash_password(request.password)
    new_user = User(
        user_name=request.username,
        password=hashed_pw,
        provincial_access=None,  # Will need admin approval
        municipal_access=None    # Will need admin approval
    )
    
    auth_db.add(new_user)
    auth_db.commit()
    auth_db.refresh(new_user)
    
    return {
        "message": "User registered successfully. Please contact admin for access approval.",
        "username": new_user.user_name,
        "status": "pending_approval"
    }