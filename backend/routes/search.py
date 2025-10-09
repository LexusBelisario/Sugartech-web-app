from fastapi import APIRouter, Query, HTTPException, Request
from db import get_connection

router = APIRouter()

# ============================================================
# 🔍 PROPERTY SEARCH ENDPOINTS
# ============================================================

@router.get("/attribute-table")
def get_attribute_table(schema: str = Query(..., description="Municipal schema name")):
    """
    Returns the entire JoinedTable for the selected schema.
    This is used by Property Search and cached on the frontend.
    """
    try:
        conn = get_connection()
        with conn.cursor() as cur:
            cur.execute(f'SELECT * FROM "{schema}"."JoinedTable"')
            rows = cur.fetchall()

        return {"status": "success", "data": rows}

    except Exception as e:
        print(f"❌ Error fetching attribute table for {schema}:", e)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/property-search")
async def property_search(request: Request):
    """
    Performs a property search directly in PostgreSQL based on filters.
    Currently supports equality and partial match for common fields.
    Frontend can later decide whether to use this or local filtering.
    """
    data = await request.json()
    schema = data.get("schema")
    filters = data.get("filters", {})

    if not schema:
        raise HTTPException(status_code=400, detail="Schema is required")

    try:
        conn = get_connection()
        where_clauses = []
        values = []

        for field, value in filters.items():
            if not value:
                continue
            # Case-insensitive partial match for text fields
            where_clauses.append(f'LOWER("{field}") LIKE %s')
            values.append(f"%{value.lower()}%")

        sql = f'SELECT * FROM "{schema}"."JoinedTable"'
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        with conn.cursor() as cur:
            cur.execute(sql, values)
            rows = cur.fetchall()

        return {"status": "success", "data": rows, "count": len(rows)}

    except Exception as e:
        print(f"❌ Property search error in {schema}:", e)
        raise HTTPException(status_code=500, detail=str(e))
