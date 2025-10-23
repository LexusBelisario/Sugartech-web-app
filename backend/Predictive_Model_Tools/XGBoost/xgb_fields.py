from fastapi import APIRouter, UploadFile
from fastapi.responses import JSONResponse
import geopandas as gpd
import pandas as pd
import tempfile, os, zipfile

router = APIRouter()

@router.post("/fields")
async def extract_fields(shapefiles: list[UploadFile] = None, zip_file: UploadFile = None):
    """Extract available fields from uploaded shapefile or ZIP."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            if zip_file:
                zip_path = os.path.join(tmpdir, zip_file.filename)
                with open(zip_path, "wb") as out: out.write(await zip_file.read())
                with zipfile.ZipFile(zip_path, "r") as z: z.extractall(tmpdir)
            else:
                for f in shapefiles:
                    with open(os.path.join(tmpdir, f.filename), "wb") as out: out.write(await f.read())

            shp_path = next((os.path.join(root, f)
                             for root, _, files in os.walk(tmpdir)
                             for f in files if f.endswith(".shp")), None)
            if not shp_path:
                return JSONResponse(status_code=400, content={"error": "No .shp file found."})

            gdf = gpd.read_file(shp_path)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
            return {"fields": df.columns.tolist()}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
