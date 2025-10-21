# backend/Predictive_Model_Tools/GWR/routes.py
from fastapi import APIRouter
from .gwr_fields import router as fields_router
from .gwr_train import router as train_router
from .gwr_run_model import router as run_router
from .gwr_downloads import router as download_router  # ✅ add this line

router = APIRouter(prefix="/gwr", tags=["GWR"])

# Include all GWR-related routers
router.include_router(fields_router)
router.include_router(train_router)
router.include_router(run_router)
router.include_router(download_router)  # ✅ add this line
