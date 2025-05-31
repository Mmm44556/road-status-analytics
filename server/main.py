import requests
import json
import zipfile
import io
import os
from fastapi import FastAPI, Response, Request
from fastapi.responses import JSONResponse, StreamingResponse
from datetime import datetime, timedelta
from accident_data_aggregator import aggregate_data_from_raw

import concurrent.futures

app = FastAPI()

A1_JSON_URL = "https://data.moi.gov.tw/MoiOD/System/DownloadFile.aspx?DATA=60C88176-A1FB-4C98-89E2-112F2F3DF861"
A2_ZIP_URL = "https://data.moi.gov.tw/MoiOD/System/DownloadFile.aspx?DATA=B19700FB-2169-43E8-B550-92168B76EF68"
A3_JSON_URL = "https://od.moi.gov.tw/api/v1/rest/datastore/A01010000C-001309-001"

CACHE_DIR = "cache"
os.makedirs(CACHE_DIR, exist_ok=True)

CACHE_EXPIRE_SECONDS = 120  # 2分鐘

def get_cache_filename(accident_type):
    return os.path.join(CACHE_DIR, f"{accident_type}_cache.json")

def is_cache_valid(cache_file):
    if not os.path.exists(cache_file):
        return False
    mtime = datetime.fromtimestamp(os.path.getmtime(cache_file))
    return datetime.now() - mtime < timedelta(seconds=CACHE_EXPIRE_SECONDS)

@app.get("/traffic/A1")
def get_a1_data():
    cache_file = get_cache_filename("A1")
    if is_cache_valid(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return JSONResponse(json.load(f))
    try:
        response = requests.get(A1_JSON_URL, verify=False)
        response.raise_for_status()
        data = response.json()
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/traffic/A2")
def get_a2_data():
    cache_file = get_cache_filename("A2")
    if is_cache_valid(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return JSONResponse(json.load(f))
    try:
        response = requests.get(A2_ZIP_URL, verify=False)
        response.raise_for_status()
        z = zipfile.ZipFile(io.BytesIO(response.content))
        json_filename = [f for f in z.namelist() if f.endswith('.json')][0]
        json_data = json.loads(z.read(json_filename).decode('utf-8'))
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(json_data, f, ensure_ascii=False)
        return JSONResponse(json_data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/traffic/A2/zip")
def get_a2_zip():
    try:
        response = requests.get(A2_ZIP_URL, verify=False)
        response.raise_for_status()
        mem_file = io.BytesIO(response.content)
        mem_file.seek(0)
        return StreamingResponse(mem_file, media_type='application/zip', headers={
            'Content-Disposition': 'attachment; filename="A2_traffic_accident_data.zip"'
        })
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/traffic/A3")
def get_a3_data():
    cache_file = get_cache_filename("A3")
    if is_cache_valid(cache_file):
        with open(cache_file, 'r', encoding='utf-8') as f:
            return JSONResponse(json.load(f))
    try:
        response = requests.get(A3_JSON_URL, verify=False)
        response.raise_for_status()
        data = response.json()
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False)
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/traffic/all")
def get_all_data(request: Request):
    try:
        # FastAPI 啟動時無法直接取得本機 port，預設 5001
        base_url = str(request.base_url).rstrip('/')
        a1_data = requests.get(f"{base_url}/traffic/A1").json()
        a2_data = requests.get(f"{base_url}/traffic/A2").json()
        a3_data = requests.get(f"{base_url}/traffic/A3").json()
        merged_data = {
            "A1": a1_data,
            "A2": a2_data,
            "A3": a3_data,
            "timestamp": datetime.now().isoformat()
        }
        return JSONResponse(merged_data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/traffic/aggregate")
def get_aggregated_data():
    try:
        def fetch_a1():
            response = requests.get(A1_JSON_URL, verify=False)
            response.raise_for_status()
            return response.json()

        def fetch_a2():
            response = requests.get(A2_ZIP_URL, verify=False)
            response.raise_for_status()
            z = zipfile.ZipFile(io.BytesIO(response.content))
            json_filename = [f for f in z.namelist() if f.endswith('.json')][0]
            return json.loads(z.read(json_filename).decode('utf-8'))

        def fetch_a3():
            response = requests.get(A3_JSON_URL, verify=False)
            response.raise_for_status()
            return response.json()

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_a1 = executor.submit(fetch_a1)
            future_a2 = executor.submit(fetch_a2)
            future_a3 = executor.submit(fetch_a3)
            a1_data = future_a1.result()
            a2_data = future_a2.result()
            a3_data = future_a3.result()

        data = aggregate_data_from_raw(a1_data, a2_data, a3_data)
        return JSONResponse(data)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)

@app.get("/")
def home():
    return JSONResponse({
        "name": "交通事故資料代理服務",
        "description": "提供台灣即時交通事故資料的API",
        "endpoints": [
            {"path": "/traffic/A1", "description": "A1類交通事故資料 (死亡車禍)"},
            {"path": "/traffic/A2", "description": "A2類交通事故資料 (受傷車禍)"},
            {"path": "/traffic/A2/zip", "description": "下載A2類交通事故資料的原始ZIP檔案"},
            {"path": "/traffic/A3", "description": "A3類交通事故資料 (財損車禍)"},
            {"path": "/traffic/all", "description": "所有類型的交通事故資料"},
            {"path": "/traffic/aggregate", "description": "聚合所有類型的交通事故資料"}
        ],
        "last_updated": datetime.now().isoformat()
    }) 