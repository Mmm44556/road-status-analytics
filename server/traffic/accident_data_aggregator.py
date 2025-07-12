import os
import json
from collections import defaultdict
from server.utils.getFirstChars import get_first_n_chars
from server.utils.parseDate import parse_date

CACHE_DIR = "./server/traffic/cache"
os.makedirs(CACHE_DIR, exist_ok=True)  # 確保 cache 目錄存在
A1_FILE =  os.path.join(CACHE_DIR, "A1_cache.json")
A2_FILE = os.path.join(CACHE_DIR, "A2_cache.json")
A3_FILE = os.path.join(CACHE_DIR, "A3_cache.json")

# 自動尋找最新的 A1 檔案
for fname in os.listdir(CACHE_DIR):
    if fname.startswith("A1_") and fname.endswith(".json"):
        if (A1_FILE is None) or (fname > os.path.basename(A1_FILE)):
            A1_FILE = os.path.join(CACHE_DIR, fname)

# 讀取資料

def load_json(path):
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def aggregate_data_from_raw(a1_data, a2_data, a3_data):
    result = defaultdict(lambda: {"A1": 0, "A2": 0, "A3": 0})
    # 處理 A1
    rows = a1_data
    for row in rows:
        if not isinstance(row, dict):
            continue
        date = parse_date(row.get('發生日期') or row.get('發生時間') or row.get('date', ''))
        city = row.get('發生地點')
        city = get_first_n_chars(city)
        if not date or not city:
            continue
        result[(date,city)]["A1"] += 1

    # 處理 A2
    rows = a2_data.get('result', a2_data).get("records", a2_data)
    for row in rows:
        if not isinstance(row, dict):
            continue
        date = parse_date(row.get('發生日期'))
        city = row.get('發生地點')
        city = get_first_n_chars(city)
        if not date or not city:
            continue
        result[(date,city)]["A2"] += 1


    # # 處理 A3
    rows = a3_data.get('result', a3_data).get("records", a3_data)
    for row in rows:
        if not isinstance(row, dict):
            continue
        
        date = parse_date(row.get('ACCYMD'))
        city = row.get('PLACE')
        city = get_first_n_chars(city)
        if not date or not city:
            continue
        result[(date,city)]["A3"] += 1

    # 整理成統一格式
    output = []
    for (date,city), counts in result.items():
    
        total = counts["A1"] + counts["A2"] + counts["A3"]
        output.append({
            "date": date,
            "city": city,
            "A1": counts["A1"],
            "A2": counts["A2"],
            "A3": counts["A3"],
            "total": total,
            "MM": date[5:7],
            "YYYY": date[0:4],
        })
    return output
