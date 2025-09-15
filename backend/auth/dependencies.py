from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import text
import jwt
from datetime import datetime
import os
from typing import Generator  # Add this import

from db import get_auth_db, get_user_database_session
from auth.models import User, Admin
from auth.access_control import AccessControl

security = HTTPBearer()

SECRET_KEY = os.getenv("SECRET_KEY", "secret_ngani")
ALGORITHM = "HS256"

async def get_current_user_or_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_db: Session = Depends(get_auth_db)
):
    """Get current user (either regular user or admin)"""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_type = payload.get("user_type")
        user_id = payload.get("user_id")
        
        if user_id is None or user_type is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
        
        if user_type == "admin":
            admin = auth_db.query(Admin).filter(Admin.id == user_id).first()
            if admin is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Admin not found"
                )
            admin.user_type = "admin"
            # Admin can choose which database to connect to
            # For now, default to postgres
            admin.provincial_access = "postgres"
            return admin
        else:
            user = auth_db.query(User).filter(User.id == user_id).first()
            if user is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found"
                )
            user.user_type = "user"
            return user
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_db: Session = Depends(get_auth_db)
) -> User:
    """Get current user only (not admin)"""
    user_or_admin = await get_current_user_or_admin(credentials, auth_db)
    
    if hasattr(user_or_admin, 'user_type') and user_or_admin.user_type == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint is for regular users only"
        )
    
    return user_or_admin

async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    auth_db: Session = Depends(get_auth_db)
) -> Admin:
    """Get current admin only (not regular user)"""
    user_or_admin = await get_current_user_or_admin(credentials, auth_db)
    
    if not hasattr(user_or_admin, 'user_type') or user_or_admin.user_type != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    return user_or_admin

def get_user_main_db(current_user: User = Depends(get_current_user)) -> Generator[Session, None, None]:
    """
    Get the database connection based on user's provincial access
    THIS IS THE KEY FUNCTION that routes users to their provincial database
    """
    # Check user access using existing access_control
    access_info = AccessControl.check_user_access(current_user)
    
    # If no provincial access, raise error
    if not current_user.provincial_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No provincial access assigned. Please contact administrator."
        )
    
    db = None
    try:
        # Get database session for user's provincial database
        db = get_user_database_session(current_user.provincial_access)
        
        # Verify we're connected to the correct database
        result = db.execute(text("SELECT current_database()"))
        current_db = result.scalar()
        
        print(f"=== DATABASE CONNECTION ===")
        print(f"User: {current_user.user_name}")
        print(f"Provincial Access: {current_user.provincial_access}")
        print(f"Connected to Database: {current_db}")
        print(f"Municipal Access: {current_user.municipal_access}")
        print(f"Access Status: {access_info['status']}")
        print(f"========================")
        
        yield db
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        print(f"Database connection error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection error: {str(e)}"
        )
    finally:
        if db:
            db.close()

def get_user_or_admin_db(current_user_or_admin = Depends(get_current_user_or_admin)) -> Generator[Session, None, None]:
    """
    Get database connection for either user or admin
    """
    provincial_access = getattr(current_user_or_admin, 'provincial_access', None)
    
    if not provincial_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No provincial access assigned"
        )
    
    db = None
    try:
        db = get_user_database_session(provincial_access)
        
        # Log connection
        result = db.execute(text("SELECT current_database()"))
        current_db = result.scalar()
        username = getattr(current_user_or_admin, 'user_name', 'Unknown')
        print(f"✅ {username} connected to database: {current_db}")
        
        yield db
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database connection error: {str(e)}"
        )
    finally:
        if db:
            db.close()

def require_approved_access(current_user: User = Depends(get_current_user)) -> User:
    """
    Dependency to ensure user has approved access
    """
    access_info = AccessControl.check_user_access(current_user)
    if access_info['status'] != 'approved':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access_info['message']
        )
    return current_user