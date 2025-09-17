from fastapi import APIRouter, Request
from db import get_connection
from datetime import datetime
from typing import Tuple
import json

router = APIRouter()

def _resolve_schema_and_tables(cur, schema_in: str, table_in: str) -> Tuple[str, str, str, str]:
    """
    Resolve the real (exactly-cased) names of:
      - schema
      - main table (parcel geometry table)
      - JoinedTable (attributes)
      - parcel_transaction_log (log table)
    using case-insensitive lookups in information_schema.
    """
    # Resolve schema (case-insensitive)
    cur.execute("""
        SELECT schema_name
        FROM information_schema.schemata
        WHERE lower(schema_name) = lower(%s)
        LIMIT 1
    """, (schema_in,))
    r = cur.fetchone()
    if not r:
        raise Exception(f"Schema not found (case-insensitive): {schema_in}")
    schema_real = r["schema_name"]

    # Resolve main table (case-insensitive)
    cur.execute("""
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = %s AND lower(table_name) = lower(%s)
        LIMIT 1
    """, (schema_real, table_in))
    r = cur.fetchone()
    if not r:
        raise Exception(f"Table not found in {schema_real} (case-insensitive): {table_in}")
    table_real = r["table_name"]

    # Resolve auxiliary tables (case-insensitive); if not found, fallback to given names
    def _resolve_aux(name: str) -> str:
        cur.execute("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = %s AND lower(table_name) = lower(%s)
            LIMIT 1
        """, (schema_real, name))
        r2 = cur.fetchone()
        return r2["table_name"] if r2 else name

    attr_real = _resolve_aux("JoinedTable")
    log_real = _resolve_aux("parcel_transaction_log")

    return schema_real, table_real, attr_real, log_real


@router.post("/merge-parcels-postgis")
async def merge_parcels_postgis(request: Request):
    data = await request.json()

    schema = data.get("schema")
    table = data.get("table")
    base_props = data.get("base_props")
    original_pins = data.get("original_pins")
    geometries = data.get("geometries")

    if not schema or not table or not base_props or not original_pins or not geometries:
        return {"status": "error", "message": "Missing required data."}

    try:
        conn = get_connection()  # raw psycopg connection with dict_row
        with conn.cursor() as cur:
            # --- Resolve real names (handles TitleCase vs lowercase) ---
            schema, table, attr_name, log_name = _resolve_schema_and_tables(cur, schema, table)

            full_table = f'"{schema}"."{table}"'
            attr_table = f'"{schema}"."{attr_name}"'
            log_table = f'"{schema}"."{log_name}"'

            # STEP 1: Detect actual column names in table (to whitelist inserts)
            cur.execute("""
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = %s AND table_name = %s
            """, (schema, table))
            all_columns = [r["column_name"] for r in cur.fetchall()]
            allowed_columns = set(all_columns) - {"geom"}  # don't allow direct 'geom' insert as text

            # STEP 2: Merge geometries (expects array of GeoJSON geometries)
            geojson_strings = [json.dumps(g) for g in geometries]
            union_args = ", ".join(["ST_GeomFromGeoJSON(%s)"] * len(geojson_strings))
            cur.execute(f"""
                SELECT ST_AsGeoJSON(ST_Union(ARRAY[{union_args}])) AS merged
            """, geojson_strings)
            merged_result = cur.fetchone()
            merged_geom = merged_result["merged"] if merged_result else None
            if not merged_geom:
                return {"status": "error", "message": "Geometry union failed."}

            # STEP 3: Generate new PIN
            prefix = original_pins[0].rsplit("-", 1)[0] if original_pins and "-" in original_pins[0] else original_pins[0]

            # If we have a 'barangay' in base_props and it exists as a column, limit the search
            if "barangay" in base_props and "barangay" in allowed_columns:
                cur.execute(f"""
                    SELECT pin FROM {full_table}
                    WHERE barangay = %s AND pin ~ %s
                """, (base_props["barangay"], r".*\d{3}$"))
            else:
                cur.execute(f"""
                    SELECT pin FROM {full_table}
                    WHERE pin ~ %s
                """, (r".*\d{3}$",))

            existing_pins = [row["pin"] for row in cur.fetchall()]
            suffixes = [int(p[-3:]) for p in existing_pins if p and p[-3:].isdigit()]
            next_suffix = max(suffixes or [0]) + 1
            new_pin = f"{prefix}-{str(next_suffix).zfill(3)}"

            # STEP 4: Insert new parcel (geometry table)
            # Ensure we only insert columns that exist on the geometry table (besides geom)
            base_props = dict(base_props)  # avoid mutating caller
            base_props["pin"] = new_pin
            base_props["parcel"] = base_props.get("parcel", "")
            base_props["section"] = base_props.get("section", "")
            base_props.pop("id", None)  # avoid SERIAL conflicts if present

            clean_props = {k: v for k, v in base_props.items() if k in allowed_columns}
            if not clean_props:
                # At minimum, we need 'pin'
                clean_props = {"pin": new_pin}

            columns = ", ".join(f'"{col}"' for col in clean_props)
            placeholders = ", ".join(["%s"] * len(clean_props))
            values = list(clean_props.values())

            cur.execute(f"""
                INSERT INTO {full_table} ({columns}, geom)
                VALUES ({placeholders}, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            """, values + [merged_geom])

            # Insert new parcel into JoinedTable with only pin (no inherited attributes yet)
            cur.execute(f"""
                INSERT INTO {attr_table} ("pin")
                VALUES (%s)
                ON CONFLICT ("pin") DO NOTHING
            """, (new_pin,))

            # STEP 5: Log the new parcel
            new_transaction_date = datetime.now()
            new_log_fields = ['"table_name"', '"transaction_type"', '"transaction_date"'] + \
                             [f'"{col}"' for col in clean_props] + ['"geom"']
            new_log_placeholders = ["%s"] * (3 + len(clean_props)) + ['ST_GeomFromGeoJSON(%s)']
            new_log_values = [table, "new (consolidate)", new_transaction_date] + \
                              list(clean_props.values()) + [merged_geom]

            cur.execute(f"""
                INSERT INTO {log_table} ({', '.join(new_log_fields)})
                VALUES ({', '.join(new_log_placeholders)})
            """, new_log_values)

            # STEP 6: Log old parcels with full data, then delete them
            for pin in original_pins:
                # 6.1 Get full from parcel table (geom as json)
                cur.execute(f"""
                    SELECT *, ST_AsGeoJSON(geom)::json AS geometry
                    FROM {full_table}
                    WHERE pin = %s
                """, (pin,))
                parcel_row = cur.fetchone()
                if not parcel_row:
                    continue

                # 6.2 Get from JoinedTable
                cur.execute(f"""
                    SELECT *
                    FROM {attr_table}
                    WHERE pin = %s
                """, (pin,))
                attr_row = cur.fetchone() or {}

                # 6.3 Merge both dictionaries
                merged_data = {**parcel_row, **attr_row}
                geom_json = merged_data.pop("geometry", None)
                merged_data.pop("geom", None)
                merged_data.pop("table_name", None)
                merged_data.pop("id", None)  # avoid PK conflict in log

                # 6.4 Log it
                transaction_date = datetime.now()
                final_fields = list(merged_data.keys())
                log_fields = ['"table_name"', '"transaction_type"', '"transaction_date"'] + \
                             [f'"{f}"' for f in final_fields] + ['"geom"']
                log_placeholders = ["%s"] * (3 + len(final_fields)) + ['ST_GeomFromGeoJSON(%s)']
                log_values = [table, "consolidated", transaction_date] + \
                             list(merged_data.values()) + [json.dumps(geom_json) if geom_json else None]

                cur.execute(f"""
                    INSERT INTO {log_table} ({', '.join(log_fields)})
                    VALUES ({', '.join(log_placeholders)})
                """, log_values)

                # 6.5 Delete old parcel from geometry table and JoinedTable
                cur.execute(f'DELETE FROM {full_table} WHERE pin = %s', (pin,))
                cur.execute(f'DELETE FROM {attr_table} WHERE pin = %s', (pin,))

            conn.commit()
            return {"status": "success", "new_pin": new_pin}

    except Exception as e:
        try:
            conn.rollback()
        except Exception:
            pass
        print("❌ Consolidation error:", str(e))
        return {"status": "error", "message": str(e)}
