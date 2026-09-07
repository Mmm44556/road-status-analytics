from __future__ import annotations

from typing import AsyncIterator, Mapping

from google import genai
from google.genai import types


class GeminiConfigError(RuntimeError):
    pass


SYSTEM_INSTRUCTION = (
    "你是「路況通」網站的 AI 路線助理，可以在地圖上搜尋地點、規劃路線、清除路線、"
    "定位使用者目前位置、開關圖層、選擇查詢縣市或鄉鎮、重新選擇縣市、切換底圖。"
    "回覆一律使用繁體中文，語氣簡潔口語。"
    "只有在使用者明確要求對應操作時才呼叫工具，不要主動幫使用者做他沒說的事。"
    "使用者只提到縣市、沒提到鄉鎮時，視為要查詢整個縣市，不用追問鄉鎮。"
    "search_place 的 query、以及 plan_route 的 origin／destination／stopovers，"
    "只要對話中看得出來是哪個縣市或地區，就把縣市名稱一起填進去（例如「高雄市正修科技大學」"
    "而不是只填「正修科技大學」）；地點搜尋不會用地圖目前顯示的縣市當提示，"
    "所以縣市名稱漏填，就可能查到別的縣市同名或無關的地點。"
    "規劃路線時，如果使用者沒有明確提到起點，不要自己編造或猜測一個地名當起點；"
    "這種情況下只能二選一：直接呼叫 plan_route 並把 origin 填成「我的位置」（代表使用目前定位，"
    "並在文字回覆中告訴使用者你用的是他目前的位置），或是不呼叫工具、直接用文字反問使用者起點在哪裡。"
    "使用者的訊息若以「[執行結果]」開頭，代表這是你剛才呼叫工具後地圖實際執行的結果，"
    "請根據結果內容自然地說明或提出下一步建議；這種訊息不需要、也不能再呼叫任何工具。"
)

_LAYER_ID_DESCRIPTION = (
    "圖層代號：cctv=路口影像、roadEvents=交通事件、liveTraffic=即時路況、"
    "vehicleDetectors=車輛偵測器、bikeShare=YouBike、metro=捷運輕軌、bus=公車站牌、"
    "parkingLots=戶外停車場、parkingSegments=路邊停車格"
)

_BASEMAP_ID_DESCRIPTION = (
    "底圖代號：EMAP=臺灣通用電子地圖(預設)、EMAP15=套疊等高線無門牌、"
    "EMAP5=套疊等高線+門牌、EMAP6=+門牌不含等高線、EMAP16=不含等高線及門牌、"
    "EMAP01=灰階、EMAP8=Taiwan e-Map、PHOTO2=正射影像(航照圖)、"
    "PHOTO_MIX=正射影像(航照混合)、EMAP9=無鐵公路、EMAP99=向量地圖"
)

_ACTION_TOOL = types.Tool(
    function_declarations=[
        types.FunctionDeclaration(
            name="search_place",
            description="搜尋一個地點名稱或地址，並讓地圖飛過去。",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "地點名稱、地址或地標",
                    },
                },
                "required": ["query"],
            },
        ),
        types.FunctionDeclaration(
            name="plan_route",
            description="規劃從起點到終點的路線，可以包含途經點。",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "origin": {
                        "type": "string",
                        "description": (
                            "起點地名。若使用者說「我的位置」或沒有明確提到起點，"
                            "請填入「我的位置」代表使用目前定位，不要猜測其他地名"
                        ),
                    },
                    "destination": {"type": "string", "description": "終點地名"},
                    "stopovers": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "依序經過的途經點地名",
                    },
                    "travelMode": {
                        "type": "string",
                        "enum": ["drive", "transit", "bicycle", "walk"],
                        "description": "交通方式：開車、大眾運輸、自行車或步行",
                    },
                },
                "required": ["origin", "destination", "travelMode"],
            },
        ),
        types.FunctionDeclaration(
            name="toggle_layer",
            description="開啟或關閉地圖上的一個圖層。",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "layerId": {
                        "type": "string",
                        "enum": [
                            "cctv",
                            "roadEvents",
                            "liveTraffic",
                            "vehicleDetectors",
                            "bikeShare",
                            "metro",
                            "bus",
                            "parkingLots",
                            "parkingSegments",
                        ],
                        "description": _LAYER_ID_DESCRIPTION,
                    },
                    "visible": {"type": "boolean"},
                },
                "required": ["layerId", "visible"],
            },
        ),
        types.FunctionDeclaration(
            name="select_area",
            description="選擇要查詢的縣市，可一併指定鄉鎮。",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "countyName": {
                        "type": "string",
                        "description": "縣市全名，例如「高雄市」",
                    },
                    "townshipName": {
                        "type": "string",
                        "description": "鄉鎮市區名稱，未提及則省略",
                    },
                },
                "required": ["countyName"],
            },
        ),
        types.FunctionDeclaration(
            name="clear_route",
            description="清除目前地圖上已經規劃好的路線。",
            parameters_json_schema={"type": "object", "properties": {}},
        ),
        types.FunctionDeclaration(
            name="locate_me",
            description="取得使用者目前的定位，並讓地圖飛過去。",
            parameters_json_schema={"type": "object", "properties": {}},
        ),
        types.FunctionDeclaration(
            name="reset_area",
            description="清除目前選擇的縣市／鄉鎮，回到全臺灣範圍讓使用者重新選擇。",
            parameters_json_schema={"type": "object", "properties": {}},
        ),
        types.FunctionDeclaration(
            name="change_basemap",
            description="切換地圖底圖樣式。",
            parameters_json_schema={
                "type": "object",
                "properties": {
                    "basemapId": {
                        "type": "string",
                        "enum": [
                            "EMAP",
                            "EMAP15",
                            "EMAP5",
                            "EMAP6",
                            "EMAP16",
                            "EMAP01",
                            "EMAP8",
                            "PHOTO2",
                            "PHOTO_MIX",
                            "EMAP9",
                            "EMAP99",
                        ],
                        "description": _BASEMAP_ID_DESCRIPTION,
                    },
                },
                "required": ["basemapId"],
            },
        ),
    ]
)


class GeminiClient:
    """呼叫 Gemini function calling，讓 AI 能下結構化地圖指令。"""

    def __init__(self, api_key: str, *, model: str = "gemini-flash-lite-latest") -> None:
        if not api_key:
            raise GeminiConfigError("Gemini API key is not configured")
        self._client = genai.Client(api_key=api_key)
        self._model = model

    async def stream_message(
        self,
        turns: list[Mapping[str, str]],
        *,
        allow_actions: bool,
    ) -> AsyncIterator[types.GenerateContentResponse]:
        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            tools=[_ACTION_TOOL] if allow_actions else None,
        )
        contents = [
            types.Content(role=turn["role"], parts=[types.Part(text=turn["text"])])
            for turn in turns
        ]
        stream = await self._client.aio.models.generate_content_stream(
            model=self._model,
            contents=contents,
            config=config,
        )
        async for chunk in stream:
            yield chunk
