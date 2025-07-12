from fastapi import FastAPI
from fastapi.responses import JSONResponse
from datetime import datetime
from server.traffic.route import router as traffic_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()
# 允許所有來源（開發階段方便用，正式環境建議指定來源）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或改成 ['http://localhost:3000'] 只允許特定來源
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(traffic_router)


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