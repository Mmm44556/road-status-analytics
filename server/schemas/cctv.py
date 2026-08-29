from typing import Any

from pydantic import BaseModel


class CctvBundle(BaseModel):
    city: str
    cctvs: list[dict[str, Any]]


class CctvResponse(BaseModel):
    data: CctvBundle
