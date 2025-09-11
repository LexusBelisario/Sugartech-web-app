from fastapi import APIRouter, HTTPException, Query, Depends
from auth.dependencies import get_current_user, get_user_main_db
from auth.models import User
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List

router = APIRouter()

# === Endpoint: Load all parcel/road features from selected schemas ===
@router.get("/all-barangays")
def get_all_geom_tables(
    schemas: List[str] = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)  # This gives you the database session
):
    all_features = []

    for schema in schemas:
        try:
            # Use db.execute instead of conn.cursor()
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
                "pattern1": '%transaction_log%',
                "pattern2": '%JoinedTable%'
            })
            tables = [row[0] for row in result]
        except Exception as e:
            print(f"❌ Error listing tables in schema '{schema}': {e}")
            continue

        for table in tables:
            try:
                # Get columns
                result = db.execute(text("""
                    SELECT column_name
                    FROM information_schema.columns
                    WHERE table_schema = :schema AND table_name = :table AND column_name != 'geom'
                """), {"schema": schema, "table": table})
                columns = [row[0] for row in result]
            except Exception as e:
                print(f"❌ Failed to read columns from {schema}.{table}: {e}")
                continue

            if not columns:
                continue

            # Build and execute query
            sql = text(f'''
                SELECT t."pin", ST_AsGeoJSON(t.geom)::json AS geometry
                FROM "{schema}"."{table}" t
            ''')

            try:
                result = db.execute(sql)
                rows = result.fetchall()

                for row in rows:
                    # Convert row to dict
                    row_dict = {
                        "pin": row[0],
                        "geometry": row[1],
                        "source_schema": schema,
                        "source_table": table
                    }
                    
                    geom = row_dict.pop("geometry", None)
                    if not geom:
                        continue

                    all_features.append({
                        "type": "Feature",
                        "geometry": geom,
                        "properties": row_dict
                    })

            except Exception as e:
                print(f"⚠️ Query failed on {schema}.{table}: {e}")
                continue

    return {
        "type": "FeatureCollection",
        "features": all_features
    }


@router.get("/parcel-info")
def get_parcel_info(
    pin: str, 
    schema: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    try:
        result = db.execute(text(f'''
            SELECT * FROM "{schema}"."JoinedTable"
            WHERE pin = :pin
            LIMIT 1
        '''), {"pin": pin})
        
        row = result.fetchone()

        if not row:
            return {"status": "error", "message": "Parcel not found."}

        # Convert row to dictionary
        data = dict(row._mapping) if hasattr(row, '_mapping') else dict(row)
        return {"status": "success", "data": data}

    except Exception as e:
        return {"status": "error", "message": str(e)}


# === Endpoint: List all non-system schemas (e.g., municipalities) ===
@router.get("/list-schemas")
def list_schemas(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    try:
        result = db.execute(text("""
            SELECT schema_name
            FROM information_schema.schemata
            WHERE schema_name NOT IN (
                'information_schema', 'pg_catalog', 'pg_toast', 'public',
                'credentials_login', 'auth', 'storage', 'vault',
                'graphql', 'graphql_public', 'realtime', 'extensions',
                'pgbouncer', 'postgres'
            )
            AND schema_name NOT LIKE 'pg_%'
            AND schema_name NOT LIKE '%credential%'
            ORDER BY schema_name
        """))
        
        schemas = [row[0] for row in result]
        return {"schemas": schemas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Schema listing error: {e}")


# === Endpoint: Load features from a single table (Landmarks, Roads, Parcels, etc.) ===
@router.get("/single-table")
def get_single_table(
    schema: str, 
    table: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_user_main_db)
):
    try:
        # Get columns
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema AND table_name = :table AND column_name != 'geom'
        """), {"schema": schema, "table": table})
        
        columns = [row[0] for row in result]

        if not columns:
            return {"type": "FeatureCollection", "features": []}

        # Build query
        col_sql = ", ".join(f't."{col}"' for col in columns)
        sql = text(f'''
            SELECT {col_sql}, ST_AsGeoJSON(t.geom)::json AS geometry
            FROM "{schema}"."{table}" t
        ''')

        result = db.execute(sql)
        rows = result.fetchall()

        features = []
        for row in rows:
            # Convert row to dict
            row_dict = {}
            for i, col in enumerate(columns):
                row_dict[col] = row[i]
            
            geometry = row[-1]  # Last column is geometry
            
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
        raise HTTPException(status_code=500, detail=str(e))