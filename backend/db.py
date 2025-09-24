from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.ext.declarative import declarative_base
from typing import Optional, Dict
import os
from dotenv import load_dotenv
import psycopg  # Add this import
from psycopg.rows import dict_row  # Add this import

load_dotenv()

# Base for main DB models
Base = declarative_base()

# Supabase connection details
DB_HOST = 'aws-1-ap-southeast-1.pooler.supabase.com'
DB_PORT = '6543'
DB_USER = 'postgres.ljmlswhybxcmwzdzuxhl'
DB_PASSWORD = '#IGDIwebapp'

# Auth database connection - pointing to credentials_login database
AUTH_DB_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/credentials_login"

auth_engine = create_engine(AUTH_DB_URL)
AuthSessionLocal = sessionmaker(bind=auth_engine)

# Cache for database engines
_db_engines: Dict[str, any] = {}

def get_auth_db():
    """Get session for auth database (credentials_login)"""
    db = AuthSessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_database_engine(database_name: str):
    """Get or create engine for a specific database"""
    if not database_name:
        raise ValueError("No database name provided")
    
    # Create engine if not cached
    if database_name not in _db_engines:
        db_url = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{database_name}"
        _db_engines[database_name] = create_engine(db_url, pool_pre_ping=True)
        print(f"✅ Created engine for database: {database_name}")
    
    return _db_engines[database_name]

def get_user_database_session(provincial_access: str) -> Session:
    """Get database session based on user's provincial access"""
    if not provincial_access:
        raise ValueError("User has no provincial access assigned")
    
    # Use provincial_access as database name directly
    # e.g., "Laguna" -> connects to Laguna database
    # e.g., "Paranaque" -> connects to Paranaque database
    database_name = provincial_access.strip()
    
    engine = get_database_engine(database_name)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

# Legacy functions (kept for backward compatibility but should be phased out)
def get_main_db_connection():
    """
    Legacy function - returns postgres database connection
    Should be replaced with get_user_database_session
    """
    engine = get_database_engine('postgres')
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_main_engine():
    """Legacy function - returns postgres engine"""
    return get_database_engine('postgres')

def get_engine():
    """Legacy function - returns postgres engine"""
    return get_database_engine('postgres')

def get_connection(database_name: str = 'postgres'):
    """
    Legacy connection method - returns psycopg connection with dict_row factory
    This ensures compatibility with consolidate.py
    """
    # Return a proper psycopg connection with dictionary rows
    return psycopg.connect(
        dbname=database_name,
        user=DB_USER,
        password=DB_PASSWORD,
        host=DB_HOST,
        port=DB_PORT,
        row_factory=dict_row  # This is crucial - returns dictionaries instead of tuples
    )

# Test auth database connection on startup
try:
    with auth_engine.connect() as conn:
        result = conn.execute(text("SELECT current_database()"))
        current_db = result.scalar()
        print(f"✅ Auth database connection successful to: {current_db}")
        
        # Verify tables exist
        result = conn.execute(text("""
            SELECT table_schema, table_name 
            FROM information_schema.tables 
            WHERE table_name IN ('users_table', 'admin_login', 'credentials')
            AND table_schema = 'credentials_users_schema'
            ORDER BY table_name;
        """))
        tables = result.fetchall()
        if tables:
            print("✅ Found authentication tables:")
            for schema, table in tables:
                print(f"  - {schema}.{table}")
        else:
            print("⚠️ Warning: Authentication tables not found in credentials_users_schema")
            
except Exception as e:
    print(f"⚠️ Failed to connect to auth database: {e}")