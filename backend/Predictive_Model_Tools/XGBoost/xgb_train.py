from fastapi import APIRouter, UploadFile, Form
from fastapi.responses import JSONResponse
import tempfile, os, joblib, json, zipfile
import numpy as np, geopandas as gpd, pandas as pd
from xgboost import XGBRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.pyplot as plt, seaborn as sns
from datetime import datetime

router = APIRouter()
EXPORT_DIR = os.path.join(os.getcwd(), "exported_models")
os.makedirs(EXPORT_DIR, exist_ok=True)

@router.post("/train")
async def train_xgb(
    shapefiles: list[UploadFile] = None,
    zip_file: UploadFile = None,
    independent_vars: str = Form(...),
    dependent_var: str = Form(...),
    scaler_choice: str = Form("None")
):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # --- Load shapefile ---
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
            if not shp:
                return JSONResponse(status_code=400, content={"error": "No shapefile found."})

            gdf = gpd.read_file(shp)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))

            indep = json.loads(independent_vars) if independent_vars.startswith("[") else independent_vars.split(",")
            dep = dependent_var.strip()

            df = df.dropna(subset=indep + [dep])
            X = df[indep].apply(pd.to_numeric, errors="coerce").fillna(0)
            y = df[dep].apply(pd.to_numeric, errors="coerce").fillna(0)

            X_train_raw, X_test_raw, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)

            scaler = None
            if scaler_choice == "Standard":
                scaler = StandardScaler().fit(X_train_raw)
                X_train, X_test = scaler.transform(X_train_raw), scaler.transform(X_test_raw)
            elif scaler_choice == "MinMax":
                scaler = MinMaxScaler().fit(X_train_raw)
                X_train, X_test = scaler.transform(X_train_raw), scaler.transform(X_test_raw)
            else:
                X_train, X_test = X_train_raw, X_test_raw

            model = XGBRegressor(
                objective="reg:squarederror", n_estimators=500, max_depth=6,
                learning_rate=0.1, subsample=0.8, colsample_bytree=0.8,
                random_state=42, n_jobs=-1
            )
            model.fit(X_train, y_train)
            preds = model.predict(X_test)

            residuals = y_test - preds

            mse, mae, rmse, r2 = (
                mean_squared_error(y_test, preds),
                mean_absolute_error(y_test, preds),
                np.sqrt(mean_squared_error(y_test, preds)),
                r2_score(y_test, preds)
            )

            # === Save model ===
            export_id = f"xgb_{np.random.randint(100000,999999)}"
            path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(path, exist_ok=True)

            model_path = os.path.join(path, "xgb_model.pkl")
            joblib.dump({
                "model": model, "features": indep,
                "dependent_var": dep, "scaler": scaler
            }, model_path)

            # === Export predicted shapefile ===
            gdf["prediction"] = model.predict(scaler.transform(X) if scaler else X)
            shp_dir = os.path.join(path, "predicted_shapefile")
            os.makedirs(shp_dir, exist_ok=True)
            shp_out = os.path.join(shp_dir, "predicted_output.shp")
            gdf.to_file(shp_out)
            zip_out = os.path.join(path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w") as z:
                for f in os.listdir(shp_dir): z.write(os.path.join(shp_dir, f), f)

            csv_path = os.path.join(path, "xgb_output.csv")
            gdf[indep + [dep, "prediction"]].to_csv(csv_path, index=False)

            # === PDF (white theme) ===
            pdf_path = os.path.join(path, "xgb_report.pdf")
            with PdfPages(pdf_path) as pdf:
                plt.style.use("default")
                fig, ax = plt.subplots(figsize=(6, 1.5))
                ax.axis("off")
                tbl = ax.table(cellText=[[f"{mse:.2f}", f"{mae:.2f}", f"{rmse:.2f}", f"{r2:.2f}"]],
                               colLabels=["MSE","MAE","RMSE","R²"], loc="center", cellLoc="center")
                ax.set_title("📊 XGBoost Model Performance", color="#0078D7")
                pdf.savefig(fig); plt.close(fig)

                fig, ax = plt.subplots(figsize=(8, 4))
                ax.barh(indep, model.feature_importances_, color="#0078D7")
                ax.set_title("Feature Importance", color="#0078D7")
                pdf.savefig(fig); plt.close(fig)

            # === Histogram bins ===
            counts, bins = np.histogram(residuals, bins=20)
            residual_bins = bins[:-1].tolist()
            residual_counts = counts.tolist()

            return {
                "message": "✅ XGBoost trained successfully.",
                "downloads": {
                    "model": f"/api/xgb/download?file={model_path}",
                    "report": f"/api/xgb/download?file={pdf_path}",
                    "shapefile": f"/api/xgb/download?file={zip_out}",
                    "csv": f"/api/xgb/download?file={csv_path}"
                },
                "metrics": {"R²": r2, "RMSE": rmse, "MAE": mae, "MSE": mse},
                "features": indep,
                "importance": model.feature_importances_.tolist(),
                "y_test": y_test.tolist(),
                "preds": preds.tolist(),
                "residual_bins": residual_bins,
                "residual_counts": residual_counts,
                "isRunMode": False
            }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
