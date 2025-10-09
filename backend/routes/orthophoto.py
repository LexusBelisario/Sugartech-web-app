from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session
from auth.dependencies import get_user_main_db

router = APIRouter()

# ==========================================================
# 🛰️ ORTHOPHOTO CONFIGURATION (Get & Save)
# ==========================================================

@router.get("/orthophoto-config")
def get_orthophoto_config(schema: str, db: Session = Depends(get_user_main_db)):
    """
    Retrieve the stored GeoServer WMTS URL and Layer Name for orthophotos
    within the selected schema's Ortophotos table.
    """
    try:
        current_db = db.execute(text("SELECT current_database()")).scalar()
        print(f"📌 Connected to DB={current_db}, schema={schema} (GET orthophoto-config)")

        query = text(f"""
            SELECT gsrvr_url, layer_name
            FROM "{schema}"."Ortophotos"
            ORDER BY id DESC
            LIMIT 1
        """)
        row = db.execute(query).mappings().first()

        if not row:
            print(f"ℹ️ No orthophoto config found for schema={schema}")
            return {
                "status": "empty",
                "message": f"No orthophoto configuration found for schema {schema}."
            }

        print(f"✅ Orthophoto config loaded for {schema}: {row}")
        return {
            "status": "success",
            "Gsrvr_URL": row["gsrvr_url"],
            "Layer_Name": row["layer_name"]
        }

    except Exception as e:
        print(f"❌ Error retrieving orthophoto config for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/orthophoto-config")
async def save_orthophoto_config(request: Request, db: Session = Depends(get_user_main_db)):
    """
    Save or update the orthophoto configuration (GeoServer URL + Layer Name)
    for a given schema. If an entry exists, it overwrites it.
    """
    data = await request.json()
    schema = data.get("schema")
    url = data.get("Gsrvr_URL")
    layer = data.get("Layer_Name")

    if not schema or not url or not layer:
        raise HTTPException(
            status_code=400,
            detail="Missing required fields: schema, Gsrvr_URL, or Layer_Name."
        )

    try:
        current_db = db.execute(text("SELECT current_database()")).scalar()
        print(f"📌 Connected to DB={current_db}, schema={schema} (POST orthophoto-config)")

        check_query = text(f'SELECT COUNT(*) AS cnt FROM "{schema}"."Ortophotos"')
        count = db.execute(check_query).scalar()

        if count == 0:
            insert_query = text(f'''
                INSERT INTO "{schema}"."Ortophotos" (gsrvr_url, layer_name)
                VALUES (:url, :layer)
            ''')
            db.execute(insert_query, {"url": url, "layer": layer})
            action = "inserted"
        else:
            update_query = text(f'''
                UPDATE "{schema}"."Ortophotos"
                SET gsrvr_url = :url, layer_name = :layer
                WHERE id = (
                    SELECT id FROM "{schema}"."Ortophotos"
                    ORDER BY id DESC
                    LIMIT 1
                )
            ''')
            db.execute(update_query, {"url": url, "layer": layer})
            action = "updated"

        db.commit()
        print(f"✅ Orthophoto config {action} for {schema}: URL={url}, Layer={layer}")

        return {
            "status": "success",
            "message": f"Orthophoto configuration {action} successfully.",
            "Gsrvr_URL": url,
            "Layer_Name": layer
        }

    except Exception as e:
        print(f"❌ Error saving orthophoto config for {schema}: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
