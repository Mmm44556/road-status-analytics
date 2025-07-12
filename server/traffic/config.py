import os
from dotenv import load_dotenv

load_dotenv()

A1_JSON_URL = os.getenv("ENV_A1_JSON_URL")
A2_ZIP_URL = os.getenv("ENV_A2_ZIP_URL")
A3_JSON_URL = os.getenv("ENV_A3_JSON_URL") 