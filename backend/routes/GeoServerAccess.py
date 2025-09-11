from fastapi import APIRouter, Request, Response, Depends
from auth.dependencies import get_current_user
from auth.models import User
import requests
import os

router = APIRouter()

# GeoServer settings
GEOSERVER_URL = "http://localhost:8080/geoserver/Calauan_Aerial_Photos/wms"
GEOSERVER_USER = os.getenv("admin")
GEOSERVER_PASS = os.getenv("geoserver")

@router.get("/wms-proxy")
async def wms_proxy(
    request: Request,
    current_user: User = Depends(get_current_user)
    ):
    params = dict(request.query_params)

    r = requests.get(
        GEOSERVER_URL,
        params=params,
        auth=(GEOSERVER_USER, GEOSERVER_PASS),
        stream=True
    )

    return Response(content=r.content, media_type=r.headers.get("Content-Type"))
