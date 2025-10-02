from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from auth.dependencies import get_user_main_db
from auth.models import User
from auth.access_control import AccessControl

router = APIRouter()

@router.get("/municipal-centroid")
def get_municipal_centroid(schema: str, db: Session = Depends(get_user_main_db)):
    """
    Fetch centroid (x, y) from ph_municipalmap inside the given schema.
    Schema is validated against user access.
    """
    # Parse mun_code from schema
    mun_code = schema.split("_")[0] if "_" in schema else schema

    try:
        # Debug: print connected DB
        current_db = db.execute(text("SELECT current_database()")).scalar()
        print(f"📌 Connected to DB={current_db}, schema={schema}, mun_code={mun_code}")

        query = text(f"""
            SELECT x, y
            FROM "{schema}"."ph_municipalmap"
            WHERE mun_code = :mun_code
            LIMIT 1
        """)
        row = db.execute(query, {"mun_code": mun_code}).mappings().first()

        if not row:
            raise HTTPException(status_code=404, detail=f"No centroid found for schema={schema}, mun_code={mun_code}")

        return {"status": "success", "x": row["x"], "y": row["y"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
