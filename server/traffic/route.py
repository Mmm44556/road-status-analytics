from datetime import datetime, timedelta
from fastapi import APIRouter, Request, Query   
from pydantic import BaseModel
import requests
import json
import zipfile
import io
import os
import pandas as pd
from fastapi.responses import JSONResponse, StreamingResponse
from server.traffic.accident_data_aggregator import aggregate_data_from_raw
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import concurrent.futures
from server.traffic.utils.eventReader import fetch_a1, fetch_a2, fetch_a3
from server.traffic.utils.index import is_cache_valid
from server.traffic.config import A1_JSON_URL, A2_ZIP_URL, A3_JSON_URL
import re
# event_id: A1, A2, A3, All
# event_type: 1: 交通事故, 2: 施工, 3: 其他
# start_time: 事件開始時間 (YYYY-MM-DD) 預設當月
# end_time: 事件結束時間 (YYYY-MM-DD) 預設當月
# location: 事件地點

class TrafficEvent(BaseModel):
    eventType: str
    startTime: str
    endTime: str
    location: str
    
class TrafficEventResponse(BaseModel):
    data: dict[str, list[dict]]

   


router = APIRouter(prefix="/traffic", tags=["traffic"],)

CACHE_DIR = "./server/traffic/cache"
os.makedirs(CACHE_DIR, exist_ok=True)

CACHE_EXPIRE_SECONDS = 120  # 2分鐘

def get_cache_filename(accident_type):
    return os.path.join(CACHE_DIR, f"{accident_type}_cache.json")

def is_cache_valid(cache_file,expire_seconds=CACHE_EXPIRE_SECONDS):
    if not os.path.exists(cache_file):
        return False
    mtime = datetime.fromtimestamp(os.path.getmtime(cache_file))
    return datetime.now() - mtime < timedelta(seconds=expire_seconds)

@router.post("/events/A1")
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

@router.get("/events/A2")
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

@router.get("/events/A2/zip")
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

@router.get("/events/A3")
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


# 合併 A1, A2, A3 資料
@router.get("/events/summary")
async def get_aggregated_data():
    cache_file = os.path.join(CACHE_DIR, "aggregate_cache.json")
    CACHE_EXPIRE_SECONDS = 600
    

    try:
        # 1. 先檢查 cache  
        if is_cache_valid(cache_file, CACHE_EXPIRE_SECONDS):
            with open(cache_file, 'r', encoding='utf-8') as f:
                return JSONResponse(json.load(f))
            
        # 2. 如果 cache 過期，則重新 fetch 資料
        a1_data, a2_data, a3_data= get_cache_file_with_concurrent()
        data = aggregate_data_from_raw(a1_data, a2_data, a3_data)
        result = {"data": data}
        # 將結果寫入 cache
        with open(cache_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False)
        return JSONResponse(result)
        
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
    
# 全國縣市排名 ( 發生日期+發生地點 = 重複事件)

@router.get("/summary/city-rank")
def get_city_rank(
    startTime: str = Query(None),
    endTime: str = Query(None),
    eventType: str = Query(None)
):
    a1_data, a2_data, a3_data = get_cache_file_with_concurrent()
    a2_records = extract_records(a2_data, "A2")

    a3_records = extract_records(a3_data, "A3")

    
    with concurrent.futures.ThreadPoolExecutor() as executor:
        future_a1_city_rank = executor.submit(get_city_rank, "A1", a1_data)
        future_a2_city_rank = executor.submit(get_city_rank, "A2", a2_records)
        future_a3_city_rank = executor.submit(get_city_rank, "A3", a3_records)
        a1_city_rank = future_a1_city_rank.result()
        a2_city_rank = future_a2_city_rank.result()
        a3_city_rank = future_a3_city_rank.result()
    city_rank = merge_city_ranks(a1_city_rank, a2_city_rank, a3_city_rank)
    
    # 過濾掉縣市為空的資料
    city_rank_filtered = [item for item in city_rank if item["city"]]
    
    return JSONResponse(city_rank_filtered)
    # 1. 取得聚合後資料
    # 2. 過濾條件
    # 3. 以縣市 group by 排序
    return 

