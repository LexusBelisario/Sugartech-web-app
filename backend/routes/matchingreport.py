from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import List
from db import get_connection
from psycopg import sql

router = APIRouter()

# === Response model ===
class MismatchResult(BaseModel):
    pin: str
    mismatched_fields: List[str]
    source_values: dict
    target_values: dict

# === (Optional) for future POST use ===
class SchemaPayload(BaseModel):
    db_schema: str = Field(alias="schema")

# === Utility: Basic SQL-safe validation ===
def is_safe_identifier(name: str):
    return bool(name) and '"' not in name and ';' not in name and '--' not in name

# === GET: List available schemas ===
@router.get("/schemas-ui")
def get_schemas_ui():
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT schema_name
                FROM information_schema.schemata
                WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'public')
                ORDER BY schema_name;
            """)
            rows = cur.fetchall()
            return [row[0] if isinstance(row, (list, tuple)) else row["schema_name"] for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

# === GET: List tables for selected schema ===
@router.get("/tables")
def get_tables(schema: str):
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name;
            """, (schema,))
            rows = cur.fetchall()
            return [row[0] if isinstance(row, (list, tuple)) else row["table_name"] for row in rows]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if conn:
            conn.close()

# === GET: Exact Mismatch Checker ===
@router.get("/exact-mismatch", response_model=List[MismatchResult])
def match_exact_mismatches(
    schema: str = Query(...),
    source_table: str = Query(...),
    target_table: str = Query(...),
    columns: List[str] = Query(...)
):
    conn = None
    try:
        print(f"📦 Mismatch check for schema={schema} source={source_table} target={target_table} cols={columns}")

        if not all(is_safe_identifier(x) for x in [schema, source_table, target_table] + columns):
            raise HTTPException(status_code=400, detail="Invalid schema/table/column names.")

        column_str = ", ".join(f'"{col}"' for col in columns)
        conn = get_connection()

        with conn.cursor() as cur:
            # Source data
            query = sql.SQL("""
                SELECT "pin", {columns}
                FROM {schema}.{table}
                WHERE "pin" IS NOT NULL
            """).format(
                columns=sql.SQL(", ").join([sql.Identifier(col) for col in columns]),
                schema=sql.Identifier(schema),
                table=sql.Identifier(source_table)
            )
            cur.execute(query)
            source_rows = cur.fetchall()

            # Target data
            cur.execute(f'''
                SELECT "pin", {column_str}
                FROM "{schema}"."{target_table}"
                WHERE "pin" IS NOT NULL
            ''')
            target_rows = cur.fetchall()

        # Build dicts
        if isinstance(source_rows[0], dict):
            source_data = {
                row["pin"]: {col: row[col] for col in columns} for row in source_rows
            }
            target_data = {
                row["pin"]: {col: row[col] for col in columns} for row in target_rows
            }
        else:
            source_data = {
                row[0]: {col: val for col, val in zip(columns, row[1:])} for row in source_rows
            }
            target_data = {
                row[0]: {col: val for col, val in zip(columns, row[1:])} for row in target_rows
            }

        # Compare and collect mismatches
        mismatches = []
        for pin, svals in source_data.items():
            tvals = target_data.get(pin)
            if tvals is None:
                mismatches.append(MismatchResult(
                    pin=pin,
                    mismatched_fields=columns,
                    source_values=svals,
                    target_values={col: None for col in columns}
                ))
            else:
                diff = [col for col in columns if svals.get(col) != tvals.get(col)]
                if diff:
                    mismatches.append(MismatchResult(
                        pin=pin,
                        mismatched_fields=diff,
                        source_values=svals,
                        target_values=tvals
                    ))

        for pin, tvals in target_data.items():
            if pin not in source_data:
                mismatches.append(MismatchResult(
                    pin=pin,
                    mismatched_fields=columns,
                    source_values={col: None for col in columns},
                    target_values=tvals
                ))

        print(f"✅ Total mismatches: {len(mismatches)}")
        return mismatches

    except Exception as e:
        import traceback
        traceback.print_exc()
        if conn:
            try:
                conn.rollback()
            except:
                pass
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        if conn:
            conn.close()
