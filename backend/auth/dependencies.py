from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt
from jwt import PyJWTError
import os

from db import get_auth_db, get_main_db_session
from auth.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-this")
ALGORITHM = "HS256"

async def get_current_user(token: str = Depends(oauth2_scheme), auth_db: Session = Depends(get_auth_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: int = int(payload.get("user_id"))
        cred_number: int = int(payload.get("cred_number"))
        
        if user_id is None or cred_number is None:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception
    
    user = auth_db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise credentials_exception
    
    # Add cred_number to user object for convenience
    user.token_cred_number = cred_number
    return user

async def get_user_main_db(current_user: User = Depends(get_current_user)):
    """Get main database session for current user"""
    db = get_main_db_session(current_user.token_cred_number)
    try:
        yield db
    finally:
        db.close()