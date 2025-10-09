from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from auth.dependencies import get_user_main_db

router = APIRouter()

# ==========================================================
# 🗺️ MUNICIPAL BOUNDS (from `bounds` column)
# ==========================================================
@router.get("/municipal-bounds")
def get_municipal_bounds(schema: str, db: Session = Depends(get_user_main_db)):
    """
    Fetch bounding box (xmin, ymin, xmax, ymax) from the 'bounds' column
    of PH_MunicipalMap inside the given schema.
    """
    mun_code = schema.split("_")[0] if "_" in schema else schema

    try:
        current_db = db.execute(text("SELECT current_database()")).scalar()
        print(f"📌 Connected to DB={current_db}, schema={schema}, mun_code={mun_code}")

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

        parts = [float(v.strip()) for v in row["bounds"].split(",")]
        if len(parts) != 4:
            raise HTTPException(status_code=500, detail="Invalid bounds format.")

        print(f"🗺️ Bounding box for {schema}: {parts}")
        return {"status": "success", "bounds": parts}

    except Exception as e:
        print(f"❌ Error fetching bounds for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==========================================================
# 🧭 MUNICIPAL BOUNDARIES (Barangay + Section)
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
