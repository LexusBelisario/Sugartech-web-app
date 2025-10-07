from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import text
from auth.dependencies import get_user_main_db
from auth.models import User
from auth.access_control import AccessControl

router = APIRouter()


# ==========================================================
# 🧭 MUNICIPAL BOUNDS (Replaces old centroid)
# ==========================================================
@router.get("/municipal-centroid")
def get_municipal_bounds(schema: str, db: Session = Depends(get_user_main_db)):
    """
    Fetch bounding box (xmin, ymin, xmax, ymax) from the 'bounds' column
    of PH_MunicipalMap inside the given schema.
    Schema is validated against user access.
    """
    mun_code = schema.split("_")[0] if "_" in schema else schema

    try:
        current_db = db.execute(text("SELECT current_database()")).scalar()
        print(f"📌 Connected to DB={current_db}, schema={schema}, mun_code={mun_code}")

        # --- Fetch the 'bounds' string from the PH_MunicipalMap table ---
        query = text(f"""
            SELECT bounds
            FROM "{schema}"."PH_MunicipalMap"
            WHERE mun_code = :mun_code
            LIMIT 1
        """)
        row = db.execute(query, {"mun_code": mun_code}).mappings().first()

        if not row or not row["bounds"]:
            raise HTTPException(
                status_code=404,
                detail=f"No bounds found for schema={schema}, mun_code={mun_code}"
            )

        # --- Parse "xmin, ymin, xmax, ymax" string into list of floats ---
        try:
            parts = [float(v.strip()) for v in row["bounds"].split(",")]
            if len(parts) != 4:
                raise ValueError("Invalid bounds format.")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Invalid bounds format: {e}")

        print(f"🗺️ Bounding box for {schema}: {parts}")
        return {"status": "success", "bounds": parts}

    except Exception as e:
        print(f"❌ Error fetching bounds for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ==========================================================
# 🗺️ MUNICIPAL BOUNDARIES (Barangay + Section)
# ==========================================================
@router.get("/municipal-boundaries")
def get_municipal_boundaries(schema: str, db: Session = Depends(get_user_main_db)):
    """
    Fetch Barangay and Section boundaries (GeoJSON) directly from the schema.
    Returns both in a single response.
    """
    try:
        current_db = db.execute(text("SELECT current_database()")).scalar()
        print(f"📌 Connected to DB={current_db}, schema={schema} (GET municipal-boundaries)")

        results = {"barangay": None, "section": None}

        # --- Barangay Boundary ---
        try:
            query_barangay = text(f'''
                SELECT *, ST_AsGeoJSON(geom)::json AS geometry
                FROM "{schema}"."BarangayBoundary"
            ''')
            barangay_rows = db.execute(query_barangay).mappings().all()

            results["barangay"] = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": row["geometry"],
                        "properties": {k: v for k, v in row.items() if k not in ("geom", "geometry")}
                    }
                    for row in barangay_rows
                ]
            }
            print(f"✅ Loaded {len(barangay_rows)} barangay features.")
        except Exception as e:
            print(f"⚠️ BarangayBoundary fetch failed for {schema}: {e}")

        # --- Section Boundary ---
        try:
            query_section = text(f'''
                SELECT *, ST_AsGeoJSON(geom)::json AS geometry
                FROM "{schema}"."SectionBoundary"
            ''')
            section_rows = db.execute(query_section).mappings().all()

            results["section"] = {
                "type": "FeatureCollection",
                "features": [
                    {
                        "type": "Feature",
                        "geometry": row["geometry"],
                        "properties": {k: v for k, v in row.items() if k not in ("geom", "geometry")}
                    }
                    for row in section_rows
                ]
            }
            print(f"✅ Loaded {len(section_rows)} section features.")
        except Exception as e:
            print(f"⚠️ SectionBoundary fetch failed for {schema}: {e}")

        if not results["barangay"] and not results["section"]:
            raise HTTPException(
                status_code=404,
                detail=f"No BarangayBoundary or SectionBoundary found for schema={schema}"
            )

        return {"status": "success", **results}

    except Exception as e:
        print(f"❌ Error fetching municipal boundaries for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ==========================================================
# 🛰️ ORTHOPHOTO CONFIGURATION (Unchanged)
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

        # Check if a record exists
        check_query = text(f'SELECT COUNT(*) AS cnt FROM "{schema}"."Ortophotos"')
        count = db.execute(check_query).scalar()

        if count == 0:
            # Insert new record
            insert_query = text(f'''
                INSERT INTO "{schema}"."Ortophotos" (gsrvr_url, layer_name)
                VALUES (:url, :layer)
            ''')
            db.execute(insert_query, {"url": url, "layer": layer})
            action = "inserted"
        else:
            # Update existing record
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
