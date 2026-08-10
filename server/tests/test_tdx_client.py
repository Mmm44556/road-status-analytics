import unittest

from server.traffic.tdx_client import TdxClient, TdxConfigError


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


class FakeSession:
    def __init__(self):
        self.post_calls = []
        self.get_calls = []

    def post(self, url, data, timeout):
        self.post_calls.append((url, data, timeout))
        return FakeResponse({"access_token": "test-token", "expires_in": 300})

    def get(self, url, headers, params, timeout):
        self.get_calls.append((url, headers, params, timeout))
        key = "LiveEvents" if "LiveEvent" in url else "Events"
        return FakeResponse({key: [{"EventID": "event-1"}]})


class TdxClientTests(unittest.TestCase):
    def test_requires_credentials(self):
        with self.assertRaises(TdxConfigError):
            TdxClient(client_id="", client_secret="")

    def test_reuses_token_and_calls_current_city_event_paths(self):
        session = FakeSession()
        client = TdxClient(
            client_id="client-id",
            client_secret="client-secret",
            session=session,
            clock=lambda: 1_000,
        )

        preview = client.fetch_city_events("Taichung", live=False, top=25)
        live = client.fetch_city_events("Taichung", live=True, top=25)

        self.assertEqual(preview["Events"][0]["EventID"], "event-1")
        self.assertEqual(live["LiveEvents"][0]["EventID"], "event-1")
        self.assertEqual(len(session.post_calls), 1)
        self.assertTrue(session.get_calls[0][0].endswith("/Event/City/Taichung"))
        self.assertTrue(session.get_calls[1][0].endswith("/LiveEvent/City/Taichung"))
        self.assertEqual(session.get_calls[0][1], {"Authorization": "Bearer test-token"})
        self.assertEqual(session.get_calls[0][2], {"$top": 25, "$format": "JSON"})


if __name__ == "__main__":
    unittest.main()
