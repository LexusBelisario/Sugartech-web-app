from fastapi import APIRouter, HTTPException, Query, Depends
from auth.dependencies import get_current_user, get_user_main_db
from auth.models import User
from auth.access_control import AccessControl
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

router = APIRouter()

# ==========================================================
# 🗺️ Load all parcel/road features from selected schemas
# ==========================================================
@router.get("/all-barangays")
def get_all_geom_tables(
    schemas: List[str] = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    """
    Loads all parcel-like tables (with geom + pin) from the given schemas,
    excluding system and analysis tables such as transaction logs, JoinedTable,
    CAMA-Table, and RunSavedModel results.
    """

    # ✅ Verify user access
    access_info = AccessControl.check_user_access(current_user)
    if access_info["status"] == "pending_approval":
        raise HTTPException(status_code=403, detail=access_info["message"])

    # ✅ Validate which schemas user can access
    invalid_schemas = []
    valid_schemas = []
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

    # ✅ Query tables within each valid schema
    for schema in valid_schemas:
        try:
            # -- Find all tables with both geom + pin columns,
            #    excluding unwanted system/analysis tables --
            result = db.execute(
                text("""
                    SELECT table_name
                    FROM information_schema.columns
                    WHERE table_schema = :schema
                      AND column_name IN ('geom', 'pin')
                      AND table_name NOT ILIKE :pattern1
                      AND table_name NOT ILIKE :pattern2
                      AND table_name NOT ILIKE :pattern3
                      AND table_name NOT ILIKE :pattern4
                      AND table_name NOT ILIKE :pattern5
                    GROUP BY table_name
                    HAVING COUNT(DISTINCT column_name) = 2
                """),
                {
                    "schema": schema,
                    "pattern1": "%transaction_log%",
                    "pattern2": "%JoinedTable%",
                    "pattern3": "%CAMA-Table%",
                    "pattern4": "%RunSavedModel1%",
                    "pattern5": "%RunSavedModel2%"
                }
            )
            tables = [row[0] for row in result]
        except Exception as e:
            print(f"❌ Error listing tables in schema '{schema}': {e}")
            continue

        # ✅ Build and execute queries per table
        for table in tables:
            try:
                # Retrieve all columns except geom
                result = db.execute(
                    text("""
                        SELECT column_name
                        FROM information_schema.columns
                        WHERE table_schema = :schema
                          AND table_name = :table
                          AND column_name != 'geom'
                    """),
                    {"schema": schema, "table": table}
                )
                columns = [row[0] for row in result]
            except Exception as e:
                print(f"❌ Failed to read columns from {schema}.{table}: {e}")
                continue

            if not columns:
                continue

            # Build query for features (pin + geometry only)
            sql = text(f'''
                SELECT t."pin", ST_AsGeoJSON(t.geom)::json AS geometry
                FROM "{schema}"."{table}" t
            ''')

            try:
                result = db.execute(sql)
                rows = result.fetchall()

                for row in rows:
                    geom = row[1]
                    if not geom:
                        continue

                    all_features.append({
                        "type": "Feature",
                        "geometry": geom,
                        "properties": {
                            "pin": row[0],
                            "source_schema": schema,
                            "source_table": table
                        }
                    })

            except Exception as e:
                print(f"⚠️ Query failed on {schema}.{table}: {e}")
                continue

    return {
        "type": "FeatureCollection",
        "features": all_features
    }


# ==========================================================
# 📦 Load features from a single table (Landmarks, Roads, Parcels, etc.)
# ==========================================================
@router.get("/single-table")
def get_single_table(
    schema: str,
    table: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    """
    Loads all features from a single specified table (e.g., Landmarks, Roads, Parcels).
    """
    try:
        # ✅ Get all non-geometry columns
        result = db.execute(
            text("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = :schema
                  AND table_name = :table
                  AND column_name != 'geom'
            """),
            {"schema": schema, "table": table}
        )
        columns = [row[0] for row in result]

        if not columns:
            return {"type": "FeatureCollection", "features": []}

        # ✅ Build query to fetch all data + geometry
        col_sql = ", ".join(f't."{col}"' for col in columns)
        sql = text(f'''
            SELECT {col_sql}, ST_AsGeoJSON(t.geom)::json AS geometry
            FROM "{schema}"."{table}" t
        ''')

        result = db.execute(sql)
        rows = result.fetchall()

        features = []
        for row in rows:
            row_dict = {columns[i]: row[i] for i in range(len(columns))}
            geometry = row[-1]
            if not geometry:
                continue

            row_dict["source_table"] = table
            row_dict["source_schema"] = schema

            features.append({
                "type": "Feature",
                "geometry": geometry,
                "properties": row_dict
            })

        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        print(f"❌ Error loading single table {schema}.{table}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
