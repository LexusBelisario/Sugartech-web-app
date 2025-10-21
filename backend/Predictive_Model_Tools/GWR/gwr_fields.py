# backend/Predictive_Model_Tools/GWR/gwr_fields.py
from fastapi import APIRouter, UploadFile
from fastapi.responses import JSONResponse
import geopandas as gpd
import pandas as pd
import tempfile, os, zipfile

router = APIRouter()

@router.post("/fields")
async def extract_fields(shapefiles: list[UploadFile]):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            for f in shapefiles:
                with open(os.path.join(tmpdir, f.filename), "wb") as out:
                    out.write(await f.read())
            shp_path = next((os.path.join(tmpdir, f.filename) for f in shapefiles if f.filename.endswith(".shp")), None)
            if not shp_path:
                return JSONResponse(status_code=400, content={"error": "No .shp file found"})
            gdf = gpd.read_file(shp_path)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
            return {"fields": df.columns.tolist()}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
