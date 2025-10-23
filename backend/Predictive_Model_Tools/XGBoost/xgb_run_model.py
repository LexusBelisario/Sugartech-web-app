from fastapi import APIRouter, UploadFile
from fastapi.responses import JSONResponse
import tempfile, os, joblib, geopandas as gpd, pandas as pd, zipfile, numpy as np
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.pyplot as plt, seaborn as sns

router = APIRouter()
EXPORT_DIR = os.path.join(os.getcwd(), "exported_models")
os.makedirs(EXPORT_DIR, exist_ok=True)

@router.post("/run-saved-model")
async def run_saved_model(model_file: UploadFile, shapefiles: list[UploadFile] = None, zip_file: UploadFile = None):
    """Run saved XGBoost model (.pkl) on shapefile or ZIP."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # === Load model ===
            model_path = os.path.join(tmpdir, model_file.filename)
            with open(model_path, "wb") as out:
                out.write(await model_file.read())

            bundle = joblib.load(model_path)
            model = bundle["model"]
            scaler = bundle.get("scaler")
            features = bundle["features"]

            print(f"📦 Model loaded. Features: {features}")

            # === Load shapefile or ZIP ===
            if zip_file:
                zip_path = os.path.join(tmpdir, zip_file.filename)
                with open(zip_path, "wb") as out:
                    out.write(await zip_file.read())
                with zipfile.ZipFile(zip_path, "r") as z:
                    z.extractall(tmpdir)
            else:
                for f in shapefiles:
                    with open(os.path.join(tmpdir, f.filename), "wb") as out:
                        out.write(await f.read())

            shp_path = next(
                (os.path.join(root, f)
                 for root, _, files in os.walk(tmpdir)
                 for f in files if f.endswith(".shp")),
                None
            )
            if not shp_path:
                return JSONResponse(status_code=400, content={"error": "No .shp file found."})

            print(f"🗺️ Shapefile found: {shp_path}")

            gdf = gpd.read_file(shp_path)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
            df.columns = [c.lower().strip() for c in df.columns]
            features_lower = [f.lower().strip() for f in features]

            print(f"📊 Shapefile columns: {df.columns.tolist()}")
            print(f"📌 Required features: {features_lower}")

            # === 🩹 Fix: Auto-add missing features ===
            missing = [f for f in features_lower if f not in df.columns]
            if missing:
                print(f"⚠️ Missing columns in data: {missing}")
                for m in missing:
                    df[m] = 0  # default 0 for missing fields

            # === Predict ===
            X = df[features_lower].apply(pd.to_numeric, errors="coerce").fillna(0)
            
            # ✅ COMPREHENSIVE FIX: Ensure proper array handling
            if scaler:
                X_transformed = scaler.transform(X)
            else:
                X_transformed = X.values  # Convert DataFrame to numpy array
            
            preds = model.predict(X_transformed)
            preds_array = np.array(preds).flatten()  # Ensure 1D array

            print(f"✅ Predictions shape: {preds_array.shape}")
            print(f"✅ First 5 predictions: {preds_array[:5]}")

            gdf["prediction"] = preds_array

            # === Export outputs ===
            export_id = f"xgb_run_{np.random.randint(100000, 999999)}"
            path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(path, exist_ok=True)

            shp_dir = os.path.join(path, "predicted_shapefile")
            os.makedirs(shp_dir, exist_ok=True)
            shp_out = os.path.join(shp_dir, "xgb_predicted.shp")
            gdf.to_file(shp_out)

            zip_out = os.path.join(path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w") as z:
                for f in os.listdir(shp_dir):
                    z.write(os.path.join(shp_dir, f), f)

            # === PDF Summary ===
            pdf_path = os.path.join(path, "xgb_run_report.pdf")
            with PdfPages(pdf_path) as pdf:
                plt.style.use("dark_background")
                
                # Page 1: Summary text
                fig, ax = plt.subplots(figsize=(6, 1.5))
                ax.axis("off")
                ax.text(0.5, 0.5, f"Predictions generated for {len(preds_array)} records",
                        color="#00ff9d", ha="center", va="center", fontsize=14, weight='bold')
                pdf.savefig(fig); plt.close(fig)

                # Page 2: Histogram
                fig, ax = plt.subplots(figsize=(6, 4))
                sns.histplot(preds_array, kde=True, ax=ax, color="#00ff9d", edgecolor="black")
                ax.set_title("Predicted Values Distribution", color="#00ff9d", fontsize=13, weight='bold')
                ax.set_xlabel("Predicted Value", color="white")
                ax.set_ylabel("Frequency", color="white")
                plt.tight_layout()
                pdf.savefig(fig); plt.close(fig)

            print(f"✅ PDF report saved: {pdf_path}")
            print(f"✅ Shapefile saved: {zip_out}")

            return {
                "message": "✅ Predictions completed.",
                "downloads": {
                    "report": f"/api/xgb/download?file={pdf_path}",
                    "shapefile": f"/api/xgb/download?file={zip_out}"
                },
                "record_count": int(len(gdf)),
                "isRunMode": True
            }

    except Exception as e:
        import traceback
        print(f"❌ RUN MODEL ERROR: {e}")
        traceback.print_exc()
        return JSONResponse(status_code=500, content={
            "error": str(e),
            "traceback": traceback.format_exc()
        })