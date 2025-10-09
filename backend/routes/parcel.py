from fastapi import APIRouter, HTTPException, Query, Depends
from auth.dependencies import get_current_user, get_user_main_db
from auth.models import User
from auth.access_control import AccessControl
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

router = APIRouter(prefix="/parcel", tags=["Parcel Viewer"])

# ==========================================================
# 🗺️ 1. LOAD ALL PARCEL GEOMETRIES (Barangay Boundaries)
# ==========================================================
@router.get("/all-barangays")
def get_all_geom_tables(
    schemas: List[str] = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    """
    Loads all parcel geometries (per schema) with 'geom' and 'pin' columns.
    Returns a combined GeoJSON FeatureCollection.
    """
    access_info = AccessControl.check_user_access(current_user)
    if access_info["status"] == "pending_approval":
        raise HTTPException(status_code=403, detail=access_info["message"])

    # --- Validate schemas ---
    valid_schemas, invalid_schemas = [], []
    for schema in schemas:
        if AccessControl.validate_schema_access(schema, current_user):
            valid_schemas.append(schema)
        else:
            invalid_schemas.append(schema)

    if invalid_schemas:
        raise HTTPException(
            status_code=403,
            detail=f"Access denied to schemas: {', '.join(invalid_schemas)}"
        )

    if not valid_schemas:
        raise HTTPException(status_code=403, detail="No valid schemas to query")

    all_features = []

    # --- Load parcels from all allowed schemas ---
    for schema in valid_schemas:
        try:
            # Get all tables with both geom + pin columns
            result = db.execute(text("""
                SELECT table_name
                FROM information_schema.columns
                WHERE table_schema = :schema
                AND column_name IN ('geom', 'pin')
                AND table_name NOT ILIKE :pattern1
                AND table_name NOT ILIKE :pattern2
                GROUP BY table_name
                HAVING COUNT(DISTINCT column_name) = 2
            """), {
                "schema": schema,
                "pattern1": "%transaction_log%",
                "pattern2": "%JoinedTable%"
            })
            tables = [row[0] for row in result]
        except Exception as e:
            print(f"❌ Error listing tables in schema '{schema}': {e}")
            continue

        # --- For each table, fetch parcel geometries ---
        for table in tables:
            try:
                sql = text(f'''
                    SELECT t."pin", ST_AsGeoJSON(t.geom)::json AS geometry
                    FROM "{schema}"."{table}" t
                ''')
                result = db.execute(sql)
                rows = result.fetchall()

                for row in rows:
                    pin, geom = row
                    if not geom:
                        continue

                    all_features.append({
                        "type": "Feature",
                        "geometry": geom,
                        "properties": {
                            "pin": pin,
                            "source_schema": schema,
                            "source_table": table
                        }
                    })

            except Exception as e:
                print(f"⚠️ Query failed on {schema}.{table}: {e}")
                continue

    return {"type": "FeatureCollection", "features": all_features}


# ==========================================================
# 📋 2. GET SINGLE PARCEL INFO (Attribute Data)
# ==========================================================
@router.get("/info")
def get_parcel_info(
    pin: str,
    schema: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    """
    Fetch full attribute information of a parcel using its PIN from JoinedTable.
    """
    try:
        result = db.execute(text(f'''
            SELECT * FROM "{schema}"."JoinedTable"
            WHERE pin = :pin
            LIMIT 1
        '''), {"pin": pin})
        row = result.fetchone()

        if not row:
            return {"status": "error", "message": "Parcel not found."}

        data = dict(row._mapping) if hasattr(row, "_mapping") else dict(row)
        return {"status": "success", "data": data}

    except Exception as e:
        print(f"❌ Error fetching parcel info for {pin} in {schema}: {e}")
        return {"status": "error", "message": str(e)}
