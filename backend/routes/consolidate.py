from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.orm import Session
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
        conn = db.connection().connection

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # STEP 1: Detect existing columns
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
            """, (schema, table))
            parcel_columns = [r["column_name"] for r in cur.fetchall()]
            allowed_columns = set(parcel_columns) - {"geom"}

            # STEP 1.1: Detect columns in parcel_transaction_log
            cur.execute("""
                SELECT column_name FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
            """, (schema, "parcel_transaction_log"))
            log_columns = [r["column_name"] for r in cur.fetchall()]

            # STEP 2: Merge geometries
            geojson_strings = [json.dumps(g) for g in geometries]
            union_args = ', '.join(['ST_GeomFromGeoJSON(%s)'] * len(geojson_strings))
            cur.execute(f"""
                SELECT ST_AsGeoJSON(ST_Union(ARRAY[{union_args}])) AS merged;
            """, geojson_strings)
            merged_result = cur.fetchone()
            merged_geom = merged_result["merged"]
            if not merged_geom:
                return {"status": "error", "message": "Geometry union failed."}

            # STEP 3: Generate new PIN
            prefix = original_pins[0].rsplit("-", 1)[0]
            if "barangay" in base_props and "barangay" in allowed_columns:
                cur.execute(f"""
                    SELECT pin FROM {full_table}
                    WHERE barangay = %s AND pin ~ %s
                """, (base_props["barangay"], r'.*\d{3}$'))
            else:
                cur.execute(f"""
                    SELECT pin FROM {full_table}
                    WHERE pin ~ %s
                """, (r'.*\d{3}$',))

            existing_pins = [row["pin"] for row in cur.fetchall()]
            suffixes = [int(p[-3:]) for p in existing_pins if p and p[-3:].isdigit()]
            next_suffix = max(suffixes or [0]) + 1
            new_pin = f"{prefix}-{str(next_suffix).zfill(3)}"

            # STEP 4: Insert new parcel
            base_props["pin"] = new_pin
            base_props["parcel"] = ""
            base_props["section"] = ""
            base_props.pop("id", None)

            clean_props = {k: v for k, v in base_props.items() if k in allowed_columns}
            columns = ', '.join(f'"{col}"' for col in clean_props)
            placeholders = ', '.join(['%s'] * len(clean_props))
            values = list(clean_props.values())

            cur.execute(f"""
                INSERT INTO {full_table} ({columns}, geom)
                VALUES ({placeholders}, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            """, values + [merged_geom])

            # Insert new parcel into JoinedTable
            cur.execute(f"""
                INSERT INTO {attr_table} ("pin")
                VALUES (%s)
            """, (new_pin,))

            # STEP 5: Log the new parcel safely
            new_transaction_date = datetime.now()
            loggable_props = {k: v for k, v in clean_props.items() if k in log_columns}

            new_log_fields = ['"table_name"', '"transaction_type"', '"transaction_date"'] + \
                             [f'"{col}"' for col in loggable_props] + ['"geom"']
            new_log_placeholders = ['%s'] * (3 + len(loggable_props)) + ['ST_GeomFromGeoJSON(%s)']
            new_log_values = [table, "new (consolidate)", new_transaction_date] + \
                             list(loggable_props.values()) + [merged_geom]

            cur.execute(f"""
                INSERT INTO {log_table} ({', '.join(new_log_fields)})
                VALUES ({', '.join(new_log_placeholders)})
            """, new_log_values)

            # STEP 6: Log old parcels safely
            for pin in original_pins:
                cur.execute(f"""
                    SELECT *, ST_AsGeoJSON(geom)::json AS geometry
                    FROM {full_table}
                    WHERE pin = %s
                """, (pin,))
                parcel_row = cur.fetchone()
                if not parcel_row:
                    continue

                cur.execute(f"""
                    SELECT * FROM {attr_table}
                    WHERE pin = %s
                """, (pin,))
                attr_row = cur.fetchone() or {}

                merged_data = {**parcel_row, **attr_row}
                geom = merged_data.pop("geometry", None)
                merged_data.pop("geom", None)
                merged_data.pop("table_name", None)
                merged_data.pop("id", None)

                # Filter to existing log table columns
                filtered_data = {k: v for k, v in merged_data.items() if k in log_columns}

                transaction_date = datetime.now()
                log_fields = ['"table_name"', '"transaction_type"', '"transaction_date"'] + \
                             [f'"{f}"' for f in filtered_data] + ['"geom"']
                log_placeholders = ['%s'] * (3 + len(filtered_data)) + ['ST_GeomFromGeoJSON(%s)']
                log_values = [table, "consolidated", transaction_date] + \
                             list(filtered_data.values()) + [json.dumps(geom)]

                cur.execute(f"""
                    INSERT INTO {log_table} ({', '.join(log_fields)})
                    VALUES ({', '.join(log_placeholders)})
                """, log_values)

                # Delete old parcel entries
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
