from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, create_engine, or_, and_ 
from sqlalchemy.pool import NullPool
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime, timedelta

from auth.dependencies import get_current_admin
from auth.models import Admin, User, UserRegistrationRequest, Credentials
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

class RegistrationReviewRequest(BaseModel):
    request_id: int
    action: str  # 'approve' or 'reject'
    remarks: Optional[str] = None
    # For approval, admin can modify access levels
    provincial_access: Optional[str] = None
    municipal_access: Optional[str] = None

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

@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    user_data: dict,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Update all user details"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update user fields
    if "first_name" in user_data:
        user.first_name = user_data["first_name"]
    if "last_name" in user_data:
        user.last_name = user_data["last_name"]
    if "email" in user_data:
        user.email = user_data["email"]
    if "contact_number" in user_data:
        user.contact_number = user_data["contact_number"]
    if "provincial_access" in user_data:
        user.provincial_access = user_data["provincial_access"]
    if "municipal_access" in user_data:
        user.municipal_access = user_data["municipal_access"]
    
    try:
        db.commit()
        db.refresh(user)
        
        return {
            "message": "User updated successfully",
            "user": {
                "id": user.id,
                "username": user.user_name,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "contact_number": user.contact_number,
                "provincial_access": user.provincial_access,
                "municipal_access": user.municipal_access
            },
            "updated_by": current_admin.user_name,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {str(e)}"
        )


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

@router.get("/users/all")
async def get_all_users_and_requests(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get all users and registration requests with their status"""
    
    # Get all registration requests
    all_requests = db.query(UserRegistrationRequest).order_by(
        UserRegistrationRequest.status,
        UserRegistrationRequest.request_date.desc()
    ).all()
    
    # Get all approved users
    all_users = db.query(User).order_by(User.id.desc()).all()
    
    # Separate by status
    pending_requests = [r for r in all_requests if r.status == 'pending']
    approved_requests = [r for r in all_requests if r.status == 'approved']
    rejected_requests = [r for r in all_requests if r.status == 'rejected']
    
    return {
        "pending_requests": [
            {
                "id": req.id,
                "type": "registration_request",
                "username": req.user_name,
                "first_name": req.first_name,
                "last_name": req.last_name,
                "email": req.email,
                "contact_number": req.contact_number,
                "requested_provincial_access": req.requested_provincial_access,
                "requested_municipal_access": req.requested_municipal_access,
                "request_date": req.request_date.isoformat() if req.request_date else None,
                "status": "pending"
            } for req in pending_requests
        ],
        "approved_users": [
            {
                "id": user.id,
                "type": "user",
                "username": user.user_name,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "email": user.email,
                "contact_number": user.contact_number,
                "provincial_access": user.provincial_access,
                "municipal_access": user.municipal_access,
                "has_full_access": bool(user.provincial_access and user.municipal_access),
                "status": "active"
            } for user in all_users
        ],
        "rejected_requests": [
            {
                "id": req.id,
                "username": req.user_name,
                "first_name": req.first_name,
                "last_name": req.last_name,
                "email": req.email,
                "rejected_date": req.review_date.isoformat() if req.review_date else None,
                "rejected_by": req.reviewed_by,
                "reason": req.remarks,
                "status": "rejected"
            } for req in rejected_requests
        ],
        "statistics": {
            "total_pending": len(pending_requests),
            "total_approved": len(all_users),
            "total_rejected": len(rejected_requests),
            "total_all": len(all_requests) + len(all_users)
        }
    }

# Specific endpoint for pending only
@router.get("/users/pending")
async def get_pending_users(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get only pending registration requests"""
    
    # Get pending registration requests
    pending_requests = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'pending'
    ).order_by(UserRegistrationRequest.request_date.desc()).all()
    
    return {
        "pending_requests": [
            {
                "id": req.id,
                "username": req.user_name,
                "first_name": req.first_name,
                "last_name": req.last_name,
                "email": req.email,
                "contact_number": req.contact_number,
                "requested_provincial_access": req.requested_provincial_access,
                "requested_municipal_access": req.requested_municipal_access,
                "request_date": req.request_date.isoformat() if req.request_date else None,
                "days_pending": (datetime.utcnow() - req.request_date).days if req.request_date else 0
            } for req in pending_requests
        ],
        "total_pending": len(pending_requests)
    }

