from fastapi import APIRouter, UploadFile, Form, Query
from fastapi.responses import JSONResponse, FileResponse
import geopandas as gpd
import pandas as pd
import numpy as np
import tempfile, os, joblib, json, zipfile, shutil
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from matplotlib.backends.backend_pdf import PdfPages
import matplotlib.pyplot as plt
import seaborn as sns
from scipy import stats

router = APIRouter(prefix="/linear-regression", tags=["AI Model Tools"])

# Directory to save generated files
EXPORT_DIR = os.path.join(os.getcwd(), "exported_models")
os.makedirs(EXPORT_DIR, exist_ok=True)

# ============================================================
# 🔹 1. Extract shapefile fields (strict validation for one complete set)
# ============================================================
@router.post("/fields")
async def extract_fields(shapefiles: list[UploadFile]):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # ✅ Save uploaded files
            for f in shapefiles:
                with open(os.path.join(tmpdir, f.filename), "wb") as out:
                    out.write(await f.read())

            # ✅ Collect all shapefile extensions and group by basename
            files = os.listdir(tmpdir)
            shapefile_map = {}
            for f in files:
                base, ext = os.path.splitext(f)
                ext = ext.lower()
                if ext in [".shp", ".dbf", ".shx", ".prj"]:
                    shapefile_map.setdefault(base, []).append(ext)

            # ✅ Validation logic
            if len(shapefile_map) == 0:
                return JSONResponse(status_code=400, content={"error": "No shapefile components found."})
            if len(shapefile_map) > 1:
                return JSONResponse(status_code=400, content={"error": "Multiple shapefile base names detected. Please upload only one shapefile set."})

            base_name, exts = next(iter(shapefile_map.items()))
            required_exts = {".shp", ".dbf", ".shx", ".prj"}
            missing_exts = required_exts - set(exts)
            if missing_exts:
                return JSONResponse(status_code=400, content={"error": f"Incomplete shapefile. Missing: {', '.join(missing_exts)}"})

            # ✅ Detect duplicates
            for ext in required_exts:
                duplicates = [f for f in files if f.lower().endswith(ext)]
                if len(duplicates) > 1:
                    return JSONResponse(status_code=400, content={"error": f"Duplicate {ext} files detected."})

            # ✅ Read shapefile safely
            shp_path = os.path.join(tmpdir, f"{base_name}.shp")
            gdf = gpd.read_file(shp_path)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
            fields = df.columns.tolist()
            print(f"✅ Extracted fields: {fields}")
            return {"fields": fields}

    except Exception as e:
        print(f"❌ Error extracting fields: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})

# ============================================================
# 🔹 1B. Extract fields from ZIP shapefile (auto-detect single shapefile)
# ============================================================
@router.post("/fields-zip")
async def extract_fields_zip(zip_file: UploadFile):  # ✅ renamed parameter
    import zipfile as zfmod  # ✅ renamed module to avoid conflict
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # ✅ Save uploaded zip
            zip_path = os.path.join(tmpdir, zip_file.filename)
            with open(zip_path, "wb") as out:
                out.write(await zip_file.read())

            # ✅ Extract ZIP contents
            with zfmod.ZipFile(zip_path, "r") as archive:
                archive.extractall(tmpdir)

            # ✅ Find .shp files recursively (handles nested folders)
            shp_files = []
            for root, _, files in os.walk(tmpdir):
                for f in files:
                    if f.endswith(".shp"):
                        shp_files.append(os.path.join(root, f))

            if len(shp_files) == 0:
                return JSONResponse(status_code=400, content={"error": "No .shp file found in ZIP."})
            if len(shp_files) > 1:
                return JSONResponse(
                    status_code=400,
                    content={"error": "Multiple shapefiles detected. Please upload only one shapefile set."}
                )

            # ✅ Read and extract fields
            shp_path = shp_files[0]
            gdf = gpd.read_file(shp_path)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))
            fields = df.columns.tolist()
            print(f"✅ Extracted fields from ZIP: {fields}")
            return {"fields": fields}

    except Exception as e:
        print(f"❌ Error reading ZIP shapefile: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})

# ============================================================
# 🔹 Train Linear Regression model and export files (with full PDF)
# ============================================================
@router.post("/train")
async def train_linear_regression(
    shapefiles: list[UploadFile],
    independent_vars: str = Form(...),
    dependent_var: str = Form(...),
):
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # ✅ Save uploaded shapefile parts
            for f in shapefiles:
                with open(os.path.join(tmpdir, f.filename), "wb") as out:
                    out.write(await f.read())

            shp_file = next((f.filename for f in shapefiles if f.filename.endswith(".shp")), None)
            if not shp_file:
                return JSONResponse(status_code=400, content={"error": "No .shp file found."})

            shp_path = os.path.join(tmpdir, shp_file)
            gdf = gpd.read_file(shp_path)
            df_full = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))

            # ✅ Parse vars
            independent_vars = json.loads(independent_vars) if independent_vars.startswith("[") else independent_vars.split(",")
            target = dependent_var.strip()

            missing = [v for v in independent_vars + [target] if v not in df_full.columns]
            if missing:
                return JSONResponse(status_code=400, content={"error": f"Missing variables: {missing}"})

            # ✅ Clean numeric
            def clean_numeric(s):
                if isinstance(s, str):
                    return s.replace(",", "").strip()
                return s
            df_full[independent_vars + [target]] = df_full[independent_vars + [target]].applymap(clean_numeric)
            for col in independent_vars + [target]:
                df_full[col] = pd.to_numeric(df_full[col], errors="coerce")

            df_valid = df_full.dropna(subset=independent_vars + [target]).copy()
            if df_valid.empty:
                return JSONResponse(status_code=400, content={"error": "No valid numeric data after cleaning."})

            # === Train model ===
            X = df_valid[independent_vars].values
            y = df_valid[target].values
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
            scaler = StandardScaler().fit(X_train)
            X_train = scaler.transform(X_train)
            X_test = scaler.transform(X_test)

            model = LinearRegression()
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            residuals = y_test - preds

            mse = mean_squared_error(y_test, preds)
            mae = mean_absolute_error(y_test, preds)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, preds)

            # === Create export folder ===
            export_id = f"linear_{np.random.randint(100000, 999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            # ✅ Save model
            model_path = os.path.join(export_path, "trained_model.pkl")
            joblib.dump({
                "model": model,
                "scaler": scaler,
                "features": independent_vars,
                "dependent_var": target
            }, model_path)

            # ✅ Generate PDF Report (full desktop-style)
            pdf_path = os.path.join(export_path, "regression_report.pdf")
            with PdfPages(pdf_path) as pp:
                # 1️⃣ Metrics Table
                fig, ax = plt.subplots(figsize=(6, 1.5))
                ax.axis("off")
                table = ax.table(
                    cellText=[
                        ["Model", "MSE", "MAE", "RMSE", "R²"],
                        ["Linear Regression", f"{mse:.2f}", f"{mae:.2f}", f"{rmse:.2f}", f"{r2:.2f}"],
                    ],
                    loc="center",
                    cellLoc="center",
                )
                table.scale(1, 2)
                pp.savefig(fig); plt.close(fig)

                # 2️⃣ Feature Importance
                std_X = np.std(X_train, axis=0)
                std_y = np.std(y_train)
                importance = model.coef_ * std_X / std_y
                fig, ax = plt.subplots(figsize=(8, 4))
                ax.bar(independent_vars, importance)
                ax.set_ylabel("Standardized Coefficient")
                ax.set_title("Feature Importance")
                plt.xticks(rotation=45)
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

                # 3️⃣ Residual Distribution (Normal Curve)
                fig, ax = plt.subplots(figsize=(6, 4))
                sns.histplot(residuals, kde=True, ax=ax)
                ax.set_title("Residual Distribution (Normal Curve)")
                ax.set_xlabel("Residual")
                ax.set_ylabel("Frequency")
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

                # 4️⃣ T-test on Residuals
                t_stat, p_val = stats.ttest_1samp(residuals, 0)
                fig, ax = plt.subplots(figsize=(6, 2))
                ax.axis("off")
                ax.text(
                    0.5, 0.5,
                    f"T-test on Residuals:\nT-statistic = {t_stat:.4f}\nP-value = {p_val:.4f}",
                    fontsize=12, ha="center", va="center"
                )
                pp.savefig(fig); plt.close(fig)

                # 5️⃣ Distribution of Each Independent Variable
                for col in independent_vars:
                    try:
                        fig, ax = plt.subplots(figsize=(6, 4))
                        sns.histplot(df_valid[col], kde=True, ax=ax)
                        ax.set_title(f"Distribution of '{col}'")
                        ax.set_xlabel(col)
                        ax.set_ylabel("Frequency")
                        plt.tight_layout()
                        pp.savefig(fig); plt.close(fig)
                    except Exception as e:
                        print(f"Failed to plot {col}: {e}")

                # 6️⃣ Actual vs Predicted Scatter Plot
                fig, ax = plt.subplots(figsize=(6, 6))
                ax.scatter(y_test, preds, alpha=0.6)
                ax.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], "k--", lw=1.5)
                ax.set_xlabel("Actual Values")
                ax.set_ylabel("Predicted Values")
                ax.set_title("Actual vs Predicted Scatter Plot")
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

            # ✅ Predict on valid subset & save shapefile
            df_full["prediction"] = np.nan
            X_scaled_valid = scaler.transform(df_valid[independent_vars])
            preds_valid = model.predict(X_scaled_valid)
            df_full.loc[df_valid.index, "prediction"] = preds_valid
            gdf["prediction"] = df_full["prediction"]

            shp_pred_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shp_pred_dir, exist_ok=True)
            shp_pred_path = os.path.join(shp_pred_dir, "predicted_output.shp")
            gdf.to_file(shp_pred_path)

            zip_path = os.path.join(export_path, "predicted_output.zip")
            with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
                for root, _, files in os.walk(shp_pred_dir):
                    for f in files:
                        z.write(os.path.join(root, f), f)

            base_url = "/api/linear-regression/download"
            return {
                "metrics": {"R²": r2, "MSE": mse, "MAE": mae, "RMSE": rmse},
                "downloads": {
                    "model": f"{base_url}?file={model_path}",
                    "report": f"{base_url}?file={pdf_path}",
                    "shapefile": f"{base_url}?file={zip_path}",
                },
                "message": "Model trained successfully and files ready for download.",
            }

    except Exception as e:
        print(f"❌ Error during training: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# ============================================================
# 🔹 Train Linear Regression directly from ZIP shapefile (full PDF)
# ============================================================
@router.post("/train-zip")
async def train_linear_regression_zip(
    zip_file: UploadFile,
    independent_vars: str = Form(...),
    dependent_var: str = Form(...),
):
    import zipfile as zfmod
    from matplotlib.backends.backend_pdf import PdfPages
    import matplotlib.pyplot as plt
    import seaborn as sns
    from scipy import stats

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # ✅ Save uploaded ZIP
            zip_path = os.path.join(tmpdir, zip_file.filename)
            with open(zip_path, "wb") as out:
                out.write(await zip_file.read())

            # ✅ Extract all shapefile components
            with zfmod.ZipFile(zip_path, "r") as archive:
                archive.extractall(tmpdir)

            # ✅ Detect single shapefile
            shp_files = []
            for root, _, files in os.walk(tmpdir):
                for f in files:
                    if f.endswith(".shp"):
                        shp_files.append(os.path.join(root, f))
            if len(shp_files) == 0:
                return JSONResponse(status_code=400, content={"error": "No .shp file found in ZIP."})
            if len(shp_files) > 1:
                return JSONResponse(status_code=400, content={"error": "Multiple shapefiles found. Upload only one shapefile set."})

            shp_path = shp_files[0]
            gdf = gpd.read_file(shp_path)
            df_full = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))

            # ✅ Parse variables
            independent_vars = json.loads(independent_vars) if independent_vars.startswith("[") else independent_vars.split(",")
            target = dependent_var.strip()

            missing = [v for v in independent_vars + [target] if v not in df_full.columns]
            if missing:
                return JSONResponse(status_code=400, content={"error": f"Missing variables: {missing}"})

            # ✅ Clean numeric
            def clean_numeric(s):
                if isinstance(s, str):
                    return s.replace(",", "").strip()
                return s
            df_full[independent_vars + [target]] = df_full[independent_vars + [target]].applymap(clean_numeric)
            for col in independent_vars + [target]:
                df_full[col] = pd.to_numeric(df_full[col], errors="coerce")

            df_valid = df_full.dropna(subset=independent_vars + [target]).copy()
            if df_valid.empty:
                return JSONResponse(status_code=400, content={"error": "No valid numeric data after cleaning."})

            # === Train Model ===
            X = df_valid[independent_vars].values
            y = df_valid[target].values
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
            scaler = StandardScaler().fit(X_train)
            X_train = scaler.transform(X_train)
            X_test = scaler.transform(X_test)

            model = LinearRegression()
            model.fit(X_train, y_train)
            preds = model.predict(X_test)
            residuals = y_test - preds

            mse = mean_squared_error(y_test, preds)
            mae = mean_absolute_error(y_test, preds)
            rmse = np.sqrt(mse)
            r2 = r2_score(y_test, preds)

            # === Create export folder ===
            export_id = f"zip_linear_{np.random.randint(100000, 999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            # ✅ Save model
            model_path = os.path.join(export_path, "trained_model.pkl")
            joblib.dump({
                "model": model,
                "scaler": scaler,
                "features": independent_vars,
                "dependent_var": target
            }, model_path)

            # ✅ Generate PDF Report (full desktop version)
            pdf_path = os.path.join(export_path, "regression_report.pdf")
            with PdfPages(pdf_path) as pp:
                # 1️⃣ Metrics Table
                fig, ax = plt.subplots(figsize=(6, 1.5))
                ax.axis("off")
                table = ax.table(
                    cellText=[
                        ["Model", "MSE", "MAE", "RMSE", "R²"],
                        ["Linear Regression", f"{mse:.2f}", f"{mae:.2f}", f"{rmse:.2f}", f"{r2:.2f}"],
                    ],
                    loc="center",
                    cellLoc="center",
                )
                table.scale(1, 2)
                pp.savefig(fig); plt.close(fig)

                # 2️⃣ Feature Importance
                std_X = np.std(X_train, axis=0)
                std_y = np.std(y_train)
                importance = model.coef_ * std_X / std_y
                fig, ax = plt.subplots(figsize=(8, 4))
                ax.bar(independent_vars, importance)
                ax.set_ylabel("Standardized Coefficient")
                ax.set_title("Feature Importance")
                plt.xticks(rotation=45)
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

                # 3️⃣ Residual Distribution (Normal Curve)
                fig, ax = plt.subplots(figsize=(6, 4))
                sns.histplot(residuals, kde=True, ax=ax)
                ax.set_title("Residual Distribution (Normal Curve)")
                ax.set_xlabel("Residual")
                ax.set_ylabel("Frequency")
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

                # 4️⃣ T-test on Residuals
                t_stat, p_val = stats.ttest_1samp(residuals, 0)
                fig, ax = plt.subplots(figsize=(6, 2))
                ax.axis("off")
                ax.text(
                    0.5, 0.5,
                    f"T-test on Residuals:\nT-statistic = {t_stat:.4f}\nP-value = {p_val:.4f}",
                    fontsize=12, ha="center", va="center"
                )
                pp.savefig(fig); plt.close(fig)

                # 5️⃣ Distribution of Each Independent Variable
                for col in independent_vars:
                    try:
                        fig, ax = plt.subplots(figsize=(6, 4))
                        sns.histplot(df_valid[col], kde=True, ax=ax)
                        ax.set_title(f"Distribution of '{col}'")
                        ax.set_xlabel(col)
                        ax.set_ylabel("Frequency")
                        plt.tight_layout()
                        pp.savefig(fig); plt.close(fig)
                    except Exception as e:
                        print(f"Failed to plot {col}: {e}")

                # 6️⃣ Actual vs Predicted Scatter Plot
                fig, ax = plt.subplots(figsize=(6, 6))
                ax.scatter(y_test, preds, alpha=0.6)
                ax.plot([min(y_test), max(y_test)], [min(y_test), max(y_test)], "k--", lw=1.5)
                ax.set_xlabel("Actual Values")
                ax.set_ylabel("Predicted Values")
                ax.set_title("Actual vs Predicted Scatter Plot")
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

            # ✅ Predict safely and export shapefile
            df_full["prediction"] = np.nan
            X_scaled_valid = scaler.transform(df_valid[independent_vars])
            preds_valid = model.predict(X_scaled_valid)
            df_full.loc[df_valid.index, "prediction"] = preds_valid
            gdf["prediction"] = df_full["prediction"]

            shp_pred_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shp_pred_dir, exist_ok=True)
            shp_pred_path = os.path.join(shp_pred_dir, "predicted_output.shp")
            gdf.to_file(shp_pred_path)

            zip_out = os.path.join(export_path, "predicted_output.zip")
            with zfmod.ZipFile(zip_out, "w", zfmod.ZIP_DEFLATED) as z:
                for root, _, files in os.walk(shp_pred_dir):
                    for f in files:
                        z.write(os.path.join(root, f), f)

            # ✅ Return download URLs
            base_url = "/api/linear-regression/download"
            return {
                "metrics": {"R²": r2, "MSE": mse, "MAE": mae, "RMSE": rmse},
                "downloads": {
                    "model": f"{base_url}?file={model_path}",
                    "report": f"{base_url}?file={pdf_path}",
                    "shapefile": f"{base_url}?file={zip_out}",
                },
                "message": "Model trained successfully and files ready for download.",
            }

    except Exception as e:
        print(f"❌ ZIP training error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})

# ============================================================
# 🔹 4. Run Saved Model (apply pre-trained .pkl model on new shapefile)
# ============================================================
@router.post("/run-saved-model")
async def run_saved_model(
    model_file: UploadFile,
    shapefiles: list[UploadFile] = None,
    zip_file: UploadFile = None
):
    import zipfile as zfmod
    import numpy as np
    import seaborn as sns
    import matplotlib.pyplot as plt
    from matplotlib.backends.backend_pdf import PdfPages
    from scipy import stats

    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            # ✅ Step 1: Save model
            model_path = os.path.join(tmpdir, model_file.filename)
            with open(model_path, "wb") as out:
                out.write(await model_file.read())
            model_data = joblib.load(model_path)
            model, scaler, features = model_data["model"], model_data["scaler"], model_data["features"]

            # ✅ Step 2: Handle shapefile input (ZIP or individual files)
            if zip_file and shapefiles:
                return JSONResponse(status_code=400, content={"error": "Please upload either a ZIP or shapefile components, not both."})

            if zip_file:
                zip_path = os.path.join(tmpdir, zip_file.filename)
                with open(zip_path, "wb") as out:
                    out.write(await zip_file.read())

                with zfmod.ZipFile(zip_path, "r") as archive:
                    archive.extractall(tmpdir)

                shp_files = [os.path.join(root, f) for root, _, files in os.walk(tmpdir) for f in files if f.endswith(".shp")]
                if len(shp_files) == 0:
                    return JSONResponse(status_code=400, content={"error": "No .shp file found in ZIP."})
                if len(shp_files) > 1:
                    return JSONResponse(status_code=400, content={"error": "Multiple shapefiles detected. Please upload only one shapefile set."})
                shp_path = shp_files[0]

            elif shapefiles:
                for f in shapefiles:
                    with open(os.path.join(tmpdir, f.filename), "wb") as out:
                        out.write(await f.read())
                shp_path = next((os.path.join(tmpdir, f.filename) for f in shapefiles if f.filename.endswith(".shp")), None)
                if not shp_path:
                    return JSONResponse(status_code=400, content={"error": "No .shp file found among components."})
            else:
                return JSONResponse(status_code=400, content={"error": "No shapefile or ZIP provided."})

            # ✅ Step 3: Read shapefile
            gdf = gpd.read_file(shp_path)
            df = pd.DataFrame(gdf.drop(columns="geometry", errors="ignore"))

            # ✅ Step 4: Check required features
            missing_features = [f for f in features if f not in df.columns]
            if missing_features:
                return JSONResponse(status_code=400, content={"error": f"Missing features in shapefile: {missing_features}"})

            # ✅ Step 5: Prepare and predict
            df_features = df[features].copy()
            for col in features:
                df_features[col] = pd.to_numeric(df_features[col], errors="coerce")
            df_features = df_features.fillna(0)

            X_scaled = scaler.transform(df_features.values)
            preds = model.predict(X_scaled)
            gdf["prediction"] = preds

            # ✅ Optional residuals (if dependent var exists)
            dependent_var = model_data.get("dependent_var") if "dependent_var" in model_data else None
            if not dependent_var:
                possible_targets = [c for c in df.columns if c.lower() not in [f.lower() for f in features]]
                dependent_var = possible_targets[0] if possible_targets else None

            residuals = None
            if dependent_var and dependent_var in df.columns:
                df[dependent_var] = pd.to_numeric(df[dependent_var], errors="coerce")
                residuals = df[dependent_var] - preds
                gdf["residual"] = residuals

            # ✅ Step 6: Create export directory
            export_id = f"run_{np.random.randint(100000, 999999)}"
            export_path = os.path.join(EXPORT_DIR, export_id)
            os.makedirs(export_path, exist_ok=True)

            # ✅ Step 7: Save output shapefile + ZIP
            shp_pred_dir = os.path.join(export_path, "predicted_shapefile")
            os.makedirs(shp_pred_dir, exist_ok=True)
            shp_pred_path = os.path.join(shp_pred_dir, "predicted_output.shp")
            gdf.to_file(shp_pred_path)

            zip_out = os.path.join(export_path, "predicted_output.zip")
            with zfmod.ZipFile(zip_out, "w", zfmod.ZIP_DEFLATED) as z:
                for root, _, files in os.walk(shp_pred_dir):
                    for f in files:
                        z.write(os.path.join(root, f), f)

            # ✅ Step 8: Create detailed PDF report (Tkinter-style)
            pdf_path = os.path.join(export_path, "run_report.pdf")
            with PdfPages(pdf_path) as pp:
                # 1️⃣ Header Summary
                fig, ax = plt.subplots(figsize=(7, 2))
                ax.axis("off")
                summary_text = f"Predictions generated successfully\n{len(preds)} records processed."
                ax.text(0.5, 0.5, summary_text, ha="center", va="center", fontsize=14, weight="bold")
                pp.savefig(fig); plt.close(fig)

                # 2️⃣ Model Features Used
                fig, ax = plt.subplots(figsize=(7, 3))
                ax.axis("off")
                features_text = "Model Features Used:\n" + "\n".join(f"- {f}" for f in features)
                ax.text(0.02, 0.95, features_text, ha="left", va="top", fontsize=11)
                pp.savefig(fig); plt.close(fig)

                # 3️⃣ Prediction Statistics
                pred_stats = {
                    "Min": np.min(preds),
                    "Max": np.max(preds),
                    "Mean": np.mean(preds),
                    "Median": np.median(preds),
                    "Std. Dev.": np.std(preds),
                }
                fig, ax = plt.subplots(figsize=(7, 1.5))
                ax.axis("off")
                table_data = [["Statistic", "Value"]] + [[k, f"{v:.4f}"] for k, v in pred_stats.items()]
                table = ax.table(cellText=table_data, loc="center", cellLoc="center")
                table.scale(1, 2)
                pp.savefig(fig); plt.close(fig)

                # 4️⃣ Distribution of Predicted Values
                fig, ax = plt.subplots(figsize=(7, 4))
                sns.histplot(preds, bins=20, kde=True, color="skyblue", ax=ax)
                ax.set_title("Distribution of Predicted Values", fontsize=12)
                ax.set_xlabel("Predicted Value")
                ax.set_ylabel("Frequency")
                plt.tight_layout()
                pp.savefig(fig); plt.close(fig)

                # 5️⃣ If dependent variable exists → T-test + Residual plots + Feature distributions
                if residuals is not None and len(residuals.dropna()) > 0:
                    # --- T-test on residuals
                    t_stat, p_val = stats.ttest_1samp(residuals.dropna(), 0)
                    fig, ax = plt.subplots(figsize=(6, 2))
                    ax.axis("off")
                    ax.text(
                        0.5, 0.5,
                        f"T-test on Residuals:\nT-statistic = {t_stat:.4f}\nP-value = {p_val:.4f}",
                        fontsize=12, ha="center", va="center"
                    )
                    pp.savefig(fig); plt.close(fig)

                    # --- Residual Distribution (Normal Curve)
                    fig, ax = plt.subplots(figsize=(7, 4))
                    sns.histplot(residuals.dropna(), kde=True, color="lightgreen", ax=ax)
                    ax.set_title("Residual Distribution (Normal Curve)")
                    ax.set_xlabel("Residual")
                    ax.set_ylabel("Frequency")
                    plt.tight_layout()
                    pp.savefig(fig); plt.close(fig)

                # 6️⃣ Distribution of each independent variable
                for col in features:
                    try:
                        fig, ax = plt.subplots(figsize=(6, 4))
                        sns.histplot(df[col].dropna(), kde=True, color="lightblue", ax=ax)
                        ax.set_title(f"Distribution of '{col}'")
                        ax.set_xlabel(col)
                        ax.set_ylabel("Frequency")
                        plt.tight_layout()
                        pp.savefig(fig); plt.close(fig)
                    except Exception as e:
                        fig, ax = plt.subplots(figsize=(6, 2))
                        ax.axis("off")
                        ax.text(0.5, 0.5, f"Could not plot {col}: {e}", ha="center", va="center")
                        pp.savefig(fig); plt.close(fig)

                # 7️⃣ Scatter Plot (Actual vs Predicted if target available)
                if dependent_var and dependent_var in df.columns:
                    fig, ax = plt.subplots(figsize=(6, 6))
                    ax.scatter(df[dependent_var], preds, alpha=0.6)
                    ax.plot(
                        [min(df[dependent_var]), max(df[dependent_var])],
                        [min(df[dependent_var]), max(df[dependent_var])],
                        "k--", lw=1.5
                    )
                    ax.set_xlabel("Actual Values")
                    ax.set_ylabel("Predicted Values")
                    ax.set_title("Actual vs Predicted Scatter Plot")
                    plt.tight_layout()
                    pp.savefig(fig); plt.close(fig)

            # ✅ Step 9: Return download links
            base_url = "/api/linear-regression/download"
            return {
                "message": "Predictions completed successfully.",
                "downloads": {
                    "report": f"{base_url}?file={pdf_path}",
                    "shapefile": f"{base_url}?file={zip_out}"
                },
                "record_count": len(preds),
            }

    except Exception as e:
        print(f"❌ Run Saved Model error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})


# ============================================================
# 🔹 4. File Download Endpoint (Persistent / No Auto Delete)
# ============================================================
@router.get("/download")
async def download_file(file: str = Query(...)):
    """
    Serve generated model/report/shapefile for download.
    Files are stored permanently in EXPORT_DIR and are never deleted automatically.
    """
    try:
        if not os.path.exists(file):
            return JSONResponse(status_code=404, content={"error": "File not found."})

        filename = os.path.basename(file)
        print(f"📤 Serving persistent file download: {file}")

        # ✅ Just serve file — no cleanup or auto-delete
        return FileResponse(
            path=file,
            filename=filename,
            media_type="application/octet-stream"
        )

    except Exception as e:
        print(f"❌ Persistent download error: {e}")
        return JSONResponse(status_code=500, content={"error": str(e)})
