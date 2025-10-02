from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from datetime import datetime, timedelta
import bcrypt
import jwt
import os
import re
from sqlalchemy.exc import IntegrityError

from db import get_auth_db, get_user_database_session
from auth.models import User, Admin, UserRegistrationRequest
from auth.access_control import AccessControl

router = APIRouter(prefix="/auth", tags=["authentication"])

# =======================
# Pydantic models
# =======================
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str
    first_name: str
    last_name: str
    email: str
    contact_number: str | None = None
    requested_provincial_access: str | None = None   # Province PSGC code (e.g., PH04034)
    requested_municipal_access: str | None = None 

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    message: str
    access_status: str
    access_message: str
    user_type: str

# =======================
# JWT settings
# =======================
SECRET_KEY = os.getenv("SECRET_KEY", "secret_ngani")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 1440))

# =======================
# Password helpers
# =======================
def validate_password(password: str) -> tuple[bool, str]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"
    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"
    if not re.search(r"\d", password):
        return False, "Password must contain at least one digit"
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
        return False, "Password must contain at least one special character"
    return True, ""

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(
            plain_password.encode("utf-8"),
            hashed_password.encode("utf-8"),
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
    # 🔹 Admin login
    admin = auth_db.query(Admin).filter(Admin.user_name == request.username).first()
    if admin:
        if not verify_password(request.password, admin.password):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

        token_data = {
            "user_id": admin.id,
            "username": admin.user_name,
            "email": admin.email,
            "user_type": "admin",
            "full_name": f"{admin.first_name} {admin.last_name}",
        }
        access_token = create_access_token(token_data)
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "message": "Admin login successful",
            "access_status": "approved",
            "access_message": "Full admin access granted",
            "user_type": "admin",
            "allowed_schemas": None   # 🚫 Admins don’t need schema access
        }

    # 🔹 User login
    user = auth_db.query(User).filter(User.user_name == request.username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not verify_password(request.password, user.password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect password")

    access_info = AccessControl.check_user_access(user)

    if access_info["status"] != "approved":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=access_info["message"],
        )

    token_data = {
        "user_id": user.id,
        "username": user.user_name,
        "user_type": "user",
        "provincial_access": user.provincial_access,
        "municipal_access": user.municipal_access,
        "access_status": access_info["status"],
    }
    access_token = create_access_token(token_data)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "message": "Login successful",
        "access_status": access_info["status"],
        "access_message": access_info["message"],
        "user_type": "user",
        "allowed_schemas": access_info.get("allowed_schemas", [])
    }

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(request: RegisterRequest, auth_db: Session = Depends(get_auth_db)):
    # ✅ Validate password
    is_valid, error_message = validate_password(request.password)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )

    # ✅ Hash password
    hashed_pw = hash_password(request.password)

    province_code = request.requested_provincial_access
    municipal_code = request.requested_municipal_access

    is_available = False

    # 🔎 Check if province DB exists (match prefix)
    if province_code:
        try:
            db_exists = auth_db.execute(
                text("SELECT datname FROM pg_database WHERE datname LIKE :dbname"),
                {"dbname": f"{province_code}%"}
            ).fetchone()

            if db_exists:
                # 🔎 Now check schema inside that DB (match prefix)
                prov_session = get_user_database_session(province_code)
                try:
                    schema_exists = prov_session.execute(
                        text("SELECT schema_name FROM information_schema.schemata WHERE schema_name LIKE :schema"),
                        {"schema": f"{municipal_code}%"}
                    ).fetchone()

                    if schema_exists:
                        is_available = True
                finally:
                    prov_session.close()
        except Exception as e:
            print(f"❌ DB/Schema check failed for {province_code}.{municipal_code}: {e}")
            is_available = False

    # ✅ Create new registration request
    try:
        new_request = UserRegistrationRequest(
            user_name=request.username,
            password=hashed_pw,
            first_name=request.first_name,
            last_name=request.last_name,
            email=request.email,
            contact_number=request.contact_number,
            requested_provincial_access=province_code,   # only store PSA code
            requested_municipal_access=municipal_code,   # only store PSA code
            requested_provincial_code=province_code,
            requested_municipal_code=municipal_code,
            status="pending",
            is_available=is_available
        )

        auth_db.add(new_request)
        auth_db.commit()
        auth_db.refresh(new_request)

        return {
            "message": "Registration request submitted successfully. Please wait for admin approval.",
            "request_id": new_request.id,
            "status": "pending",
            "username": new_request.user_name,
            "is_available": is_available
        }

    except IntegrityError as e:
        auth_db.rollback()
        if "user_registration_requests_user_name_key" in str(e.orig):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This username is already taken"
            )
        elif "user_registration_requests_email_key" in str(e.orig):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This email is already registered"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Duplicate entry detected"
            )

    except Exception as e:
        auth_db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit registration request: {str(e)}"
        )

@router.get("/registration-status/{username}")
async def check_registration_status(username: str, auth_db: Session = Depends(get_auth_db)):
    reg_request = (
        auth_db.query(UserRegistrationRequest)
        .filter(UserRegistrationRequest.user_name == username)
        .order_by(UserRegistrationRequest.request_date.desc())
        .first()
    )

    if not reg_request:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No registration request found for this username")

    return {
        "username": reg_request.user_name,
        "status": reg_request.status,
        "request_date": reg_request.request_date.isoformat() if reg_request.request_date else None,
        "review_date": reg_request.review_date.isoformat() if reg_request.review_date else None,
        "remarks": reg_request.remarks if reg_request.status != "pending" else None,
    }
