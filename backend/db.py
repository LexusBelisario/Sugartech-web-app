from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Dict, Optional
import os
from dotenv import load_dotenv
import socket

load_dotenv()

# Base for main DB models (your existing GIS models)
Base = declarative_base()

# Auth database connection (from .env)
AUTH_DB_URL = f"postgresql://{os.getenv('AUTH_DB_USER', 'postgres')}:{os.getenv('AUTH_DB_PASSWORD')}@{os.getenv('AUTH_DB_HOST', 'localhost')}:{os.getenv('AUTH_DB_PORT', '5432')}/{os.getenv('AUTH_DB_NAME', 'credentials_login')}"

auth_engine = create_engine(AUTH_DB_URL)
AuthSessionLocal = sessionmaker(bind=auth_engine)

# Cache for main database engines
_main_db_engines: Dict[int, any] = {}
_current_cred_number: Optional[int] = None

def get_auth_db():
    """Get session for auth database"""
    db = AuthSessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_main_engine(credentials):
    """Create engine for main database using credentials"""
    # Force IPv4 resolution
    resolved_host = socket.gethostbyname(credentials.host)
    
    db_url = f"postgresql://{credentials.user}:{credentials.password}@{resolved_host}:{credentials.port}/{credentials.dbname}"
    return create_engine(db_url, pool_pre_ping=True)

def get_main_engine(cred_number: int):
    """Get cached engine for specific credentials"""
    if cred_number not in _main_db_engines:
        # Need to fetch credentials and create engine
        from auth.models import Credentials
        auth_db = AuthSessionLocal()
        try:
            credentials = auth_db.query(Credentials).filter(
                Credentials.cred_number == cred_number
            ).first()
            if not credentials:
                raise Exception(f"No credentials found for cred_number: {cred_number}")
            
            _main_db_engines[cred_number] = create_main_engine(credentials)
        finally:
            auth_db.close()
    
    return _main_db_engines[cred_number]

def get_engine():
    """Get current main database engine (for backward compatibility)"""
    if _current_cred_number is None:
        raise Exception("❌ No DB engine found. Please login first.")
    return get_main_engine(_current_cred_number)

def set_current_cred_number(cred_number: int):
    """Set the current credential number (called after login)"""
    global _current_cred_number
    _current_cred_number = cred_number

def get_main_db_session(cred_number: int):
    """Get session for main database"""
    engine = get_main_engine(cred_number)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

# Keep for backward compatibility but will be deprecated
def get_connection():
    """Legacy connection method"""
    engine = get_engine()
    return engine.raw_connection()