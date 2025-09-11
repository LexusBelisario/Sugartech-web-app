from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from db import get_connection
from typing import Optional, Dict, Any

router = APIRouter()

# --- Pydantic Models ---

class LandmarkById(BaseModel):
    db_schema: str = Field(alias="schema")
    id: int

class LandmarkUpdateByFields(BaseModel):
    db_schema: str = Field(alias="schema")
    id: int
    updated: Dict[str, Any]

class LandmarkInsert(BaseModel):
    db_schema: str = Field(alias="schema")
    name: str
    type: str
    barangay: Optional[str] = None
    descr: Optional[str] = None
    geom: dict

class LandmarkRemove(BaseModel):
    db_schema: str = Field(alias="schema")
    ids: list[int]

class BarangayQuery(BaseModel):
    db_schema: str = Field(alias="schema")
    lat: float
    lng: float


# --- Routes ---

@router.get("/landmarks/{schema}")
async def get_landmarks(schema: str):
    """Fetch all landmarks for a given schema"""
    print(f"🔍 Fetching landmarks for schema: {schema}")
    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(f'''
            SELECT id, name, type, barangay, descr, ST_AsGeoJSON(geom)::json AS geometry
            FROM "{schema}"."Landmarks"
        ''')
        rows = cur.fetchall()

        features = []
        for row in rows:
            features.append({
                "type": "Feature",
                "geometry": row.get("geometry"),
                "properties": {
                    "id": row.get("id"),
                    "name": row.get("name"),
                    "type": row.get("type"),
                    "barangay": row.get("barangay"),
                    "descr": row.get("descr"),
                }
            })

        print(f"✅ Returned {len(features)} landmarks for schema={schema}")
        return {"type": "FeatureCollection", "features": features}

    except Exception as e:
        print(f"❌ Landmark query failed for schema={schema}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        cur.close()
        conn.close()


@router.post("/landmarks/insert")
async def insert_landmark(body: LandmarkInsert):
    """Insert a new landmark into the schema's Landmarks table"""
    import json
    print("📝 Insert request received:")
    print(f"  schema={body.db_schema}, name={body.name}, type={body.type}, barangay={body.barangay}, descr={body.descr}")
    print("  geom payload:", body.geom)

    conn = get_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            f"""
            INSERT INTO "{body.db_schema}"."Landmarks" (name, type, barangay, descr, geom)
            VALUES (%s, %s, %s, %s, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
            RETURNING id
            """,
            (
                body.name,
                body.type,
                body.barangay,
                body.descr,
                json.dumps(body.geom),  # ✅ ensure valid GeoJSON
            ),
        )
        row = cur.fetchone()
        new_id = row["id"] if row else None  # ✅ dict access
        conn.commit()
        print(f"✅ Inserted landmark with id={new_id}")
        return {"status": "success", "id": new_id}
    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"❌ Landmark insert failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()



@router.put("/landmarks/update-by-fields")
async def update_landmark(body: LandmarkUpdateByFields):
    """Update landmark attributes by ID"""
    print("📝 Update request received:")
    print(f"  schema={body.db_schema}, id={body.id}, updated={body.updated}")
    conn = get_connection()
    cur = conn.cursor()
    try:
        set_clauses = []
        values = []
        for col, val in body.updated.items():
            set_clauses.append(f"{col} = %s")
            values.append(val)

        if not set_clauses:
            raise HTTPException(status_code=400, detail="No fields to update")

        query = f"""
            UPDATE "{body.db_schema}"."Landmarks"
            SET {', '.join(set_clauses)}
            WHERE id = %s
        """
        values.append(body.id)
        cur.execute(query, values)
        conn.commit()

        print(f"✅ Updated landmark id={body.id} in schema={body.db_schema}")
        return {"status": "success", "updated_id": body.id}
    finally:
        cur.close()
        conn.close()


@router.post("/landmarks/remove")
async def remove_landmarks(body: LandmarkRemove):
    """Delete multiple landmarks by IDs"""
    print("🗑️ Remove request received:")
    print(f"  schema={body.db_schema}, ids={body.ids}")
    conn = get_connection()
    cur = conn.cursor()
    try:
        if not body.ids:
            raise HTTPException(status_code=400, detail="No IDs provided")

        query = f"""
            DELETE FROM "{body.db_schema}"."Landmarks"
            WHERE id = ANY(%s)
        """
        cur.execute(query, (body.ids,))
        conn.commit()

        print(f"✅ Removed landmarks: {body.ids}")
        return {"status": "success", "removed_ids": body.ids}
    finally:
        cur.close()
        conn.close()


@router.post("/find-barangay")
async def find_barangay(body: BarangayQuery):
    """Find which barangay boundary polygon contains a given lat/lng point"""
    print(f"📍 Find barangay request: schema={body.db_schema}, lat={body.lat}, lng={body.lng}")
    conn = get_connection()
    cur = conn.cursor()
    try:
        # Force floats just in case
        lng = float(body.lng)
        lat = float(body.lat)

        query = f"""
            SELECT barangay
            FROM "{body.db_schema}"."BarangayBoundary"
            WHERE ST_Contains(geom, ST_SetSRID(ST_Point(%s, %s), 4326))
            LIMIT 1
        """
        print("📝 Running query:", query)
        print("📝 Params:", lng, lat)

        cur.execute(query, (lng, lat))
        row = cur.fetchone()
        print("📝 Row result:", row)

        if not row:
            print("⚠️ No barangay found for this point")
            return {"barangay": None}

        print(f"✅ Found barangay: {row['barangay']}")
        return {"barangay": row["barangay"]}

    except Exception as e:
        import traceback; traceback.print_exc()
        print(f"❌ Failed to find barangay: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
