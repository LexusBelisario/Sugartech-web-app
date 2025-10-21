# backend/Predictive_Model_Tools/GWR/gwr_run_model.py
from fastapi import APIRouter, UploadFile, Query
from fastapi.responses import JSONResponse, FileResponse
import tempfile, os, joblib, zipfile, geopandas as gpd, numpy as np, pandas as pd, shutil, json
from .gwr_utils import jitter_duplicate_coords
from mgwr.gwr import GWR

router = APIRouter()

EXPORT_DIR = os.path.join(os.getcwd(), "exported_models")
os.makedirs(EXPORT_DIR, exist_ok=True)


@router.post("/run-saved-model")
async def run_saved_model(model_file: UploadFile, shapefiles: list[UploadFile]):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # Load model
            model_path = os.path.join(tmpdir, model_file.filename)
            with open(model_path, "wb") as out:
                out.write(await model_file.read())
            model_data = joblib.load(model_path)

            dep = model_data["dep_var"]
            indep = model_data["indep_vars"]
            scaler = model_data["scaler"]
            bw = model_data["bw"]
            params = np.array(model_data.get("params", []))

            # Load shapefile
            for f in shapefiles:
                with open(os.path.join(tmpdir, f.filename), "wb") as out:
                    out.write(await f.read())
            shp_path = next((os.path.join(tmpdir, f.filename) for f in shapefiles if f.filename.endswith(".shp")), None)
            gdf = gpd.read_file(shp_path)

            if not gdf.crs or not gdf.crs.is_projected:
                gdf = gdf.to_crs(epsg=3857)

            gdf = gdf.dropna(subset=indep)
            X = gdf[indep].apply(pd.to_numeric, errors="coerce")
            X_scaled = scaler.transform(X)
            coords = np.column_stack((gdf.geometry.centroid.x, gdf.geometry.centroid.y))
            coords = jitter_duplicate_coords(coords, amount=1e-3)

            # === Predict ===
            if params.size > 0:
                mean_params = params.mean(axis=0)
                if mean_params.shape[0] == X_scaled.shape[1] + 1:
                    X_with_const = np.hstack([np.ones((X_scaled.shape[0], 1)), X_scaled])
                else:
                    X_with_const = X_scaled
                pred = np.dot(X_with_const, mean_params)
            else:
                gwr = GWR(coords, np.zeros((len(coords), 1)), X_scaled, bw)
                results = gwr.predict(coords, X_scaled)
                pred = results.predy.flatten()

            gdf["prediction"] = pred

            # === Export results ===
            export_id = f"gwr_run_{np.random.randint(100000,999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            shp_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shp_dir, exist_ok=True)

            shp_pred = os.path.join(shp_dir, "gwr_predicted.shp")
            gdf.to_file(shp_pred)

            zip_out = os.path.join(export_path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w") as z:
                for f in os.listdir(shp_dir):
                    z.write(os.path.join(shp_dir, f), f)

            # ✅ Save GeoJSON preview in EPSG:4326 for map rendering
            geojson_path = os.path.join(export_path, "predicted_preview.geojson")
            gdf_geo = gdf.copy()
            if not gdf_geo.crs or gdf_geo.crs.to_epsg() != 4326:
                gdf_geo = gdf_geo.to_crs(epsg=4326)
            gdf_geo.to_file(geojson_path, driver="GeoJSON")

            # ✅ Build API URL for frontend modal (works with PredictedMapModal.jsx)
            preview_url = f"/api/gwr/preview-geojson?file_path={geojson_path}"

            return {
                "message": "Prediction completed.",
                "downloads": {
                    # ✅ Keep this as the clickable download
                    "shapefile": f"/api/gwr/download?file={zip_out}",

                    # ✅ But pass the ACTUAL file path (not a download URL)
                    "preview": f"/api/gwr/preview-geojson?file_path={zip_out}"
                },
                "record_count": len(gdf)
            }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.get("/preview-geojson")
async def preview_geojson(file_path: str):
    """
    Serve GeoJSON preview directly from a shapefile ZIP or GeoJSON.
    Cleans download-style paths automatically.
    """
    import tempfile, zipfile, geopandas as gpd, json, urllib.parse, os

    try:
        # Decode URL-encoded strings
        file_path = urllib.parse.unquote(file_path)

        # ✅ If the frontend accidentally sends a download URL (starting with /api/gwr/download?file=...)
        if "download?file=" in file_path:
            file_path = file_path.split("download?file=")[-1]

        # ✅ Normalize for Windows paths
        file_path = os.path.normpath(file_path)

        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"File not found: {file_path}"})

        # ✅ If it's a ZIP shapefile, extract and convert
        if file_path.lower().endswith(".zip"):
            with tempfile.TemporaryDirectory() as tmpdir:
                with zipfile.ZipFile(file_path, "r") as z:
                    z.extractall(tmpdir)
                shp_path = next((os.path.join(tmpdir, f) for f in os.listdir(tmpdir) if f.endswith(".shp")), None)
                if not shp_path:
                    return JSONResponse(status_code=400, content={"error": "No .shp found in zip"})

                gdf = gpd.read_file(shp_path)
                if not gdf.crs or not gdf.crs.is_geographic:
                    gdf = gdf.to_crs(epsg=4326)
                geojson_data = json.loads(gdf.to_json())
                return JSONResponse(content=geojson_data)

        # ✅ If it's already GeoJSON, read it directly
        elif file_path.lower().endswith(".geojson"):
            with open(file_path, "r", encoding="utf-8") as f:
                geojson_data = json.load(f)
            return JSONResponse(content=geojson_data)

        else:
            return JSONResponse(status_code=400, content={"error": "Unsupported file format"})

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
