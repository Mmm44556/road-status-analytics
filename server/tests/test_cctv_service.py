import socket
import unittest
from unittest import mock

from server.services.cctv_service import CctvService


class FakeClient:
    def __init__(self):
        self.calls = []

    def fetch_city_cctv(self, city, *, top):
        self.calls.append((city, top))
        return {
            "CCTVs": [{
                "CCTVID": str(len(self.calls)),
                "VideoStreamURL": "http://8.8.8.8/live.jpg",
            }]
        }


class CctvServiceTests(unittest.TestCase):
    def test_normalizes_city_and_returns_cctvs(self):
        client = FakeClient()
        service = CctvService(client, ttl_seconds=60, clock=lambda: 1_000)

        result = service.get_city_cctv("臺中市", top=20)

        self.assertEqual(result["city"], "Taichung")
        self.assertEqual(result["cctvs"][0]["CCTVID"], "1")
        self.assertEqual(client.calls, [("Taichung", 20)])

    def test_returns_cached_value_within_ttl(self):
        client = FakeClient()
        service = CctvService(client, ttl_seconds=60, clock=lambda: 1_000)

        first = service.get_city_cctv("高雄市", top=20)
        second = service.get_city_cctv("高雄市", top=20)

        self.assertEqual(first, second)
        self.assertEqual(len(client.calls), 1)

    def test_refetches_after_ttl_expires(self):
        client = FakeClient()
        current_time = {"value": 1_000.0}
        service = CctvService(
            client, ttl_seconds=60, clock=lambda: current_time["value"]
        )

        service.get_city_cctv("高雄市", top=20)
        current_time["value"] += 61
        service.get_city_cctv("高雄市", top=20)

        self.assertEqual(len(client.calls), 2)

    def test_resolves_only_a_camera_url_from_the_tdx_city_inventory(self):
        client = FakeClient()
        service = CctvService(client, ttl_seconds=60, clock=lambda: 1_000)

        self.assertEqual(
            service.get_camera_stream_url("高雄市", "1", top=20),
            "http://8.8.8.8/live.jpg",
        )

    def test_rejects_an_untrusted_stream_scheme(self):
        client = FakeClient()
        client.fetch_city_cctv = lambda city, top: {
            "CCTVs": [{"CCTVID": "unsafe", "VideoStreamURL": "file:///etc/passwd"}]
        }
        service = CctvService(client, ttl_seconds=60, clock=lambda: 1_000)

        with self.assertRaises(ValueError):
            service.get_camera_stream_url("高雄市", "unsafe", top=20)

    def test_rejects_a_hostname_that_resolves_to_a_private_address(self):
        # 主機名稱本身不是字面 IP，必須實際解析才能擋下指向內網的名稱。
        client = FakeClient()
        client.fetch_city_cctv = lambda city, top: {
            "CCTVs": [{
                "CCTVID": "internal",
                "VideoStreamURL": "http://internal.example.test/live.jpg",
            }]
        }
        service = CctvService(client, ttl_seconds=60, clock=lambda: 1_000)

        with mock.patch(
            "server.services.cctv_service.socket.getaddrinfo",
            return_value=[(socket.AF_INET, socket.SOCK_STREAM, 0, "", ("10.0.0.5", 80))],
        ):
            with self.assertRaises(ValueError):
                service.get_camera_stream_url("高雄市", "internal", top=20)

    def test_accepts_a_hostname_that_resolves_to_a_public_address(self):
        client = FakeClient()
        client.fetch_city_cctv = lambda city, top: {
            "CCTVs": [{
                "CCTVID": "public",
                "VideoStreamURL": "http://cctv.example.test/live.jpg",
            }]
        }
        service = CctvService(client, ttl_seconds=60, clock=lambda: 1_000)

        with mock.patch(
            "server.services.cctv_service.socket.getaddrinfo",
            return_value=[(socket.AF_INET, socket.SOCK_STREAM, 0, "", ("8.8.8.8", 80))],
        ):
            self.assertEqual(
                service.get_camera_stream_url("高雄市", "public", top=20),
                "http://cctv.example.test/live.jpg",
            )


if __name__ == "__main__":
    unittest.main()