@router.get("/summary/city/{city}/road-rank")
def get_road_rank(
    city: str,
    startTime: str = Query(None),
    endTime: str = Query(None),
    eventType: str = Query(None)
):
    # 1. 取得聚合後資料
    # 2. 過濾條件
    # 3. 以路段 group by 排序
    return 


def get_cache_file_with_concurrent():
    with concurrent.futures.ThreadPoolExecutor() as executor:
                future_a1 = executor.submit(fetch_a1)
                future_a2 = executor.submit(fetch_a2)
                future_a3 = executor.submit(fetch_a3)
                try:
                    a1_data = future_a1.result()
                except Exception as e:
                    print("A1 解析失敗：", e)
                    a1_data = None
                try:
                    a2_data = future_a2.result()
                    
                except Exception as e:
                    print("A2 解析失敗：", e)
                    a2_data = None
                try:
                    a3_data = future_a3.result()
                except Exception as e:
                    print("A3 解析失敗：", e)
                    a3_data = None
                return a1_data, a2_data, a3_data
            
            
def get_city_rank(type,records):
    df = pd.DataFrame(records)
    # 只保留一事故一筆（以發生日期+發生地點去重）
    if type == "A1" or type == "A2":
        df_unique = df.drop_duplicates(subset=["發生日期", "發生地點"])
    elif type == "A3":
        df_unique = df.drop_duplicates(subset=["ACCYMD", "PLACE"])
    
    # 取出縣市
    if type == "A1" or type == "A2":
        df_unique["city"] = df_unique["發生地點"].apply(extract_city)
    elif type == "A3":
        df_unique["city"] = df_unique["PLACE"].apply(extract_city)
        
    # group by city
    city_rank = df_unique.groupby("city").size().reset_index(name="count").sort_values("count", ascending=False)
    return city_rank.to_dict(orient="records")

def get_road_rank(type,records, city):
    df = pd.DataFrame(records)
    if type == "A1" or type == "A2":
        df_unique = df.drop_duplicates(subset=["發生日期", "發生地點"])
        df_unique["city"] = df_unique["處理單位名稱警局層"].apply(extract_city)
    elif type == "A3":
        df_unique = df.drop_duplicates(subset=["ACCYMD", "PLACE"])
        df_unique["city"] = df_unique["PLACE"].apply(extract_city)
    # 篩選指定縣市
    df_city = df_unique[df_unique["city"] == city]
    # group by 發生地點
    road_rank = df_city.groupby("發生地點").size().reset_index(name="count").sort_values("count", ascending=False)
    return road_rank.to_dict(orient="records")

def extract_city(place):
    # 只取前三個字作為縣市名稱
    match = re.match(r"([\u4e00-\u9fa5]{2,3}[縣市])", place)
    if match:
        return match.group(1)
    return ""  # fallback: 無法辨識直接排除

def extract_records(data, event_type):
    if event_type == "A1" or event_type == "A2":
        # 假設格式為 {"success": True, "result": {"records": [...]}}
        return data.get("result", {}).get("records", [])
    elif event_type == "A3":
        # 假設格式為 {"success": True, "result": {"records": [...]}}
        return data.get("result", {}).get("records", [])
    return []

def merge_city_ranks(*city_ranks):
    # city_ranks: 多個 [{"縣市": "台北市", "count": 10}, ...] 的 list
    df = pd.DataFrame()
    for rank in city_ranks:
        df = pd.concat([df, pd.DataFrame(rank)], ignore_index=True)
    # group by 縣市，累加 count
    merged = df.groupby("city")["count"].sum().reset_index().sort_values("count", ascending=False)
    return merged.to_dict(orient="records")