from __future__ import annotations

from typing import Any, AsyncIterator, Protocol

from pydantic import ValidationError

from server.schemas.ai_chat import (
    AiActionResult,
    AiChatRequest,
    AiChatTurn,
    AiMapAction,
    ChangeBasemapAction,
    ClearRouteAction,
    LocateMeAction,
    PlanRouteAction,
    ResetAreaAction,
    SearchPlaceAction,
    SelectAreaAction,
    ToggleLayerAction,
)


class InvalidAiChatRequestError(ValueError):
    pass


class GeminiMessenger(Protocol):
    def stream_message(
        self, turns: list[dict[str, str]], *, allow_actions: bool
    ) -> AsyncIterator[Any]: ...


_ACTION_MODELS: dict[str, type] = {
    "search_place": SearchPlaceAction,
    "plan_route": PlanRouteAction,
    "toggle_layer": ToggleLayerAction,
    "select_area": SelectAreaAction,
    "clear_route": ClearRouteAction,
    "locate_me": LocateMeAction,
    "reset_area": ResetAreaAction,
    "change_basemap": ChangeBasemapAction,
}


def _build_action_result_text(results: list[AiActionResult]) -> str:
    lines = [
        f"- {result.type}：{'成功' if result.success else '失敗'}，{result.summary}"
        for result in results
    ]
    return "[執行結果]\n" + "\n".join(lines)


class AiChatService:
    """把對話文字轉成 Gemini 串流呼叫，邊收邊把文字與 function call 轉成事件。"""

    def __init__(self, client: GeminiMessenger) -> None:
        self._client = client

    async def stream_message(
        self, request: AiChatRequest
    ) -> AsyncIterator[dict[str, Any]]:
        has_message = bool(request.message and request.message.strip())
        has_results = bool(request.actionResults)
        if has_message == has_results:
            raise InvalidAiChatRequestError(
                "Provide exactly one of message or actionResults"
            )

        if has_message:
            assert request.message is not None
            new_text = request.message.strip()
            allow_actions = True
        else:
            assert request.actionResults is not None
            new_text = _build_action_result_text(request.actionResults)
            allow_actions = False

        turns = self._build_turns(request.history, new_text)
        actions: list[AiMapAction] = []
        async for chunk in self._client.stream_message(
            turns, allow_actions=allow_actions
        ):
            if chunk.text:
                yield {"type": "delta", "text": chunk.text}
            actions.extend(self._extract_actions(chunk))

        yield {
            "type": "done",
            "actions": [action.model_dump() for action in actions],
        }

    @staticmethod
    def _build_turns(
        history: list[AiChatTurn], new_text: str
    ) -> list[dict[str, str]]:
        turns = [{"role": turn.role, "text": turn.content} for turn in history]
        turns.append({"role": "user", "text": new_text})
        return turns

    @staticmethod
    def _extract_actions(chunk: Any) -> list[AiMapAction]:
        actions: list[AiMapAction] = []
        candidates = chunk.candidates or []
        if not candidates or not candidates[0].content:
            return actions
        for part in candidates[0].content.parts or []:
            function_call = part.function_call
            if function_call is None or function_call.name is None:
                continue
            model = _ACTION_MODELS.get(function_call.name)
            if model is None:
                continue
            try:
                actions.append(model.model_validate(dict(function_call.args or {})))
            except ValidationError:
                # Gemini 偶爾會給不符合 schema 的參數，略過這個動作，其餘回覆內容仍正常顯示。
                continue
        return actions
