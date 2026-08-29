from typing import Any

from pydantic import BaseModel


class VdBundle(BaseModel):
    city: str
    vds: list[dict[str, Any]]


class VdResponse(BaseModel):
    data: VdBundle


class VdReadingResponse(BaseModel):
    data: dict[str, Any]
