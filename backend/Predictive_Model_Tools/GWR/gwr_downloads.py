# backend/Predictive_Model_Tools/GWR/gwr_downloads.py
from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse
import os, tempfile, zipfile, geopandas as gpd

router = APIRouter()

# ==========================================================
# 📦 Download File Endpoint
# ==========================================================
@router.get("/download")
async def download_file(file: str = Query(...)):
    """
    Serve any generated file (model, PDF, shapefile zip).
    """
    try:
        file_path = os.path.abspath(file)
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"File not found: {file_path}"})

        filename = os.path.basename(file_path)
        return FileResponse(path=file_path, filename=filename, media_type="application/octet-stream")
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


# ==========================================================
# 🌍 Preview Predicted Shapefile as GeoJSON
# ==========================================================
@router.get("/preview-geojson")
async def preview_geojson(file_path: str = Query(...)):
    """
    Extract shapefile from a ZIP and return it as GeoJSON for map preview.
    """
    try:
        # If frontend passed a URL (like /api/gwr/download?file=...), decode it.
        if file_path.startswith("/api/gwr/download?file="):
            from urllib.parse import unquote
            file_path = unquote(file_path.split("file=")[-1])

        file_path = os.path.abspath(file_path)
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"File not found: {file_path}"})

        # If ZIP, extract and find .shp
        if file_path.endswith(".zip"):
            with tempfile.TemporaryDirectory() as tmpdir:
                with zipfile.ZipFile(file_path, "r") as zip_ref:
                    zip_ref.extractall(tmpdir)

                shp_files = [os.path.join(tmpdir, f) for f in os.listdir(tmpdir) if f.endswith(".shp")]
                if not shp_files:
                    return JSONResponse(status_code=400, content={"error": "No .shp file found inside ZIP."})

                gdf = gpd.read_file(shp_files[0])
                return JSONResponse(content=gdf.to_json())
        else:
            return JSONResponse(status_code=400, content={"error": "Expected ZIP file for shapefile preview."})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
