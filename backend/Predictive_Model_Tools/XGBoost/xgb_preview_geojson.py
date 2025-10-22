from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
import geopandas as gpd
import tempfile, os, zipfile, shutil, json, urllib.parse, traceback

router = APIRouter()

@router.get("/preview-geojson")
def preview_geojson(file_path: str = Query(...)):
    """
    Convert predicted shapefile ZIP to GeoJSON for preview map.
    Compatible with frontend "Show Predicted Values in Map".
    """
    try:
        # 🔍 Normalize and decode URL
        if file_path.startswith("/api/xgb/download"):
            parsed = urllib.parse.urlparse(file_path)
            query_params = urllib.parse.parse_qs(parsed.query)
            file_path = query_params.get("file", [None])[0]
            if not file_path:
                return JSONResponse(status_code=400, content={"error": "Invalid file parameter."})
            file_path = urllib.parse.unquote(file_path)

        file_path = file_path.strip('"').strip("'")
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"File not found: {file_path}"})

        # 🧩 Extract shapefile
        tmpdir = tempfile.mkdtemp()
        extract_dir = os.path.join(tmpdir, "unzipped")
        os.makedirs(extract_dir, exist_ok=True)
        with zipfile.ZipFile(file_path, "r") as z:
            z.extractall(extract_dir)

        # 🔎 Find the .shp file recursively
        shp_file = None
        for root, _, files in os.walk(extract_dir):
            for f in files:
                if f.endswith(".shp"):
                    shp_file = os.path.join(root, f)
                    break
            if shp_file:
                break
        if not shp_file:
            shutil.rmtree(tmpdir)
            return JSONResponse(status_code=400, content={"error": "No .shp file found inside ZIP."})

        # 🌍 Convert to GeoJSON
        gdf = gpd.read_file(shp_file)
        if not gdf.crs:
            gdf.set_crs(epsg=4326, inplace=True)
        elif gdf.crs.to_epsg() != 4326:
            gdf = gdf.to_crs(epsg=4326)

        geojson_data = json.loads(gdf.to_json())
        shutil.rmtree(tmpdir, ignore_errors=True)
        return geojson_data

    except Exception as e:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"error": f"Failed to load shapefile: {str(e)}"})
