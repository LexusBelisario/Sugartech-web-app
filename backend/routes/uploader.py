from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, Query
from typing import List, Tuple
from sqlalchemy.engine import Engine
import geopandas as gpd
import tempfile
import os
import json
from fastapi.responses import JSONResponse
import traceback
import psycopg2
from typing import Generator
router = APIRouter()
from db import get_dbinfo
from sqlalchemy import create_engine
from psycopg2 import sql 
# Dependency function for session-aware DB connection

def get_db_conn_and_engine() -> Generator[Tuple[psycopg2.extensions.connection, Engine], None, None]:
    dbinfo = get_dbinfo()  # get actual credentials
    
    conn = psycopg2.connect(
        dbname=dbinfo.dbname,
        user=dbinfo.user,
        password=dbinfo.password,
        host=dbinfo.host,
        port=dbinfo.port
    )
    
    engine_url = f"postgresql+psycopg2://{dbinfo.user}:{dbinfo.password}@{dbinfo.host}:{dbinfo.port}/{dbinfo.dbname}"
    engine = create_engine(engine_url)

    try:
        yield conn, engine
    finally:
        conn.close()
        engine.dispose()

def get_schema_from_conn(conn: psycopg2.extensions.connection) -> str:
    return conn.info.dbname  # Using dbname as schema name


