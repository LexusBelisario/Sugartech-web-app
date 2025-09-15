from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

# Connect to database
DB_URL = f"postgresql://{os.getenv('AUTH_DB_USER')}:{os.getenv('AUTH_DB_PASSWORD')}@{os.getenv('AUTH_DB_HOST')}:{os.getenv('AUTH_DB_PORT')}/postgres"
engine = create_engine(DB_URL)
Session = sessionmaker(bind=engine)
session = Session()

print("🔍 Checking schemas in database...\n")

try:
    # List all schemas
    result = session.execute(text("""
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
        AND schema_name NOT LIKE 'pg_%'
        ORDER BY schema_name
    """))
    
    schemas = [row[0] for row in result]
    print(f"Found {len(schemas)} schemas:")
    for schema in schemas:
        print(f"  - {schema}")
    
    # Check specifically for Pagsanjan
    print("\n🔍 Checking for Pagsanjan schemas:")
    result = session.execute(text("""
        SELECT schema_name 
        FROM information_schema.schemata 
        WHERE schema_name LIKE '%agsanjan%'
    """))
    
    pagsanjan_schemas = [row[0] for row in result]
    if pagsanjan_schemas:
        print(f"Found Pagsanjan schemas: {pagsanjan_schemas}")
        
        # Check tables in each
        for schema in pagsanjan_schemas:
            result = session.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = :schema
                LIMIT 5
            """), {"schema": schema})
            
            tables = [row[0] for row in result]
            print(f"\n  Tables in '{schema}':")
            for table in tables:
                print(f"    - {table}")
    else:
        print("No Pagsanjan schemas found!")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    session.close()