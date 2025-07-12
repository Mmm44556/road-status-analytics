import requests
import zipfile
import io
import json
from server.traffic.config import A1_JSON_URL, A2_ZIP_URL, A3_JSON_URL

# A1
def fetch_a1():
            response = requests.get(A1_JSON_URL, verify=False)
            data = response.json()
            # 取出 records 欄位
            records = data.get("result", {}).get("records", [])
            return records


# A2
def fetch_a2():
            response = requests.get(A2_ZIP_URL, verify=False)
            response.raise_for_status()
            z = zipfile.ZipFile(io.BytesIO(response.content))
            json_filename = [f for f in z.namelist() if f.endswith('.json')][0]
            json_str = z.read(json_filename).decode('utf-8')
            return json.loads(json_str)

# A3
def fetch_a3():
            response = requests.get(A3_JSON_URL, verify=False)
            response.raise_for_status()
            return response.json()