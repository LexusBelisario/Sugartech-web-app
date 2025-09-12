# fix_passwords.py
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import bcrypt
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to auth database
DB_URL = f"postgresql://{os.getenv('AUTH_DB_USER')}:{os.getenv('AUTH_DB_PASSWORD')}@{os.getenv('AUTH_DB_HOST')}:{os.getenv('AUTH_DB_PORT')}/{os.getenv('AUTH_DB_NAME')}"
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # Get all users
    result = session.execute(text("SELECT id, user_name, password FROM credentials_users_schema.users_table"))
    users = result.fetchall()

    for user in users:
        user_id, username, password = user
        
        # Check if password is already hashed (bcrypt hashes start with $2b$)
        if not password.startswith('$2b$'):
            print(f"Hashing password for user: {username}")
            salt = bcrypt.gensalt()
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
            
            session.execute(
                text("UPDATE credentials_users_schema.users_table SET password = :password WHERE id = :id"),
                {"password": hashed, "id": user_id}
            )
            session.commit()
            print(f"  ✓ Password hashed for {username}")
        else:
            print(f"  → Password already hashed for {username}")

    print("\n✅ Done fixing passwords!")
    
except Exception as e:
    print(f"Error: {e}")
    session.rollback()
    
finally:
    session.close()