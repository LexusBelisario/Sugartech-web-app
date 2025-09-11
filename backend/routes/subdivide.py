from fastapi import APIRouter, Request
from db import get_connection
from datetime import datetime
import json

router = APIRouter()

@router.post("/subdivide")
async def subdivide_parcel(request: Request):
    data = await request.json()
    pin = data.get("pin")
    table = data.get("table")
    schema = data.get("schema")
    split_lines = data.get("split_lines")
    new_pins = data.get("new_pins")

    if not schema or not table or not split_lines:
        return {"status": "error", "message": "Missing required input (schema, table, or split lines)."}

    full_table = f'"{schema}"."{table}"'             # Geometry table (PIN + geom only)
    attr_table = f'"{schema}"."JoinedTable"'      # Attribute-only table
    log_table = f'"{schema}"."parcel_transaction_log"'

    try:
        conn = get_connection()
        with conn.cursor() as cur:
            # === Step 1: Get original parcel geometry ===
            cur.execute(f'''
                SELECT pin, ST_AsGeoJSON(geom)::json AS geometry
                FROM {full_table}
                WHERE pin = %s
                LIMIT 1
            ''', (pin,))
            geo_row = cur.fetchone()

            if not geo_row or not geo_row.get("geometry"):
                return {"status": "error", "message": "Parcel not found or geometry missing."}

            parcel_geom = json.dumps(geo_row["geometry"])

            # === Step 1.1: Get attributes from JoinedTable ===
            cur.execute(f'''
                SELECT * FROM {attr_table}
                WHERE pin = %s
            ''', (pin,))
            attr_row = cur.fetchone() or {}
            merged_props = attr_row.copy()  # All attributes from JoinedTable

            # === Step 2: Prepare split lines with SRID 4326 ===
            line_geoms = [
                f"ST_SetSRID(ST_GeomFromGeoJSON('{json.dumps({'type': 'LineString', 'coordinates': line})}'), 4326)"
                for line in split_lines
            ]
            multiline_sql = f"ST_SetSRID(ST_Union(ARRAY[{','.join(line_geoms)}]), 4326)"

            split_sql = f'''
                SELECT (ST_Dump(ST_CollectionExtract(
                    ST_Split(ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326), {multiline_sql}), 3
                ))).geom::geometry
            '''
            cur.execute(split_sql, (parcel_geom,))
            parts = cur.fetchall()

            if not parts or len(parts) < 2:
                return {"status": "error", "message": "Subdivision failed or created less than 2 parts."}

            if new_pins and len(new_pins) != len(parts):
                return {"status": "error", "message": "PIN count mismatch."}

            transaction_date = datetime.now()

            # === Step 3: Log original parcel ===
            attr_fields = [f for f in merged_props.keys() if f.lower() not in ("id", "geom")]
            log_fields = ', '.join(['"table_name"', '"transaction_type"', '"transaction_date"']
                                   + [f'"{f}"' for f in attr_fields] + ['"geom"'])
            log_placeholders = ', '.join(['%s'] * (3 + len(attr_fields)) + ['ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)'])
            log_values = [table, "subdivided", transaction_date] + [merged_props.get(f) for f in attr_fields] + [parcel_geom]

            cur.execute(f'''
                INSERT INTO {log_table} ({log_fields})
                VALUES ({log_placeholders})
            ''', log_values)

            # === Step 4: Delete original parcel from geometry + attribute tables ===
            cur.execute(f'DELETE FROM {full_table} WHERE pin = %s', (pin,))
            cur.execute(f'DELETE FROM {attr_table} WHERE pin = %s', (pin,))

            # === Step 5: Insert and log new parcels ===
            for idx, geom in enumerate(parts):
                new_pin = new_pins[idx] if new_pins else None
                raw_geom = geom["geom"]

                # Start fresh for new parcels: only keep pin, others blank
                # Remove both id and geom from attribute copy
                new_props = {k: None for k in merged_props.keys() if k.lower() not in ("id", "geom")}
                new_props["pin"] = new_pin



                # --- Geometry table insert (PIN only) ---
                cur.execute(f'''
                    INSERT INTO {full_table} ("pin", geom)
                    VALUES (%s, ST_SetSRID(%s::geometry, 4326))
                ''', [new_pin, raw_geom])

                # --- Attribute table insert (full attributes) ---
                attr_columns = ', '.join(f'"{k}"' for k in new_props.keys() if k.lower() != "geom")
                attr_placeholders = ', '.join(['%s'] * len(new_props))
                cur.execute(f'''
                    INSERT INTO {attr_table} ({attr_columns})
                    VALUES ({attr_placeholders})
                ''', list(new_props.values()))

                # --- Log new part ---
                cur.execute(f'''
                    INSERT INTO {log_table} (table_name, transaction_type, transaction_date, {attr_columns}, geom)
                    VALUES (%s, %s, %s, {attr_placeholders}, ST_SetSRID(%s::geometry, 4326))
                ''', [table, "new (subdivide)", transaction_date] + list(new_props.values()) + [raw_geom])

            conn.commit()
            return {"status": "success", "message": f"Created {len(parts)} subdivisions."}

    except Exception as e:
        try:
            conn.rollback()
        except:
            pass
        print("❌ Subdivision error:", str(e))
        return {"status": "error", "message": str(e)}
