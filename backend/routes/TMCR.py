from fastapi import APIRouter, HTTPException, Query
from db import get_connection
import re
from pydantic import BaseModel, Field
from typing import Optional, List

class TableSetter(BaseModel):
    db_schema: str = Field(alias="schema")
    tableName: str
    columns: Optional[List[str]] = None

router = APIRouter()

CURRENT_SCHEMA = ""
CURRENT_TABLE = ""
CURRENT_COLUMNS = []


def is_valid_identifier(name):
    # Accept letters, numbers, underscore, comma, space, and hyphen
    return re.match(r"^[a-zA-Z0-9_, \-]+$", name) is not None

@router.post("/set-table")
def set_table(data: TableSetter):
    global CURRENT_SCHEMA, CURRENT_TABLE, CURRENT_COLUMNS

    print("📥 Received schema:", data.db_schema)
    print("📥 Received table:", data.tableName)

    if not is_valid_identifier(data.db_schema) or not is_valid_identifier(data.tableName):
        raise HTTPException(status_code=400, detail="❌ Invalid schema or table name")

    CURRENT_SCHEMA = data.db_schema
    CURRENT_TABLE = data.tableName
    CURRENT_COLUMNS = data.columns
    print(f"📦 Table set to: {CURRENT_SCHEMA}.{CURRENT_TABLE}")
    return {"status": "success", "message": f"Table set to {CURRENT_SCHEMA}.{CURRENT_TABLE}"}

@router.get("/unique-values")
def get_unique_values(column: str):
    conn = None
    try:
        print("🔍 column param received:", column)
        allowed_columns = {"province", "municipal", "barangay", "section", "pin"}
        if column not in allowed_columns:
            raise HTTPException(status_code=400, detail="Invalid column name.")

        if not (is_valid_identifier(CURRENT_SCHEMA) and is_valid_identifier(CURRENT_TABLE)):
            raise HTTPException(status_code=400, detail="❌ Invalid schema or table name.")

        conn = get_connection()
        with conn.cursor() as cur:
            query = f'SELECT DISTINCT "{column}" FROM "{CURRENT_SCHEMA}"."{CURRENT_TABLE}" WHERE "{column}" IS NOT NULL'
            print("🔧 Running query:", query)
            cur.execute(query)
            rows = cur.fetchall()
            values = [list(r.values())[0] if isinstance(r, dict) else r[0] for r in rows]

        print("✅ Query result:", values[:5])
        return {"status": "success", "data": values}

    except Exception as e:
        print("❌ Exception occurred:", repr(e))
        if conn:
            try: conn.rollback()
            except Exception as rollback_error:
                print("⚠️ Rollback failed or no connection:", rollback_error)
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            conn.close()

@router.get("/sections-by-barangay")
def get_sections_by_barangay(barangay: str):
    conn = None
    try:
        print("🔍 barangay param received:", barangay)

        if not (is_valid_identifier(CURRENT_SCHEMA) and is_valid_identifier(CURRENT_TABLE)):
            raise HTTPException(status_code=400, detail="❌ Invalid schema or table name.")

        conn = get_connection()
        with conn.cursor() as cur:
            query = f'''
                SELECT DISTINCT "section"
                FROM "{CURRENT_SCHEMA}"."{CURRENT_TABLE}"
                WHERE "barangay" = %s AND "section" IS NOT NULL
            '''
            cur.execute(query, (barangay,))
            rows = cur.fetchall()
            sections = [list(r.values())[0] if isinstance(r, dict) else r[0] for r in rows]

        print("✅ Sections found:", sections)
        return {"status": "success", "data": sections}

    except Exception as e:
        print("❌ Exception occurred:", repr(e))
        if conn:
            try: conn.rollback()
            except Exception as rollback_error:
                print("⚠️ Rollback failed or no connection:", rollback_error)
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            conn.close()

@router.get("/parcels")
def get_parcels(barangay: str, section: str):
    conn = None
    try:
        if not (is_valid_identifier(CURRENT_SCHEMA) and is_valid_identifier(CURRENT_TABLE)):
            raise HTTPException(status_code=400, detail="❌ Invalid schema or table name.")

        conn = get_connection()
        with conn.cursor() as cur:
            query = f'''
                SELECT * FROM "{CURRENT_SCHEMA}"."{CURRENT_TABLE}"
                WHERE "barangay" = %s AND "section" = %s
            '''
            cur.execute(query, (barangay, section))
            rows = cur.fetchall()
            data = [dict(row) if isinstance(row, dict) else {} for row in rows]

        return {"status": "success", "data": data}

    except Exception as e:
        print("❌ Error:", e)
        if conn:
            try: conn.rollback()
            except Exception as rollback_error:
                print("⚠️ Rollback failed or no connection:", rollback_error)
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            conn.close()

@router.get("/available-tables")
def get_available_tables():
    conn = None
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_schema || '.' || table_name AS full_name
                FROM information_schema.columns
                WHERE column_name IN ('geom', 'pin')
                GROUP BY table_schema, table_name
                HAVING COUNT(DISTINCT column_name) = 2
            """)
            rows = cur.fetchall()
            tables = [list(r.values())[0] if isinstance(r, dict) else r[0] for r in rows]

        print("✅ Available tables:", tables)
        return {"status": "success", "data": tables}

    except Exception as e:
        print("❌ Error fetching tables:", repr(e))
        if conn:
            try: conn.rollback()
            except Exception as rollback_error:
                print("⚠️ Rollback failed or no connection:", rollback_error)
        return {"status": "error", "message": str(e)}
    finally:
        if conn:
            conn.close()
