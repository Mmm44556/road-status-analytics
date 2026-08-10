import os
from dotenv import load_dotenv

load_dotenv()

A1_JSON_URL = os.getenv("ENV_A1_JSON_URL")
A2_ZIP_URL = os.getenv("ENV_A2_ZIP_URL")
A3_JSON_URL = os.getenv("ENV_A3_JSON_URL")
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
