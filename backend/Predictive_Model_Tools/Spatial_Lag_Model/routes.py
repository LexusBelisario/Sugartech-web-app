from fastapi import APIRouter, UploadFile, Form, Query
from fastapi.responses import JSONResponse, FileResponse
import geopandas as gpd
import pandas as pd
import numpy as np
import tempfile, os, joblib, json, zipfile
from libpysal.weights import Queen
from spreg import ML_Lag
from sklearn.preprocessing import StandardScaler
import matplotlib.pyplot as plt
import seaborn as sns
from matplotlib.backends.backend_pdf import PdfPages
from datetime import datetime

router = APIRouter(prefix="/spatial-lag", tags=["GEO-AI Tools — Spatial Lag Model"])

EXPORT_DIR = os.path.join(os.getcwd(), "exported_models")
os.makedirs(EXPORT_DIR, exist_ok=True)


# ============================================================
# 🔹 1. Extract shapefile fields
# ============================================================
@router.post("/fields")
async def extract_fields(shapefiles: list[UploadFile]):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            for f in shapefiles:
                with open(os.path.join(tmpdir, f.filename), "wb") as out:
                    out.write(await f.read())

            shp_file = next((f.filename for f in shapefiles if f.filename.endswith(".shp")), None)
            if not shp_file:
                return JSONResponse(status_code=400, content={"error": "No .shp file uploaded."})

            shp_path = os.path.join(tmpdir, shp_file)
            gdf = gpd.read_file(shp_path)
            fields = [c for c in gdf.columns if c.lower() != "geometry"]
            return {"fields": fields}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)}})


# ============================================================
# 🔹 2. Extract shapefile fields (ZIP)
# ============================================================
@router.post("/fields-zip")
async def extract_fields_zip(zip_file: UploadFile):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            zip_path = os.path.join(tmpdir, zip_file.filename)
            with open(zip_path, "wb") as f:
                f.write(await zip_file.read())
            with zipfile.ZipFile(zip_path, "r") as archive:
                archive.extractall(tmpdir)

            shp_files = [os.path.join(r, f) for r, _, files in os.walk(tmpdir) for f in files if f.endswith(".shp")]
            if len(shp_files) == 0:
                return JSONResponse(status_code=400, content={"error": "No shapefile found in ZIP."})
            if len(shp_files) > 1:
                return JSONResponse(status_code=400, content={"error": "Multiple shapefiles found. Upload only one ZIP."})

            gdf = gpd.read_file(shp_files[0])
            fields = [c for c in gdf.columns if c.lower() != "geometry"]
            return {"fields": fields}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)}})


