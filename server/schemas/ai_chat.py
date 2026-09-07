from typing import Annotated, Literal, Union

from pydantic import BaseModel, Field


class SearchPlaceAction(BaseModel):
    type: Literal["search_place"] = "search_place"
    query: str


class PlanRouteAction(BaseModel):
    type: Literal["plan_route"] = "plan_route"
    origin: str
    destination: str
    stopovers: list[str] = Field(default_factory=list)
    travelMode: Literal["drive", "transit", "bicycle", "walk"]


class ToggleLayerAction(BaseModel):
    type: Literal["toggle_layer"] = "toggle_layer"
    layerId: str
    visible: bool


class SelectAreaAction(BaseModel):
    type: Literal["select_area"] = "select_area"
    countyName: str
    townshipName: str | None = None


class ClearRouteAction(BaseModel):
    type: Literal["clear_route"] = "clear_route"


class LocateMeAction(BaseModel):
    type: Literal["locate_me"] = "locate_me"


class ResetAreaAction(BaseModel):
    type: Literal["reset_area"] = "reset_area"


class ChangeBasemapAction(BaseModel):
    type: Literal["change_basemap"] = "change_basemap"
    basemapId: str


AiMapAction = Annotated[
    Union[
        SearchPlaceAction,
        PlanRouteAction,
        ToggleLayerAction,
        SelectAreaAction,
        ClearRouteAction,
        LocateMeAction,
        ResetAreaAction,
        ChangeBasemapAction,
    ],
    Field(discriminator="type"),
]


class AiChatTurn(BaseModel):
    role: Literal["user", "model"]
    content: str


class AiActionResult(BaseModel):
    type: str
    success: bool
    summary: str


class AiChatRequest(BaseModel):
    history: list[AiChatTurn] = Field(default_factory=list)
    message: str | None = None
    actionResults: list[AiActionResult] | None = None
