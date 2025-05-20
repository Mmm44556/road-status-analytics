import re
from datetime import datetime

def parse_date(date_str):
    # 嘗試多種日期格式
    for fmt in ("%Y-%m-%d", "%Y/%m/%d", "%Y%m%d", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(date_str, fmt).strftime("%Y-%m-%d")
        except Exception:
            continue

    # 處理民國年格式 114年01月01日 06時48分29秒
    match = re.match(r"(\d{2,3})年(\d{1,2})月(\d{1,2})日", date_str)
    if match:
        year = int(match.group(1)) + 1911
        month = int(match.group(2))
        day = int(match.group(3))
        return f"{year:04d}-{month:02d}-{day:02d}"

    return date_str  # fallback