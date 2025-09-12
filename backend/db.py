from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional
import os
from dotenv import load_dotenv
import socket

load_dotenv()

# Base for main DB models (your existing GIS models)
Base = declarative_base()

# Get connection details from environment
DB_HOST = os.getenv('AUTH_DB_HOST', 'localhost')
DB_PORT = os.getenv('AUTH_DB_PORT', '5432')
DB_USER = os.getenv('AUTH_DB_USER', 'postgres')
DB_PASSWORD = os.getenv('AUTH_DB_PASSWORD')

# Auth database connection
AUTH_DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{os.getenv('AUTH_DB_NAME', 'credentials_login')}"

auth_engine = create_engine(AUTH_DB_URL)
AuthSessionLocal = sessionmaker(bind=auth_engine)

# Main database connection (same server, different database name)
# For Supabase, the main database is usually named "postgres"
MAIN_DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/postgres"

main_engine = create_engine(MAIN_DB_URL, pool_pre_ping=True)
MainSessionLocal = sessionmaker(bind=main_engine)

def get_auth_db():
    """Get session for auth database"""
    db = AuthSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_main_db_connection():
    """Get session for main database"""
    db = MainSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_main_engine():
    """Get the main database engine"""
    return main_engine

def get_engine():
    """Get main database engine (for backward compatibility)"""
    return main_engine

def get_connection():
    """Legacy connection method (for backward compatibility)"""
    return main_engine.raw_connection()

# Test connection on startup
try:
    with main_engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("✅ Main database connection successful")
except Exception as e:
    print(f"⚠️ Failed to connect to main database: {e}")