import os
from dotenv import load_dotenv

load_dotenv()

A1_JSON_URL = os.getenv("ENV_A1_JSON_URL") or (
    "https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/F4077949-50CC-4640-8114-79958CC8BBEA/resource/0DFEFF78-EAA2-4402-B759-BFCC63B002A7/download"
)
A2_ZIP_URL = os.getenv("ENV_A2_ZIP_URL") or (
    "https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/F713DBFE-7432-4401-B5C0-1C07A8F5B1FB/resource/9DF848E0-23CF-4146-A7B8-DB91A96B2CB9/download"
)
A3_JSON_URL = os.getenv("ENV_A3_JSON_URL") or (
    "https://opdadm.moi.gov.tw/api/v1/no-auth/resource/api/dataset/B66F2542-45AE-4391-ADDD-DC1E4E650F16/resource/67D09417-83CE-440D-9ED5-407415661DAD/download"
)
TDX_CLIENT_ID = os.getenv("TDX_CLIENT_ID", "")
TDX_CLIENT_SECRET = os.getenv("TDX_CLIENT_SECRET", "")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://127.0.0.1:5173,http://localhost:5173",
    ).split(",")
    if origin.strip()
]