# Update the existing statistics endpoint to include registration info
@router.get("/statistics")
async def get_admin_statistics(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get system statistics for admin dashboard"""
    try:
        # User statistics
        total_users = db.query(User).count()
        users_with_full_access = db.query(User).filter(
            User.provincial_access.isnot(None),
            User.municipal_access.isnot(None)
        ).count()
        users_with_partial_access = db.query(User).filter(
            or_(  # Use imported or_ instead of db.or_
                and_(User.provincial_access.isnot(None), User.municipal_access.is_(None)),
                and_(User.provincial_access.is_(None), User.municipal_access.isnot(None))
            )
        ).count()
        users_no_access = db.query(User).filter(
            User.provincial_access.is_(None),
            User.municipal_access.is_(None)
        ).count()
        
        # Registration request statistics
        pending_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.status == 'pending'
        ).count()
        approved_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.status == 'approved'
        ).count()
        rejected_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.status == 'rejected'
        ).count()
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.request_date >= seven_days_ago
        ).count()
        
        return {
            "users": {
                "total": total_users,
                "with_full_access": users_with_full_access,
                "with_partial_access": users_with_partial_access,
                "no_access": users_no_access
            },
            "registrations": {
                "pending": pending_registrations,
                "approved": approved_registrations,
                "rejected": rejected_registrations,
                "total": pending_registrations + approved_registrations + rejected_registrations,
                "recent_7_days": recent_registrations
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error in statistics endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating statistics: {str(e)}"
        )

@router.get("/locations")
async def get_available_locations(
    db: Session = Depends(get_auth_db)  # Remove current_admin dependency
):
    """Get list of available provinces and municipalities"""
    
    # Get database connection credentials
    creds = db.query(Credentials).first()
    if not creds:
        return {"provinces": [], "municipalities": {}}
    
    provinces = []
    municipalities = {}
    
    try:
        # Connect to postgres to get all databases
        postgres_url = f"postgresql://{creds.user}:{creds.password}@{creds.host}:{creds.port}/postgres"
        engine = create_engine(postgres_url, poolclass=NullPool)
        
        with engine.connect() as conn:
            databases_query = text("""
                SELECT datname 
                FROM pg_database 
                WHERE datistemplate = false 
                AND datname NOT IN ('postgres', 'credentials_login', 'template0', 'template1')
                AND datname NOT LIKE 'pg_%'
                ORDER BY datname;
            """)
            
            result = conn.execute(databases_query)
            province_databases = [row[0] for row in result.fetchall()]
        
        engine.dispose()
        
        for province_db in province_databases:
            display_province = province_db.replace('_', ' ').title()
            provinces.append(display_province)
            
            province_url = f"postgresql://{creds.user}:{creds.password}@{creds.host}:{creds.port}/{province_db}"
            prov_engine = create_engine(province_url, poolclass=NullPool)
            
            try:
                with prov_engine.connect() as prov_conn:
                    schemas_query = text("""
                        SELECT schema_name 
                        FROM information_schema.schemata 
                        WHERE schema_name NOT IN ('pg_catalog', 'information_schema', 'public', 'pg_toast')
                        AND schema_name NOT LIKE 'pg_%'
                        ORDER BY schema_name;
                    """)
                    
                    schemas_result = prov_conn.execute(schemas_query)
                    municipality_schemas = [row[0] for row in schemas_result.fetchall()]
                    
                    formatted_municipalities = ["All"]
                    for muni in municipality_schemas:
                        display_muni = muni.replace('_', ' ').title()
                        formatted_municipalities.append(display_muni)
                    
                    municipalities[display_province] = formatted_municipalities
                    
            except Exception as e:
                print(f"Error accessing {province_db}: {str(e)}")
                municipalities[display_province] = ["All"]
            finally:
                prov_engine.dispose()
                
    except Exception as e:
        print(f"Error fetching locations: {str(e)}")
        # Return sample data if database connection fails
        return {
            "provinces": ["Laguna", "Metro Manila"],
            "municipalities": {
                "Laguna": ["All", "Calauan Laguna", "Pagsanjan Laguna"],
                "Metro Manila": ["All", "Paranaque Manila"]
            }
        }
    
    return {
        "provinces": provinces,
        "municipalities": municipalities
    }

@router.get("/statistics")
async def get_admin_statistics(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get system statistics for admin dashboard"""
    try:
        # User statistics
        total_users = db.query(User).count()
        users_with_full_access = db.query(User).filter(
            User.provincial_access.isnot(None),
            User.municipal_access.isnot(None)
        ).count()
        users_with_partial_access = db.query(User).filter(
            or_(
                and_(User.provincial_access.isnot(None), User.municipal_access.is_(None)),
                and_(User.provincial_access.is_(None), User.municipal_access.isnot(None))
            )
        ).count()
        users_no_access = db.query(User).filter(
            User.provincial_access.is_(None),
            User.municipal_access.is_(None)
        ).count()
        
        # Registration request statistics
        pending_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.status == 'pending'
        ).count()
        approved_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.status == 'approved'
        ).count()
        rejected_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.status == 'rejected'
        ).count()
        
        # Recent activity (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_registrations = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.request_date >= seven_days_ago
        ).count()
        
        return {
            "users": {
                "total": total_users,
                "with_full_access": users_with_full_access,
                "with_partial_access": users_with_partial_access,
                "no_access": users_no_access
            },
            "registrations": {
                "pending": pending_registrations,
                "approved": approved_registrations,
                "rejected": rejected_registrations,
                "total": pending_registrations + approved_registrations + rejected_registrations,
                "recent_7_days": recent_registrations
            },
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        print(f"Error in statistics endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating statistics: {str(e)}"
        )

@router.get("/registration-requests")
async def get_registration_requests(
    status: str = "pending",  # can be 'pending', 'approved', 'rejected', or 'all'
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get registration requests based on status"""
    query = db.query(UserRegistrationRequest)
    
    if status != 'all':
        query = query.filter(UserRegistrationRequest.status == status)
    
    requests = query.order_by(UserRegistrationRequest.request_date.desc()).all()
    
    return {
        "requests": [
            {
                "id": req.id,
                "username": req.user_name,
                "first_name": req.first_name,
                "last_name": req.last_name,
                "email": req.email,
                "contact_number": req.contact_number,
                "requested_provincial_access": req.requested_provincial_access,
                "requested_municipal_access": req.requested_municipal_access,
                "status": req.status,
                "request_date": req.request_date.isoformat() if req.request_date else None,
                "reviewed_by": req.reviewed_by,
                "review_date": req.review_date.isoformat() if req.review_date else None,
                "remarks": req.remarks
            } for req in requests
        ],
        "total": len(requests)
    }

# Review (approve/reject) registration request
@router.post("/review-registration")
async def review_registration(
    review: RegistrationReviewRequest,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Approve or reject a registration request"""
    try:
        # Get the registration request
        reg_request = db.query(UserRegistrationRequest).filter(
            UserRegistrationRequest.id == review.request_id
        ).first()
        
        if not reg_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Registration request not found"
            )
        
        if reg_request.status != 'pending':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Request already {reg_request.status}"
            )
        
        # Update the request
        reg_request.reviewed_by = current_admin.user_name
        reg_request.review_date = datetime.utcnow()
        reg_request.remarks = review.remarks
        
        if review.action == 'approve':
            # Check if username or email already exists
            existing_user = db.query(User).filter(
                (User.user_name == reg_request.user_name) | 
                (User.email == reg_request.email)
            ).first()
            
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username or email already exists in users table"
                )
            
            # Create new user in users_table
            new_user = User(
                user_name=reg_request.user_name,
                password=reg_request.password,  # Already hashed
                first_name=reg_request.first_name,
                last_name=reg_request.last_name,
                email=reg_request.email,
                contact_number=reg_request.contact_number,
                provincial_access=review.provincial_access or reg_request.requested_provincial_access,
                municipal_access=review.municipal_access or reg_request.requested_municipal_access
            )
            
            db.add(new_user)
            reg_request.status = 'approved'
            
            db.commit()
            
            return {
                "message": f"Registration approved for user {reg_request.user_name}",
                "user_id": new_user.id,
                "status": "success",
                "approved_by": current_admin.user_name,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        elif review.action == 'reject':
            reg_request.status = 'rejected'
            db.commit()
            
            return {
                "message": f"Registration rejected for user {reg_request.user_name}",
                "status": "success",
                "rejected_by": current_admin.user_name,
                "timestamp": datetime.utcnow().isoformat()
            }
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Use 'approve' or 'reject'"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in review_registration: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing registration: {str(e)}"
        )