# ============================================================
# 🔹 3. Train Spatial Lag Model (ZIP)
# ============================================================
@router.post("/train-zip")
async def train_spatial_lag_model(
    zip_file: UploadFile,
    independent_vars: str = Form(...),
    dependent_var: str = Form(...),
):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # === Extract ZIP
            zip_path = os.path.join(tmpdir, zip_file.filename)
            with open(zip_path, "wb") as f:
                f.write(await zip_file.read())
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(tmpdir)

            shp_files = [os.path.join(r, f) for r, _, files in os.walk(tmpdir) for f in files if f.endswith(".shp")]
            if not shp_files:
                return JSONResponse(status_code=400, content={"error": "No shapefile found."})
            shp_path = shp_files[0]
            gdf = gpd.read_file(shp_path)
            if not gdf.crs or not gdf.crs.is_projected:
                gdf = gdf.to_crs(epsg=3857)

            df = gdf.copy()
            independent_vars = json.loads(independent_vars) if independent_vars.startswith("[") else independent_vars.split(",")
            independent_vars = [v.strip() for v in independent_vars if v.strip()]
            target = dependent_var.strip()

            missing = [v for v in independent_vars + [target] if v not in df.columns]
            if missing:
                return JSONResponse(status_code=400, content={"error": f"Missing columns: {missing}"})

            df_clean = df.dropna(subset=independent_vars + [target]).copy()
            X = df_clean[independent_vars].apply(pd.to_numeric, errors="coerce").dropna()
            y = df_clean[target].values.reshape(-1, 1)
            df_clean = df_clean.loc[X.index]

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X.values)

            w = Queen.from_dataframe(df_clean)
            w.transform = "r"

            slm = ML_Lag(y, X_scaled, w=w, name_y=target, name_x=independent_vars)
            df_clean["predicted"] = slm.predy.flatten()
            df_clean["residual"] = slm.u.flatten()

            # === Export outputs
            export_id = f"slm_{np.random.randint(100000,999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            model_path = os.path.join(export_path, "trained_slm.pkl")
            joblib.dump({
                "model": slm,
                "scaler": scaler,
                "independent_vars": independent_vars,
                "dependent_var": target,
                "weights": w,
            }, model_path)

            pdf_path = os.path.join(export_path, "slm_report.pdf")
            shapefile_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shapefile_dir, exist_ok=True)
            shp_out = os.path.join(shapefile_dir, "predicted_output.shp")
            df_clean.to_file(shp_out)

            # === Zip shapefile
            zip_out = os.path.join(export_path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w", zipfile.ZIP_DEFLATED) as z:
                for root, _, files in os.walk(shapefile_dir):
                    for f in files:
                        z.write(os.path.join(root, f), f)

            # === Create BLGF-themed PDF
            accent1 = "#00ff9d"
            accent2 = "#f7c800"
            with PdfPages(pdf_path) as pp:
                # 1️⃣ Header Summary
                fig, ax = plt.subplots(figsize=(7, 2))
                ax.axis("off")
                ax.text(0.5, 0.6, "Spatial Lag Model (SLM) — BLGF GIS-AI", ha="center", fontsize=14, weight="bold", color=accent2)
                ax.text(0.5, 0.3, f"Dependent Variable: {target}", ha="center", fontsize=11, color="white")
                pp.savefig(fig, facecolor="#151922"); plt.close(fig)

                # 2️⃣ Metrics
                fig, ax = plt.subplots(figsize=(7, 1.5))
                ax.axis("off")
                metrics = [["Model", "AIC", "Pseudo R²"],
                           ["Spatial Lag Model", f"{slm.aic:.2f}", f"{slm.pr2:.4f}"]]
                table = ax.table(cellText=metrics, loc="center", cellLoc="center")
                for (i, j), c in table.get_celld().items():
                    c.set_facecolor("#151922")
                    c.set_text_props(color=accent1 if i == 0 else "white")
                pp.savefig(fig, facecolor="#151922"); plt.close(fig)

                # 3️⃣ Coefficients
                fig, ax = plt.subplots(figsize=(8, 4))
                sns.barplot(x=independent_vars, y=slm.betas.flatten()[1:], ax=ax, color=accent1)
                ax.set_title("Feature Coefficients", color=accent2)
                ax.set_xlabel("Variables", color="white")
                ax.set_ylabel("Coefficient", color="white")
                ax.tick_params(colors="white")
                fig.patch.set_facecolor("#151922")
                pp.savefig(fig, facecolor="#151922"); plt.close(fig)

                # 4️⃣ Residual Distribution
                fig, ax = plt.subplots(figsize=(6, 4))
                sns.histplot(df_clean["residual"], kde=True, ax=ax, color=accent1)
                ax.set_title("Residual Distribution", color=accent2)
                ax.set_xlabel("Residuals"); ax.set_ylabel("Frequency")
                ax.tick_params(colors="white")
                fig.patch.set_facecolor("#151922")
                pp.savefig(fig, facecolor="#151922"); plt.close(fig)

            # === Prepare JSON response
            base_url = "/api/spatial-lag/download"
            return {
                "dependent_var": target,
                "metrics": {"AIC": slm.aic, "PseudoR2": slm.pr2},
                "coefficients": {v: float(b) for v, b in zip(independent_vars, slm.betas.flatten()[1:])},
                "downloads": {
                    "model": f"{base_url}?file={model_path}",
                    "report": f"{base_url}?file={pdf_path}",
                    "shapefile": f"{base_url}?file={zip_out}",
                },
                "message": "Spatial Lag Model trained successfully."
            }

    except Exception as e:
        print(f"❌ TRAIN-SLM ERROR: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


# ============================================================
# 🔹 4. Run saved model
# ============================================================
@router.post("/run-saved-model")
async def run_saved_model(model_file: UploadFile, zip_file: UploadFile = None, shapefiles: list[UploadFile] = None):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            model_path = os.path.join(tmpdir, model_file.filename)
            with open(model_path, "wb") as f:
                f.write(await model_file.read())

            bundle = joblib.load(model_path)
            slm = bundle["model"]
            scaler = bundle["scaler"]
            indep_vars = bundle["independent_vars"]

            # Load shapefile
            if zip_file:
                zip_path = os.path.join(tmpdir, zip_file.filename)
                with open(zip_path, "wb") as f:
                    f.write(await zip_file.read())
                with zipfile.ZipFile(zip_path, "r") as z:
                    z.extractall(tmpdir)
                shp_files = [os.path.join(r, f) for r, _, files in os.walk(tmpdir) for f in files if f.endswith(".shp")]
                shp_path = shp_files[0]
            else:
                for f in shapefiles:
                    with open(os.path.join(tmpdir, f.filename), "wb") as out:
                        out.write(await f.read())
                shp_path = next((os.path.join(tmpdir, f.filename) for f in shapefiles if f.filename.endswith(".shp")), None)

            gdf = gpd.read_file(shp_path)
            if not gdf.crs or not gdf.crs.is_projected:
                gdf = gdf.to_crs(epsg=3857)

            X = gdf[indep_vars].apply(pd.to_numeric, errors="coerce").dropna()
            X_scaled = scaler.transform(X.values)

            w = Queen.from_dataframe(gdf)
            w.transform = "r"
            preds = ML_Lag(np.zeros((len(X_scaled), 1)), X_scaled, w=w, name_y="prediction", name_x=indep_vars).predy.flatten()
            gdf["prediction"] = preds

            # Export
            export_id = f"run_slm_{np.random.randint(100000,999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            shp_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shp_dir, exist_ok=True)
            shp_out = os.path.join(shp_dir, "predicted_output.shp")
            gdf.to_file(shp_out)

            zip_out = os.path.join(export_path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w", zipfile.ZIP_DEFLATED) as z:
                for root, _, files in os.walk(shp_dir):
                    for f in files:
                        z.write(os.path.join(root, f), f)

            base_url = "/api/spatial-lag/download"
            return {
                "message": "Predictions completed successfully.",
                "downloads": {
                    "shapefile": f"{base_url}?file={zip_out}"
                },
                "record_count": len(gdf)
            }
    except Exception as e:
        print(f"❌ RUN-SLM ERROR: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)}})


# ============================================================
# 🔹 5. Download endpoint
# ============================================================
@router.get("/download")
async def download_file(file: str = Query(...)):
    if not os.path.exists(file):
        return JSONResponse(status_code=404, content={"error": "File not found"})
    return FileResponse(path=file, filename=os.path.basename(file))
