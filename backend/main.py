from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os
import uvicorn

from auth.routes import router as auth_router  # ADD THIS LINE
from admin.routes import router as admin_router 
from routes.view import router as view_router
from routes.edit import router as edit_router
from routes.consolidate import router as merge_router
from routes.subdivide import router as subdivide_router
from routes.matchingreport import router as matchingreport
from routes.TMCR import router as TMCR
from routes.thematic import router as thematic_router
from routes.tableinfo import router as tableinfo_router
from routes.landmarks import router as landmark_router
from routes.search import router as search_router
from routes.GeoServerAccess import router as GeoServerAccess_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(admin_router)
app.include_router(view_router, prefix="/api")
app.include_router(search_router, prefix="/api")
app.include_router(edit_router, prefix="/api")
app.include_router(merge_router, prefix="/api")
app.include_router(subdivide_router, prefix="/api")
app.include_router(matchingreport, prefix="/api")
app.include_router(TMCR, prefix="/api")
app.include_router(GeoServerAccess_router, prefix="/api")
app.include_router(landmark_router, prefix="/api")
app.include_router(thematic_router, prefix="/api")
app.include_router(tableinfo_router, prefix="/api")

@app.get("/health")
def health():
    return {"message": "API is up"}

app.mount("/", StaticFiles(directory="static", html=True), name="static")

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)