@router.put("/registration-requests/{request_id}")
async def update_registration_request(
    request_id: int,
    request_data: dict,
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Update registration request details"""
    reg_request = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.id == request_id
    ).first()
    
    if not reg_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Registration request not found"
        )
    
    # Update request fields
    if "first_name" in request_data:
        reg_request.first_name = request_data["first_name"]
    if "last_name" in request_data:
        reg_request.last_name = request_data["last_name"]
    if "email" in request_data:
        reg_request.email = request_data["email"]
    if "contact_number" in request_data:
        reg_request.contact_number = request_data["contact_number"]
    if "requested_provincial_access" in request_data:
        reg_request.requested_provincial_access = request_data["requested_provincial_access"]
    if "requested_municipal_access" in request_data:
        reg_request.requested_municipal_access = request_data["requested_municipal_access"]
    
    try:
        db.commit()
        db.refresh(reg_request)
        
        return {
            "message": "Registration request updated successfully",
            "request": {
                "id": reg_request.id,
                "username": reg_request.user_name,
                "first_name": reg_request.first_name,
                "last_name": reg_request.last_name,
                "email": reg_request.email,
                "contact_number": reg_request.contact_number,
                "requested_provincial_access": reg_request.requested_provincial_access,
                "requested_municipal_access": reg_request.requested_municipal_access,
                "status": reg_request.status
            },
            "updated_by": current_admin.user_name,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update registration request: {str(e)}"
        )

# Registration requests statistics
@router.get("/registration-statistics")
async def get_registration_statistics(
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Get statistics about registration requests"""
    pending_count = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'pending'
    ).count()
    
    approved_count = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'approved'
    ).count()
    
    rejected_count = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'rejected'
    ).count()
    
    # Get recent requests (last 7 days)
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    recent_requests = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.request_date >= seven_days_ago
    ).count()
    
    return {
        "statistics": {
            "pending_requests": pending_count,
            "approved_requests": approved_count,
            "rejected_requests": rejected_count,
            "total_requests": pending_count + approved_count + rejected_count,
            "recent_requests_7days": recent_requests
        },
        "generated_at": datetime.utcnow().isoformat()
    }

