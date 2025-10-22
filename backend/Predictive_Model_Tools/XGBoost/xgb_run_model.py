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
            # Load model
            model_path = os.path.join(tmpdir, model_file.filename)
            with open(model_path, "wb") as out: out.write(await model_file.read())
            bundle = joblib.load(model_path)
            model, scaler, features = bundle["model"], bundle.get("scaler"), bundle["features"]

            # Load shapefile or ZIP
            if zip_file:
                zip_path = os.path.join(tmpdir, zip_file.filename)
                with open(zip_path, "wb") as out: out.write(await zip_file.read())
                with zipfile.ZipFile(zip_path, "r") as z: z.extractall(tmpdir)
            else:
                for f in shapefiles:
                    with open(os.path.join(tmpdir, f.filename), "wb") as out: out.write(await f.read())

            shp = next((os.path.join(root, f)
                        for root, _, files in os.walk(tmpdir)
                        for f in files if f.endswith(".shp")), None)
            gdf = gpd.read_file(shp)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
            X = df[features].apply(pd.to_numeric, errors="coerce").fillna(0)

            preds = model.predict(scaler.transform(X) if scaler else X)
            gdf["prediction"] = preds

            # Export shapefile
            export_id = f"xgb_run_{np.random.randint(100000,999999)}"
            path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(path, exist_ok=True)
            shp_dir = os.path.join(path, "predicted_shapefile")
            os.makedirs(shp_dir, exist_ok=True)
            shp_out = os.path.join(shp_dir, "xgb_predicted.shp")
            gdf.to_file(shp_out)
            zip_out = os.path.join(path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w") as z:
                for f in os.listdir(shp_dir): z.write(os.path.join(shp_dir, f), f)

            # PDF report
            pdf_path = os.path.join(path, "xgb_run_report.pdf")
            with PdfPages(pdf_path) as pdf:
                plt.style.use("dark_background")
                fig, ax = plt.subplots(figsize=(6, 1.5))
                ax.axis("off")
                ax.text(0.5, 0.5, f"Predictions generated for {len(preds)} records",
                        color="#00ff9d", ha="center", va="center")
                pdf.savefig(fig); plt.close(fig)

                fig, ax = plt.subplots(figsize=(6, 4))
                sns.histplot(preds, kde=True, ax=ax, color="#00ff9d")
                ax.set_title("Predicted Values Distribution", color="#00ff9d")
                pdf.savefig(fig); plt.close(fig)

            return {
                "message": "✅ Predictions completed.",
                "downloads": {
                    "report": f"/api/xgb/download?file={pdf_path}",
                    "shapefile": f"/api/xgb/download?file={zip_out}"
                },
                "record_count": len(gdf),
                "isRunMode": True
            }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
