from fastapi import APIRouter, HTTPException, Depends
from auth.dependencies import get_current_user, get_user_main_db
from auth.models import User
from auth.access_control import AccessControl
from sqlalchemy.orm import Session
from sqlalchemy import text

router = APIRouter(prefix="/mun-access", tags=["Municipal Access"])

# ==========================================================
# 🧭 MUNICIPAL SCHEMA ACCESS LIST
# ==========================================================
@router.get("/list-schemas")
def list_schemas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    """
    Returns the list of accessible municipal schemas for the logged-in user.
    Uses AccessControl to verify provincial/municipal permissions.
    """
    # Log user info
    print(f"👤 User: {current_user.user_name}")
    print(f"📍 Provincial Access: {current_user.provincial_access}")
    print(f"🏙️  Municipal Access: {current_user.municipal_access}")

    # Check if user has approved access
    access_info = AccessControl.check_user_access(current_user)
    if access_info["status"] == "pending_approval":
        raise HTTPException(status_code=403, detail=access_info["message"])

    try:
        # === Step 1: Get all schemas from DB ===
        result = db.execute(text("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN (
                'information_schema', 'pg_catalog', 'pg_toast', 'public',
                'credentials_login', 'auth', 'storage', 'vault',
                'graphql', 'graphql_public', 'realtime', 'extensions',
                'pgbouncer', 'postgres', 'credentials_users_schema'
            )
            AND schema_name NOT LIKE 'pg_%'
            AND schema_name NOT LIKE '%credential%'
            ORDER BY schema_name
        """))
        all_schemas = [row[0] for row in result]
        print(f"🗂️ All available schemas: {all_schemas}")

        # === Step 2: Filter by user's approved access ===
        allowed_schemas = AccessControl.filter_schemas_by_access(all_schemas, current_user)
        print(f"✅ Allowed schemas for {current_user.user_name}: {allowed_schemas}")

        # === Step 3: Describe user's access level ===
        access_description = AccessControl.get_access_description(current_user)

        return {
            "schemas": allowed_schemas,
            "total_accessible": len(allowed_schemas),
            "user_access": {
                "provincial": current_user.provincial_access,
                "municipal": current_user.municipal_access,
                "description": access_description,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Schema listing error: {e}")
        raise HTTPException(status_code=500, detail=f"Schema listing error: {e}")
