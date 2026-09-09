import unittest

from server.schemas.ai_chat import AiActionResult, AiChatRequest, AiChatTurn
from server.services.ai_chat_service import AiChatService, InvalidAiChatRequestError


class FakeFunctionCall:
    def __init__(self, name, args):
        self.name = name
        self.args = args


class FakePart:
    def __init__(self, function_call=None):
        self.function_call = function_call


class FakeContent:
    def __init__(self, parts):
        self.parts = parts


class FakeCandidate:
    def __init__(self, parts):
        self.content = FakeContent(parts)


class FakeChunk:
    def __init__(self, text=None, parts=None):
        self.text = text
        self.candidates = [FakeCandidate(parts or [])]


class FakeGeminiClient:
    def __init__(self, chunks):
        self.chunks = chunks
        self.calls = []

    async def stream_message(self, turns, *, allow_actions):
        self.calls.append({"turns": turns, "allow_actions": allow_actions})
        for chunk in self.chunks:
            yield chunk


async def collect(service, request):
    events = []
    async for event in service.stream_message(request):
        events.append(event)
    return events


class AiChatServiceTests(unittest.IsolatedAsyncioTestCase):
    async def test_streams_text_deltas_then_a_done_event_with_no_actions(self):
        client = FakeGeminiClient([FakeChunk(text="好的"), FakeChunk(text="，幫你查詢")])
        service = AiChatService(client)

        events = await collect(
            service,
            AiChatRequest(
                history=[AiChatTurn(role="user", content="你好")],
                message="幫我找台北車站",
            ),
        )

        self.assertEqual(
            events,
            [
                {"type": "delta", "text": "好的"},
                {"type": "delta", "text": "，幫你查詢"},
                {"type": "done", "actions": []},
            ],
        )
        self.assertTrue(client.calls[0]["allow_actions"])
        self.assertEqual(
            client.calls[0]["turns"],
            [
                {"role": "user", "text": "你好"},
                {"role": "user", "text": "幫我找台北車站"},
            ],
        )

    async def test_reports_action_results_without_allowing_new_actions(self):
        client = FakeGeminiClient([FakeChunk(text="已經幫你規劃好路線了")])
        service = AiChatService(client)

        events = await collect(
            service,
            AiChatRequest(
                actionResults=[
                    AiActionResult(
                        type="plan_route", success=True, summary="距離 12 公里"
                    )
                ]
            ),
        )

        self.assertEqual(events[0], {"type": "delta", "text": "已經幫你規劃好路線了"})
        self.assertEqual(events[-1], {"type": "done", "actions": []})
        self.assertFalse(client.calls[0]["allow_actions"])
        self.assertIn("[執行結果]", client.calls[0]["turns"][-1]["text"])
        self.assertIn("plan_route", client.calls[0]["turns"][-1]["text"])

    async def test_rejects_request_with_both_message_and_action_results(self):
        service = AiChatService(FakeGeminiClient([]))
        with self.assertRaises(InvalidAiChatRequestError):
            await collect(
                service,
                AiChatRequest(
                    message="hi",
                    actionResults=[
                        AiActionResult(type="x", success=True, summary="ok")
                    ],
                ),
            )

    async def test_rejects_request_with_neither_message_nor_action_results(self):
        service = AiChatService(FakeGeminiClient([]))
        with self.assertRaises(InvalidAiChatRequestError):
            await collect(service, AiChatRequest())

    async def test_parses_function_calls_into_typed_actions(self):
        chunk = FakeChunk(
            text=None,
            parts=[
                FakePart(
                    function_call=FakeFunctionCall(
                        "search_place", {"query": "台北車站"}
                    )
                ),
                FakePart(
                    function_call=FakeFunctionCall(
                        "toggle_layer", {"layerId": "cctv", "visible": True}
                    )
                ),
            ],
        )
        client = FakeGeminiClient([chunk])
        service = AiChatService(client)

        events = await collect(
            service, AiChatRequest(message="幫我找台北車站並開啟路口影像")
        )

        done_event = events[-1]
        self.assertEqual(done_event["type"], "done")
        self.assertEqual(len(done_event["actions"]), 2)
        self.assertEqual(done_event["actions"][0]["type"], "search_place")
        self.assertEqual(done_event["actions"][0]["query"], "台北車站")
        self.assertEqual(done_event["actions"][1]["type"], "toggle_layer")
        self.assertTrue(done_event["actions"][1]["visible"])

    async def test_skips_function_call_with_invalid_arguments(self):
        chunk = FakeChunk(
            text="我需要更多資訊",
            parts=[FakePart(function_call=FakeFunctionCall("plan_route", {"origin": "A"}))],
        )
        client = FakeGeminiClient([chunk])
        service = AiChatService(client)

        events = await collect(service, AiChatRequest(message="規劃路線"))

        self.assertEqual(events[0], {"type": "delta", "text": "我需要更多資訊"})
        self.assertEqual(events[-1], {"type": "done", "actions": []})

    async def test_parses_no_argument_function_calls(self):
        chunk = FakeChunk(
            text=None,
            parts=[
                FakePart(function_call=FakeFunctionCall("clear_route", {})),
                FakePart(function_call=FakeFunctionCall("locate_me", {})),
            ],
        )
        client = FakeGeminiClient([chunk])
        service = AiChatService(client)

        events = await collect(service, AiChatRequest(message="清掉路線然後定位我"))

        done_event = events[-1]
        self.assertEqual(
            [action["type"] for action in done_event["actions"]],
            ["clear_route", "locate_me"],
        )

    async def test_parses_reset_area_and_change_basemap(self):
        chunk = FakeChunk(
            text=None,
            parts=[
                FakePart(function_call=FakeFunctionCall("reset_area", {})),
                FakePart(
                    function_call=FakeFunctionCall(
                        "change_basemap", {"basemapId": "PHOTO2"}
                    )
                ),
            ],
        )
        client = FakeGeminiClient([chunk])
        service = AiChatService(client)

        events = await collect(
            service, AiChatRequest(message="重新選縣市，然後換成航照圖")
        )

        done_event = events[-1]
        self.assertEqual(
            [action["type"] for action in done_event["actions"]],
            ["reset_area", "change_basemap"],
        )
        self.assertEqual(done_event["actions"][1]["basemapId"], "PHOTO2")

    async def test_skips_unknown_function_call_name(self):
        chunk = FakeChunk(
            text="...",
            parts=[FakePart(function_call=FakeFunctionCall("delete_everything", {}))],
        )
        client = FakeGeminiClient([chunk])
        service = AiChatService(client)

        events = await collect(service, AiChatRequest(message="test"))

        self.assertEqual(events[-1], {"type": "done", "actions": []})


if __name__ == "__main__":
    unittest.main()
