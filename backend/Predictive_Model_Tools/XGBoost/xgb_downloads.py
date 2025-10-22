from fastapi import APIRouter, Query
from fastapi.responses import FileResponse, JSONResponse
import os

router = APIRouter()

@router.get("/download")
async def download_file(file: str = Query(...)):
    """Serve generated model/report/shapefile for download."""
    try:
        file_path = os.path.abspath(file)
        if not os.path.exists(file_path):
            return JSONResponse(status_code=404, content={"error": f"File not found: {file_path}"})
        return FileResponse(file_path, filename=os.path.basename(file_path))
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
