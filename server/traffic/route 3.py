from datetime import datetime, timedelta
from fastapi import APIRouter, Request
from pydantic import BaseModel
import requests
import json
import zipfile
import io
import os
import pandas as pd
from fastapi.responses import JSONResponse, StreamingResponse
from server.traffic.accident_data_aggregator import aggregate_data_from_raw
from dotenv import load_dotenv
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
import concurrent.futures
load_dotenv()
A1_JSON_URL = os.getenv("ENV_A1_JSON_URL")
A2_ZIP_URL = os.getenv("ENV_A2_ZIP_URL")
A3_JSON_URL = os.getenv("ENV_A3_JSON_URL")
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

def is_cache_valid(cache_file):
    if not os.path.exists(cache_file):
        return False
    mtime = datetime.fromtimestamp(os.path.getmtime(cache_file))
    return datetime.now() - mtime < timedelta(seconds=CACHE_EXPIRE_SECONDS)

@router.post("/A1")
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

@router.get("/A2")
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

@router.get("/A2/zip")
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

@router.get("/A3")
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

@router.get("/all")
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


@router.post("/aggregate")
async def get_aggregated_data(data: TrafficEvent):

    try:
        def fetch_a1():
            response = requests.get(A1_JSON_URL, verify=False)
            columns = [
    "發生年度", "發生月份", "發生日期", "發生時間", "事故類別名稱", "處理單位名稱警局層", "發生地點", "天候名稱", "光線名稱",
    "道路類別-第1當事者-名稱", "速限-第1當事者", "道路型態大類別名稱", "道路型態子類別名稱", "事故位置大類別名稱", "事故位置子類別名稱",
    "路面狀況-路面鋪裝名稱", "路面狀況-路面狀態名稱", "路面狀況-路面缺陷名稱", "道路障礙-障礙物名稱", "道路障礙-視距品質名稱", "道路障礙-視距名稱",
    "號誌-號誌種類名稱", "號誌-號誌動作名稱", "車道劃分設施-分向設施大類別名稱", "車道劃分設施-分向設施子類別名稱", "車道劃分設施-分道設施-快車道或一般車道間名稱",
    "車道劃分設施-分道設施-快慢車道間名稱", "車道劃分設施-分道設施-路面邊線名稱", "事故類型及型態大類別名稱", "事故類型及型態子類別名稱",
    "肇因研判大類別名稱-主要", "肇因研判子類別名稱-主要", "死亡受傷人數", "當事者順位", "當事者區分-類別-大類別名稱-車種", "當事者區分-類別-子類別名稱-車種",
    "當事者屬-性-別名稱", "當事者事故發生時年齡", "保護裝備名稱", "行動電話或電腦或其他相類功能裝置名稱", "當事者行動狀態大類別名稱", "當事者行動狀態子類別名稱",
    "車輛撞擊部位大類別名稱-最初", "車輛撞擊部位子類別名稱-最初", "車輛撞擊部位大類別名稱-其他", "車輛撞擊部位子類別名稱-其他", "肇因研判大類別名稱-個別",
    "肇因研判子類別名稱-個別", "肇事逃逸類別名稱-是否肇逃", "經度", "緯度"
]
            df = pd.read_csv(
            io.StringIO(response.text),
            names=columns,
            header=None,
            encoding='utf-8',   # 或 utf-8-sig、big5，看你的檔案
            skipfooter=2,       # 跳過最後兩行
            engine='python'
            )
            # 清理欄位名稱與內容
            df.columns = df.columns.str.strip().str.replace('\ufeff', '')
            df = df.applymap(lambda x: x.strip() if isinstance(x, str) else x)
            
            # 把所有 NaN 轉成空字串
            df = df.fillna('')

            return df.to_dict(orient='records')


        def fetch_a2():
            response = requests.get(A2_ZIP_URL, verify=False)
            response.raise_for_status()
            z = zipfile.ZipFile(io.BytesIO(response.content))
            json_filename = [f for f in z.namelist() if f.endswith('.json')][0]
            json_str = z.read(json_filename).decode('utf-8')
            return json.loads(json_str)

        def fetch_a3():
            response = requests.get(A3_JSON_URL, verify=False)
            response.raise_for_status()
            return response.json()

        with concurrent.futures.ThreadPoolExecutor() as executor:
            future_a1 = executor.submit(fetch_a1)
            future_a2 = executor.submit(fetch_a2)
            future_a3 = executor.submit(fetch_a3)
            try:
                a1_data = future_a1.result()
                print(a1_data)
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

            # data = aggregate_data_from_raw(a1_data, a2_data, a3_data)
            return JSONResponse({"data":a1_data})

        

             
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)