# Optional: Cleanup old rejected requests
@router.delete("/cleanup-rejected-requests")
async def cleanup_rejected_requests(
    days_old: int = 30,  # Delete rejected requests older than X days
    current_admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_auth_db)
):
    """Delete rejected requests older than specified days"""
    cutoff_date = datetime.utcnow() - timedelta(days=days_old)
    
    # First, get count of requests to be deleted
    requests_to_delete = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'rejected',
        UserRegistrationRequest.review_date < cutoff_date
    ).all()
    
    deleted_usernames = [req.user_name for req in requests_to_delete]
    deleted_count = len(requests_to_delete)
    
    # Delete the requests
    db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'rejected',
        UserRegistrationRequest.review_date < cutoff_date
    ).delete()
    
    db.commit()
    
    return {
        "message": f"Deleted {deleted_count} rejected requests older than {days_old} days",
        "deleted_count": deleted_count,
        "deleted_usernames": deleted_usernames,
        "performed_by": current_admin.user_name,
        "timestamp": datetime.utcnow().isoformat()
    }

# Update the existing statistics endpoint to include registration requests
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
    
    # Add registration request statistics
    pending_registrations = db.query(UserRegistrationRequest).filter(
        UserRegistrationRequest.status == 'pending'
    ).count()
    
    return {
        "statistics": {
            "total_users": total_users,
            "users_with_full_access": users_with_full_access,
            "users_pending_approval": users_pending_approval,
            "users_with_partial_access": total_users - users_with_full_access - users_pending_approval,
            "pending_registrations": pending_registrations  # NEW
        },
        "generated_at": datetime.utcnow().isoformat()
    }