# ============================================================
#  🔍 SEARCH ROUTES
#  Handles all search-related endpoints for property, road,
#  landmark, and attribute (JoinedTable) data.
# ============================================================

from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from auth.dependencies import get_user_main_db

router = APIRouter(prefix="/search", tags=["Search Tools"])

# ============================================================
# 🧩 1. ATTRIBUTE TABLE (JoinedTable Loader)
# ============================================================

@router.get("/attribute-table")
def get_attribute_table(
    schema: str = Query(..., description="Municipal schema name, e.g., PH0403406"),
    db: Session = Depends(get_user_main_db)
):
    """
    Loads all rows from the 'JoinedTable' of the given schema.
    Uses the user's provincial database session to ensure the
    correct province-level DB connection is used.
    """
    try:
        print(f"📂 Fetching JoinedTable for schema: {schema}")

        # Check if the table exists first
        check_sql = text("""
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables
                WHERE table_schema = :schema AND table_name = 'JoinedTable'
            );
        """)
        exists = db.execute(check_sql, {"schema": schema}).scalar()

        if not exists:
            print(f"⚠️ No JoinedTable found in schema '{schema}'")
            return {"status": "error", "message": f"No JoinedTable found in schema '{schema}'", "data": []}

        # Fetch all rows from JoinedTable
        query = text(f'SELECT * FROM "{schema}"."JoinedTable"')
        result = db.execute(query)
        rows = [dict(row._mapping) for row in result]

        print(f"✅ Retrieved {len(rows)} records from {schema}.JoinedTable")
        return {"status": "success", "data": rows, "count": len(rows)}

    except Exception as e:
        print(f"❌ Error fetching JoinedTable for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 🏠 2. PROPERTY SEARCH
# ============================================================

@router.post("/property-search")
async def property_search(request: Request, db: Session = Depends(get_user_main_db)):
    """
    Performs property search within the JoinedTable of a given schema.
    Filters are case-insensitive and partial-match capable.
    """
    data = await request.json()
    schema = data.get("schema")
    filters = data.get("filters", {})

    if not schema:
        raise HTTPException(status_code=400, detail="Schema is required for property search.")

    try:
        where_clauses = []
        params = {}

        # Build WHERE clauses dynamically
        for i, (field, value) in enumerate(filters.items()):
            if not value:
                continue
            key = f"v{i}"
            where_clauses.append(f'LOWER("{field}") LIKE :{key}')
            params[key] = f"%{value.lower()}%"

        sql = f'SELECT * FROM "{schema}"."JoinedTable"'
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        query = text(sql)
        result = db.execute(query, params)
        rows = [dict(row._mapping) for row in result]

        print(f"✅ Property search in {schema}: {len(rows)} result(s)")
        return {"status": "success", "data": rows, "count": len(rows)}

    except Exception as e:
        print(f"❌ Property search error for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 🛣️ 3. ROAD SEARCH
# ============================================================

@router.post("/road-search")
async def road_search(request: Request, db: Session = Depends(get_user_main_db)):
    """
    Searches for roads by name or classification from the 'RoadInfo' table.
    """
    data = await request.json()
    schema = data.get("schema")
    filters = data.get("filters", {})

    if not schema:
        raise HTTPException(status_code=400, detail="Schema is required for road search.")

    try:
        where_clauses = []
        params = {}

        for i, (field, value) in enumerate(filters.items()):
            if not value:
                continue
            key = f"v{i}"
            where_clauses.append(f'LOWER("{field}") LIKE :{key}')
            params[key] = f"%{value.lower()}%"

        sql = f'SELECT * FROM "{schema}"."RoadInfo"'
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        query = text(sql)
        result = db.execute(query, params)
        rows = [dict(row._mapping) for row in result]

        print(f"✅ Road search in {schema}: {len(rows)} result(s)")
        return {"status": "success", "data": rows, "count": len(rows)}

    except Exception as e:
        print(f"❌ Road search error for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================
# 📍 4. LANDMARK SEARCH
# ============================================================

@router.post("/landmark-search")
async def landmark_search(request: Request, db: Session = Depends(get_user_main_db)):
    """
    Searches landmarks (e.g., schools, churches, etc.) from the 'Landmarks' table.
    """
    data = await request.json()
    schema = data.get("schema")
    filters = data.get("filters", {})

    if not schema:
        raise HTTPException(status_code=400, detail="Schema is required for landmark search.")

    try:
        where_clauses = []
        params = {}

        for i, (field, value) in enumerate(filters.items()):
            if not value:
                continue
            key = f"v{i}"
            where_clauses.append(f'LOWER("{field}") LIKE :{key}')
            params[key] = f"%{value.lower()}%"

        sql = f'SELECT * FROM "{schema}"."Landmarks"'
        if where_clauses:
            sql += " WHERE " + " AND ".join(where_clauses)

        query = text(sql)
        result = db.execute(query, params)
        rows = [dict(row._mapping) for row in result]

        print(f"✅ Landmark search in {schema}: {len(rows)} result(s)")
        return {"status": "success", "data": rows, "count": len(rows)}

    except Exception as e:
        print(f"❌ Landmark search error for {schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
