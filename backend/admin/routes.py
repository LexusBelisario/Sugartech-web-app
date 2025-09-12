from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

from auth.dependencies import get_current_admin
from auth.models import Admin, User
from db import get_auth_db

router = APIRouter(prefix="/admin", tags=["admin"])

# Pydantic models for admin operations
class UserUpdate(BaseModel):
    provincial_access: Optional[str]
    municipal_access: Optional[str]

class UserResponse(BaseModel):
    id: int
    user_name: str
    provincial_access: Optional[str]
    municipal_access: Optional[str]

class AdminInfo(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    contact_number: str
    user_name: str

# Admin dashboard endpoint
@router.get("/dashboard")
async def admin_dashboard(
    current_admin: Admin = Depends(get_current_admin)
):
    """Get admin dashboard information"""
    return {
        "message": f"Welcome Admin {current_admin.first_name} {current_admin.last_name}",
        "admin_info": {
            "id": current_admin.id,
            "full_name": f"{current_admin.first_name} {current_admin.last_name}",
            "email": current_admin.email,
            "contact": current_admin.contact_number,
            "username": current_admin.user_name
        },
        "timestamp": datetime.utcnow().isoformat()
    }

# Get all users
@router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get all registered users"""
    users = db.query(User).all()
    return users

# Get users pending approval
@router.get("/users/pending")
async def get_pending_users(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get users with NULL provincial or municipal access"""
    users = db.query(User).filter(
        (User.provincial_access.is_(None)) | 
        (User.municipal_access.is_(None))
    ).all()
    
    return {
        "pending_users": [
            {
                "id": user.id,
                "username": user.user_name,
                "provincial_access": user.provincial_access,
                "municipal_access": user.municipal_access,
                "status": "No access" if user.provincial_access is None else "Partial access"
            } for user in users
        ],
        "total_pending": len(users)
    }

# Update user access
@router.put("/users/{user_id}/access")
async def update_user_access(
    user_id: int,
    user_update: UserUpdate,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Update user's provincial and municipal access"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update access
    if user_update.provincial_access is not None:
        user.provincial_access = user_update.provincial_access
    if user_update.municipal_access is not None:
        user.municipal_access = user_update.municipal_access
    
    db.commit()
    db.refresh(user)
    
    return {
        "message": "User access updated successfully",
        "user": {
            "id": user.id,
            "username": user.user_name,
            "provincial_access": user.provincial_access,
            "municipal_access": user.municipal_access
        },
        "updated_by": current_admin.user_name,
        "timestamp": datetime.utcnow().isoformat()
    }

# Get specific user details
@router.get("/users/{user_id}")
async def get_user_details(
    user_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get detailed information about a specific user"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "user": {
            "id": user.id,
            "username": user.user_name,
            "provincial_access": user.provincial_access,
            "municipal_access": user.municipal_access
        }
    }

# Delete user
@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Delete a user account"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    username = user.user_name
    db.delete(user)
    db.commit()
    
    return {
        "message": f"User '{username}' deleted successfully",
        "deleted_by": current_admin.user_name,
        "timestamp": datetime.utcnow().isoformat()
    }

# Get available provinces and municipalities
@router.get("/locations")
async def get_available_locations(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get list of available provinces and municipalities for assignment"""
    # This is a placeholder - adjust based on your actual data
    return {
        "provinces": [
            "Laguna",
            "Paranaque",
            "Batangas",
            "Cavite",
            "Rizal"
        ],
        "municipalities": {
            "Laguna": ["All", "calauan_laguna", "Pagsanjan, Laguna", "sta_cruz_laguna"],
            "Paranaque": ["All", "paranaque_city"],
            "Batangas": ["All", "batangas_city", "lipa_batangas"],
            "Cavite": ["All", "dasmarinas_cavite", "bacoor_cavite"],
            "Rizal": ["All", "antipolo_rizal", "cainta_rizal"]
        }
    }

# Admin statistics
@router.get("/statistics")
async def get_admin_statistics(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get system statistics for admin dashboard"""
    total_users = db.query(User).count()
    users_with_full_access = db.query(User).filter(
        User.provincial_access.isnot(None),
        User.municipal_access.isnot(None)
    ).count()
    users_pending_approval = db.query(User).filter(
        (User.provincial_access.is_(None)) | 
        (User.municipal_access.is_(None))
    ).count()
    
    return {
        "statistics": {
            "total_users": total_users,
            "users_with_full_access": users_with_full_access,
            "users_pending_approval": users_pending_approval,
            "users_with_partial_access": total_users - users_with_full_access - users_pending_approval
        },
        "generated_at": datetime.utcnow().isoformat()
    }