from fastapi import APIRouter, HTTPException, Depends
from auth.dependencies import get_current_user, get_user_main_db
from auth.models import User
from sqlalchemy.orm import Session
from sqlalchemy import text

router = APIRouter(prefix="/table-viewer", tags=["Table Viewer"])

# ==========================================================
# 🧭  LOAD FEATURES FROM A SINGLE TABLE (Landmarks, Roads, etc.)
# ==========================================================
@router.get("/single-table")
def get_single_table(
    schema: str,
    table: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    """
    Loads any geometry-based table (e.g., Roads, Landmarks, Parcels).
    Returns all rows as a GeoJSON FeatureCollection.
    """
    try:
        # === Step 1: Get all non-geometry columns ===
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = :table
              AND column_name != 'geom'
        """), {"schema": schema, "table": table})

        columns = [row[0] for row in result]

        if not columns:
            print(f"⚠️ No non-geometry columns found in {schema}.{table}")
            return {"type": "FeatureCollection", "features": []}

        # === Step 2: Build SQL query dynamically ===
        col_sql = ", ".join(f't."{col}"' for col in columns)
        sql = text(f'''
            SELECT {col_sql}, ST_AsGeoJSON(t.geom)::json AS geometry
            FROM "{schema}"."{table}" t
        ''')

        result = db.execute(sql)
        rows = result.fetchall()

        # === Step 3: Convert results to GeoJSON FeatureCollection ===
        features = []
        for row in rows:
            # Map each non-geometry column
            row_dict = {col: row[i] for i, col in enumerate(columns)}
            geometry = row[-1]  # Last column = geometry

            if not geometry:
                continue

            row_dict["source_table"] = table
            row_dict["source_schema"] = schema

            features.append({
                "type": "Feature",
                "geometry": geometry,
                "properties": row_dict
            })

        print(f"✅ Loaded {len(features)} features from {schema}.{table}")

        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        print(f"❌ Error loading table {schema}.{table}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
