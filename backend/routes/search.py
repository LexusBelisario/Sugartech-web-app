from fastapi import APIRouter, Query
from db import get_connection

router = APIRouter()

@router.get("/attribute-table")
def get_attribute_table(schema: str):
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(f'''
                SELECT * FROM "{schema}"."JoinedTable"
            ''')
            rows = cur.fetchall()
        return {"status": "success", "data": rows}
    except Exception as e:
        return {"status": "error", "message": str(e)}
