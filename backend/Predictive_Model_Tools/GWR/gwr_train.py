# backend/Predictive_Model_Tools/GWR/gwr_train.py
from fastapi import APIRouter, UploadFile, Form
from fastapi.responses import JSONResponse
import tempfile, os, json, joblib, numpy as np, geopandas as gpd, pandas as pd
from sklearn.preprocessing import StandardScaler
from mgwr.gwr import GWR
from mgwr.sel_bw import Sel_BW
import matplotlib.pyplot as plt, seaborn as sns
from .gwr_utils import *
from datetime import datetime
import zipfile, uuid
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader

router = APIRouter()

EXPORT_DIR = os.path.join(os.getcwd(), "exported_models")
os.makedirs(EXPORT_DIR, exist_ok=True)


@router.post("/train")
async def train_gwr(
    shapefiles: list[UploadFile],
    independent_vars: str = Form(...),
    dependent_var: str = Form(...)
):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # === Save uploaded shapefile parts ===
            for f in shapefiles:
                with open(os.path.join(tmpdir, f.filename), "wb") as out:
                    out.write(await f.read())

            shp_path = next(
                (os.path.join(tmpdir, f.filename) for f in shapefiles if f.filename.endswith(".shp")),
                None
            )
            gdf = gpd.read_file(shp_path)
            if not gdf.crs or not gdf.crs.is_projected:
                gdf = gdf.to_crs(epsg=3857)

            # === Prepare data ===
            dep = dependent_var.strip()
            indep = json.loads(independent_vars) if independent_vars.startswith("[") else independent_vars.split(",")
            indep = [v.strip() for v in indep if v.strip()]
            gdf = gdf.dropna(subset=[dep] + indep)

            y = gdf[[dep]].values
            X_df = gdf[indep].apply(pd.to_numeric, errors="coerce").dropna()

            X_df, drop0 = drop_zero_variance(X_df)
            X_df, drop_corr = drop_high_corr(X_df, 0.9)
            X_df, drop_vif = vif_prune(X_df, 3.0)
            X_df, drop_rank = ensure_full_rank(X_df)
            kept = X_df.columns.tolist()
            dropped = drop0 + drop_corr + drop_vif + drop_rank

            scaler = StandardScaler()
            X_scaled = scaler.fit_transform(X_df.values)
            coords = np.column_stack((gdf.geometry.centroid.x, gdf.geometry.centroid.y))
            coords = jitter_duplicate_coords(coords, amount=1e-3)

            # === Fit GWR model ===
            sel = Sel_BW(coords, y, X_scaled, fixed=False, kernel="gaussian")
            bw = sel.search(bw_min=40, bw_max=200)
            gwr = GWR(coords, y, X_scaled, bw, fixed=False, kernel="gaussian")
            results = gwr.fit()

            # === Assign coefficients ===
            param_matrix = results.params
            param_names = ["Intercept"] + kept if param_matrix.shape[1] == len(kept) + 1 else kept[:param_matrix.shape[1]]
            for i, name in enumerate(param_names):
                gdf[f"coef_{name}"] = param_matrix[:, i]

            gdf["prediction"] = results.predy.flatten()
            gdf["residual"] = results.resid_response.flatten()

            # === Export paths ===
            export_id = f"gwr_{np.random.randint(100000, 999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            model_path = os.path.join(export_path, "gwr_model.joblib")
            joblib.dump({
                "bw": bw,
                "scaler": scaler,
                "dep_var": dep,
                "indep_vars": kept,
                "dropped_vars": dropped,
                "vif_final": compute_vif_series(X_df).to_dict(),
                "params": results.params
            }, model_path)

            # ==========================================================
            # 🧾 REPORTLAB PDF REPORT (identical to desktop version)
            # ==========================================================
            pdf_path = os.path.join(export_path, "gwr_report.pdf")
            c = canvas.Canvas(pdf_path, pagesize=A4)
            width, height = A4
            left, top = 50, 50
            y_pos = height - top

            # --- Title ---
            c.setFont("Helvetica-Bold", 16)
            c.drawString(left, y_pos, "GWR Regression Report")
            y_pos -= 25
            c.setFont("Helvetica", 12)

            # --- Model Summary ---
            metrics = [
                f"AICc: {results.aicc:.2f}",
                f"R²: {results.R2:.3f}",
                f"Adj. R²: {results.adj_R2:.3f}",
                f"Bandwidth: {bw:.1f}",
            ]
            if dropped:
                metrics.append(f"Dropped Vars: {', '.join(dropped)}")

            c.setFont("Helvetica-Bold", 13)
            c.drawString(left, y_pos, "Model Summary")
            c.setFont("Helvetica", 12)
            y_pos -= 18
            for m in metrics:
                c.drawString(left + 15, y_pos, m)
                y_pos -= 16

            # --- Mean Coefficients ---
            param_means = results.params.mean(axis=0)
            if len(param_means) == len(kept) + 1:
                param_means = param_means[1:]
            mean_df = pd.Series(param_means, index=kept[:len(param_means)])
            coef_pairs = [f"{name}: {coef:.4f}" for name, coef in mean_df.items()]

            y_pos -= 10
            c.setFont("Helvetica-Bold", 13)
            c.drawString(left, y_pos, "Mean Coefficients (averaged across space)")
            y_pos -= 18
            c.setFont("Helvetica", 12)
            for line in coef_pairs:
                c.drawString(left + 15, y_pos, line)
                y_pos -= 14

            # --- Coefficient Plot ---
            coef_img = os.path.join(export_path, f"coef_{uuid.uuid4().hex}.png")
            plt.figure(figsize=(6, 3), dpi=120)
            sns.barplot(x=mean_df.index, y=mean_df.values)
            plt.xticks(rotation=45, ha='right')
            plt.title('Feature Coefficients (mean across space)')
            plt.tight_layout()
            plt.savefig(coef_img)
            plt.close()

            c.drawImage(ImageReader(coef_img), left, y_pos - 150, width=500, height=120)
            y_pos -= 170
            os.remove(coef_img)

            # --- Residuals Map ---
            resid_img = os.path.join(export_path, f"resid_{uuid.uuid4().hex}.png")
            fig, ax = plt.subplots(figsize=(6, 4), dpi=120)
            gdf.plot(column='residual', ax=ax, cmap='coolwarm', edgecolor='black', legend=True)
            plt.title("Residuals Map"); plt.axis('off'); plt.tight_layout()
            plt.savefig(resid_img); plt.close()
            c.setFont("Helvetica-Bold", 13)
            c.drawString(left, y_pos, "Residuals Map")
            c.drawImage(ImageReader(resid_img), left, y_pos - 180, width=500, height=150)
            y_pos -= 200
            os.remove(resid_img)

            # --- VIF Diagnostics ---
            vif_series = compute_vif_series(X_df)
            vif_pairs = [f"{k}: VIF = {v:.2f}" for k, v in vif_series.items()]

            if y_pos < 180:  # new page if needed
                c.showPage()
                y_pos = height - 70

            c.setFont("Helvetica-Bold", 13)
            c.drawString(left, y_pos, "VIF Diagnostics (final design)")
            y_pos -= 18
            c.setFont("Helvetica", 12)
            for vline in vif_pairs:
                c.drawString(left + 15, y_pos, vline)
                y_pos -= 14

            vif_img = os.path.join(export_path, f"vif_{uuid.uuid4().hex}.png")
            plt.figure(figsize=(6, 3), dpi=120)
            sns.barplot(x=vif_series.index.tolist(), y=vif_series.values)
            plt.xticks(rotation=45, ha='right')
            plt.title('VIF by Variable (lower is better)')
            plt.tight_layout()
            plt.savefig(vif_img); plt.close()
            c.drawImage(ImageReader(vif_img), left, y_pos - 150, width=500, height=120)
            os.remove(vif_img)

            c.save()

            # === Save shapefile ===
            shp_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shp_dir, exist_ok=True)
            shp_pred = os.path.join(shp_dir, "gwr_predicted.shp")
            gdf.to_file(shp_pred)
            zip_out = os.path.join(export_path, "predicted_output.zip")
            with zipfile.ZipFile(zip_out, "w") as z:
                for f in os.listdir(shp_dir):
                    z.write(os.path.join(shp_dir, f), f)

            return {
                "message": "GWR model trained successfully.",
                "downloads": {
                    "model": f"/api/gwr/download?file={model_path}",
                    "report": f"/api/gwr/download?file={pdf_path}",
                    "shapefile": f"/api/gwr/download?file={zip_out}"
                },
                "metrics": {
                    "AICc": results.aicc,
                    "R²": results.R2,
                    "adjR²": results.adj_R2,
                    "Bandwidth": bw
                },
                "kept_vars": kept,
                "dropped_vars": dropped
            }

    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