@router.get("/schemas")
async def get_schemas(dep: Tuple[psycopg2.extensions.connection, Engine] = Depends(get_db_conn_and_engine)):
    conn, _ = dep
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT schema_name FROM information_schema.schemata
                WHERE schema_name NOT IN ('information_schema','pg_catalog','pg_toast','public')
                ORDER BY schema_name;
            """)
            schemas = [row[0] for row in cur.fetchall()]
            return {"schemas": schemas}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/create-schema")
async def create_schema(
    schema_name: str = Form(...),
    dep: Tuple[psycopg2.extensions.connection, Engine] = Depends(get_db_conn_and_engine)
):
    conn, _ = dep
    if not schema_name.strip():
        raise HTTPException(status_code=400, detail="Schema name cannot be empty")
    try:
        with conn.cursor() as cur:
            cur.execute(f'CREATE SCHEMA IF NOT EXISTS "{schema_name}";')
            conn.commit()
        return {"message": f"Schema '{schema_name}' created"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-shapefiles")
async def import_shapefiles(
    shapefiles: List[UploadFile] = File(...),
    dep: Tuple[psycopg2.extensions.connection, Engine] = Depends(get_db_conn_and_engine)
):
    conn, engine = dep
    schema = get_schema_from_conn(conn)

    try:
        create_transaction_log_table(schema, conn)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create transaction log table: {e}")

    for shapefile in shapefiles:
        try:
            with tempfile.TemporaryDirectory() as tmpdir:
                file_path = os.path.join(tmpdir, shapefile.filename)
                with open(file_path, "wb") as f:
                    f.write(await shapefile.read())

                extracted_paths = []

                if shapefile.filename.endswith(".zip"):
                    import zipfile
                    with zipfile.ZipFile(file_path, "r") as zip_ref:
                        zip_ref.extractall(tmpdir)
                    extracted_paths = [
                        os.path.join(tmpdir, f)
                        for f in os.listdir(tmpdir)
                        if f.endswith(".shp")
                    ]
                    if not extracted_paths:
                        raise HTTPException(status_code=400, detail=f"No .shp file found in {shapefile.filename}")
                elif shapefile.filename.endswith(".shp"):
                    extracted_paths = [file_path]
                else:
                    raise HTTPException(status_code=400, detail=f"Unsupported file type: {shapefile.filename}")

                for shp_path in extracted_paths:
                    gdf = gpd.read_file(shp_path)
                    if gdf.crs and gdf.crs.to_epsg() != 4326:
                        gdf = gdf.to_crs(epsg=4326)
                    gdf.columns = [c.lower() for c in gdf.columns]
                    gdf = gdf.rename_geometry("geom")
                    table_name = os.path.splitext(os.path.basename(shp_path))[0]

                    gdf.to_postgis(name=table_name, con=engine, schema=schema, if_exists="fail", index=False)

        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to import {shapefile.filename}: {e}")

    return {"message": "All shapefiles imported successfully"}


@router.get("/features")
async def get_features(
    table: str = Query(...),
    schema: str = Query(...),  # ← Accept schema from the client
    dep: Tuple[psycopg2.extensions.connection, Engine] = Depends(get_db_conn_and_engine)
):
    conn, _ = dep

    try:
        with conn.cursor() as cur:
            from psycopg2 import sql  # Use psycopg2.sql

            query = sql.SQL("""
                SELECT
                    ST_AsGeoJSON(geom) AS geom_json,
                    to_jsonb(t) - 'geom' AS properties
                FROM (
                    SELECT * FROM {}.{}
                    WHERE geom IS NOT NULL
                ) AS t
            """).format(
                sql.Identifier(schema),
                sql.Identifier(table)
            )

            cur.execute(query)
            rows = cur.fetchall()

            features = []
            for row in rows:
                geom_json = row[0]
                props_json = row[1]

                if not geom_json:
                    continue

                try:
                    geometry = json.loads(geom_json)
                except json.JSONDecodeError:
                    continue

                features.append({
                    "type": "Feature",
                    "geometry": geometry,
                    "properties": props_json or {}
                })

            return JSONResponse(content={
                "type": "FeatureCollection",
                "features": features
            })

    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error loading features: {str(e)}")
@router.get("/createTables")
async def get_tables(
    schema: str = Query(...),
    dep: Tuple[psycopg2.extensions.connection, Engine] = Depends(get_db_conn_and_engine)
):
    conn, _ = dep

    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = %s
                ORDER BY table_name;
            """, (schema,))
            tables = [row[0] for row in cur.fetchall()]
            return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def create_transaction_log_table(schema, conn):
    with conn.cursor() as cur:
        cur.execute(
            f'''CREATE TABLE IF NOT EXISTS "{schema}".parcel_transaction_log (
                id SERIAL PRIMARY KEY,
                table_name TEXT,
                transaction_type TEXT,
                transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                pin TEXT,
                province TEXT,
                municipal TEXT,
                prov_code TEXT,
                mun_code TEXT,
                barangay TEXT,
                brgy_code TEXT,
                section TEXT,
                parcel TEXT,
                vicinity TEXT,
                class_bir TEXT,
                value TEXT,
                land_arpn TEXT,
                tct_no TEXT,
                survey_no TEXT,
                updte_code TEXT,
                blk_no TEXT,
                td_no TEXT,
                lot_no TEXT,
                l_acctno TEXT,
                l_lastname TEXT,
                l_frstname TEXT,
                l_midname TEXT,
                l_ownadd TEXT,
                l_owndist TEXT,
                l_ownmuni TEXT,
                l_ownbrgy TEXT,
                l_ownprov TEXT,
                l_ownzip TEXT,
                l_owntel TEXT,
                north TEXT,
                south TEXT,
                east TEXT,
                west TEXT,
                extent TEXT,
                l_prvarp TEXT,
                l_prvpin TEXT,
                l_prvowner TEXT,
                effectvty TEXT,
                l_prvav TEXT,
                land_sbcls TEXT,
                land_area TEXT,
                land_uv TEXT,
                land_mval TEXT,
                land_desc TEXT,
                adj_rate TEXT,
                adj_val TEXT,
                land_areat TEXT,
                land_totmv TEXT,
                land_aslvl TEXT,
                land_asval TEXT,
                land_totav TEXT,
                bldg_pin TEXT,
                mach_pin TEXT,
                bldg_arpn TEXT,
                cct TEXT,
                bldg_class TEXT,
                bldg_sbcls TEXT,
                bldg_age TEXT,
                bldg_areat TEXT,
                bldg_area TEXT,
                bldg_uv TEXT,
                bldg_mval TEXT,
                bldg_drate TEXT,
                bldg_dval TEXT,
                bldg_mval2 TEXT,
                bldg_dmv TEXT,
                bldg_ause TEXT,
                bldg_aslvl TEXT,
                bldg_asval TEXT,
                b_prvarp TEXT,
                b_prvpin TEXT,
                b_prvowner TEXT,
                b_effectvt TEXT,
                mach_arpn TEXT,
                mach_desc TEXT,
                mach_units TEXT,
                mach_cost TEXT,
                mach_ause TEXT,
                mach_mval2 TEXT,
                mach_level TEXT,
                mach_adjmv TEXT,
                mach_totav TEXT,
                m_prvarp TEXT,
                m_prvpin TEXT,
                m_prvowner TEXT,
                m_prvav TEXT,
                m_effectvt TEXT,
                tax_year TEXT,
                paymt_type TEXT,
                or_no TEXT,
                or_date TEXT,
                pay_period TEXT,
                qtr_no TEXT,
                basic_prin TEXT,
                basic_int TEXT,
                basic_disc TEXT,
                basictotal TEXT,
                sef_prin TEXT,
                sef_int TEXT,
                sef_disc TEXT,
                sef_total TEXT,
                street TEXT,
                perimeter TEXT,
                enclosed_a TEXT,
                b_prvav TEXT,
                mach_mval TEXT,
                b_acctno TEXT,
                b_lastname TEXT,
                b_frstname TEXT,
                b_midname TEXT,
                b_ownadd TEXT,
                b_owndist TEXT,
                b_ownmuni TEXT,
                b_ownbrgy TEXT,
                b_ownprov TEXT,
                b_ownzip TEXT,
                b_owntel TEXT,
                m_acctno TEXT,
                m_lastname TEXT,
                m_frstname TEXT,
                m_midname TEXT,
                m_ownadd TEXT,
                m_owndist TEXT,
                m_ownmuni TEXT,
                m_owndbrgy TEXT,
                m_ownprov TEXT,
                m_ownzip TEXT,
                m_owntel TEXT,
                cad_no TEXT,
                land_ause TEXT,
                land_class TEXT,
                ownership TEXT,
                geom GEOMETRY
            );
            '''
        )
        conn.commit()
