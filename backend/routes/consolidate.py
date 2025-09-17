from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from datetime import datetime
import json
from psycopg2.extras import RealDictCursor

from auth.dependencies import get_user_main_db, get_current_user
from auth.models import User

router = APIRouter()

@router.post("/merge-parcels-postgis")
async def merge_parcels_postgis(
    request: Request,
    db: Session = Depends(get_user_main_db),
    current_user: User = Depends(get_current_user)
):
    data = await request.json()

    schema = data.get("schema")
    table = data.get("table")
    base_props = data.get("base_props")
    original_pins = data.get("original_pins")
    geometries = data.get("geometries")

    if not schema or not table or not base_props or not original_pins or not geometries:
        return {"status": "error", "message": "Missing required data."}

    full_table = f'"{schema}"."{table}"'
    log_table = f'"{schema}"."parcel_transaction_log"'
    attr_table = f'"{schema}"."JoinedTable"'

    try:
        # Get raw psycopg2 connection from SQLAlchemy session
        conn = db.connection().connection
        
        # Create cursor with RealDictCursor for dictionary results
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # STEP 1: Detect actual column names in table
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
            """, (schema, table))
            all_columns = [r["column_name"] for r in cur.fetchall()]
            allowed_columns = set(all_columns) - {"geom"}

            # STEP 2: Merge geometries
            geojson_strings = [json.dumps(g) for g in geometries]
            union_args = ', '.join(['ST_GeomFromGeoJSON(%s)'] * len(geojson_strings))
            cur.execute(f'''
                SELECT ST_AsGeoJSON(ST_Union(ARRAY[{union_args}])) AS merged;
            ''', geojson_strings)
            merged_result = cur.fetchone()
            merged_geom = merged_result["merged"]
            if not merged_geom:
                return {"status": "error", "message": "Geometry union failed."}

            # STEP 3: Generate new PIN
            prefix = original_pins[0].rsplit("-", 1)[0]
            if "barangay" in base_props and "barangay" in allowed_columns:
                cur.execute(f'''
                    SELECT pin FROM {full_table}
                    WHERE barangay = %s AND pin ~ %s
                ''', (base_props["barangay"], r'.*\d{3}$'))
            else:
                cur.execute(f'''
                    SELECT pin FROM {full_table}
                    WHERE pin ~ %s
                ''', (r'.*\d{3}$',))

            existing_pins = [row["pin"] for row in cur.fetchall()]
            suffixes = [int(p[-3:]) for p in existing_pins if p and p[-3:].isdigit()]
            next_suffix = max(suffixes or [0]) + 1
            new_pin = f"{prefix}-{str(next_suffix).zfill(3)}"

            # STEP 4: Insert new parcel
            base_props["pin"] = new_pin
            base_props["parcel"] = ""
            base_props["section"] = ""
            base_props.pop("id", None)  # prevent inserting into SERIAL id

            clean_props = {k: v for k, v in base_props.items() if k in allowed_columns}
            columns = ', '.join(f'"{col}"' for col in clean_props)
            placeholders = ', '.join(['%s'] * len(clean_props))
            values = list(clean_props.values())

            cur.execute(f'''
                INSERT INTO {full_table} ({columns}, geom)
                VALUES ({placeholders}, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            ''', values + [merged_geom])
            
            # Insert new parcel into JoinedTable with only pin (no inherited attributes)
            cur.execute(f'''
                INSERT INTO {attr_table} ("pin")
                VALUES (%s)
            ''', (new_pin,))

            # STEP 5: Log the new parcel
            new_transaction_date = datetime.now()
            new_log_fields = ['"table_name"', '"transaction_type"', '"transaction_date"'] + \
                             [f'"{col}"' for col in clean_props] + ['"geom"']
            new_log_placeholders = ['%s'] * (3 + len(clean_props)) + ['ST_GeomFromGeoJSON(%s)']
            new_log_values = [table, "new (consolidate)", new_transaction_date] + \
                             list(clean_props.values()) + [merged_geom]

            cur.execute(f'''
                INSERT INTO {log_table} ({', '.join(new_log_fields)})
                VALUES ({', '.join(new_log_placeholders)})
            ''', new_log_values)

            # STEP 6: Log old parcels with full data
            for pin in original_pins:
                # 6.1 Get from parcel table
                cur.execute(f'''
                    SELECT *, ST_AsGeoJSON(geom)::json AS geometry
                    FROM {full_table}
                    WHERE pin = %s
                ''', (pin,))
                parcel_row = cur.fetchone()
                if not parcel_row:
                    continue

                # 6.2 Get from JoinedTable
                cur.execute(f'''
                    SELECT * FROM {attr_table}
                    WHERE pin = %s
                ''', (pin,))
                attr_row = cur.fetchone() or {}

                # 6.3 Merge both dictionaries
                merged_data = {**parcel_row, **attr_row}
                geom = merged_data.pop("geometry", None)
                merged_data.pop("geom", None)
                merged_data.pop("table_name", None)
                merged_data.pop("id", None)  # prevent conflict with primary key

                # 6.4 Log it
                transaction_date = datetime.now()
                final_fields = list(merged_data.keys())
                log_fields = ['"table_name"', '"transaction_type"', '"transaction_date"'] + \
                             [f'"{f}"' for f in final_fields] + ['"geom"']
                log_placeholders = ['%s'] * (3 + len(final_fields)) + ['ST_GeomFromGeoJSON(%s)']
                log_values = [table, "consolidated", transaction_date] + \
                             list(merged_data.values()) + [json.dumps(geom)]

                cur.execute(f'''
                    INSERT INTO {log_table} ({', '.join(log_fields)})
                    VALUES ({', '.join(log_placeholders)})
                ''', log_values)

                # Delete old parcel
                cur.execute(f'DELETE FROM {full_table} WHERE pin = %s', (pin,))
                cur.execute(f'DELETE FROM {attr_table} WHERE pin = %s', (pin,))

            conn.commit()
            print(f"✅ Consolidation successful for user {current_user.user_name}: New PIN {new_pin}")
            return {"status": "success", "new_pin": new_pin}

    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print(f"❌ Consolidation error for user {current_user.user_name}: {str(e)}")
        return {"status": "error", "message": str(e)}