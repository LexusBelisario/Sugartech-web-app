from fastapi import APIRouter
from .xgb_fields import router as fields_router
from .xgb_train import router as train_router
from .xgb_run_model import router as run_router
from .xgb_downloads import router as download_router
from .xgb_preview_geojson import router as preview_router   # 🆕 Add this

router = APIRouter(prefix="/xgb", tags=["XGBoost"])

router.include_router(fields_router)
router.include_router(train_router)
router.include_router(run_router)
router.include_router(download_router)
router.include_router(preview_router)   # 🆕 Add this
