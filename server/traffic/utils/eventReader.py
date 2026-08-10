import zipfile
import io
import json
import csv
import ssl
from urllib.request import urlopen
from server.traffic.config import A1_JSON_URL, A2_ZIP_URL, A3_JSON_URL

REQUEST_TIMEOUT = 30


def create_npa_ssl_context():
    context = ssl.create_default_context()
    context.verify_flags &= ~ssl.VERIFY_X509_STRICT
    return context


def download(url: str) -> bytes:
    with urlopen(url, timeout=REQUEST_TIMEOUT, context=create_npa_ssl_context()) as response:
        return response.read()


# A1
def fetch_a1():
    data = json.loads(download(A1_JSON_URL).decode("utf-8-sig"))
    return data.get("result", {}).get("records", [])


# A2
def fetch_a2():
    with zipfile.ZipFile(io.BytesIO(download(A2_ZIP_URL))) as archive:
        json_filename = next(name for name in archive.namelist() if name.endswith(".json"))
        return json.loads(archive.read(json_filename).decode("utf-8-sig"))

# A3
def fetch_a3():
    return parse_a3_csv(download(A3_JSON_URL).decode("utf-8-sig"))


def parse_a3_csv(payload: str):
    records = list(csv.DictReader(io.StringIO(payload)))
    return {"success": True, "result": {"records": records}}
