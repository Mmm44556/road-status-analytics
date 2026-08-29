import unittest

from fastapi import HTTPException

from server.api.routes.cctv import get_cctv_image


class FakeUpstream:
    def __init__(self, content_type="image/jpeg"):
        self.headers = {"Content-Type": content_type}
        self.closed = False

    def iter_content(self, chunk_size):
        self.chunk_size = chunk_size
        yield b"image-bytes"

    def close(self):
        self.closed = True


class FakeService:
    def __init__(self, upstream):
        self.upstream = upstream

    def open_camera_stream(self, city, camera_id, *, top):
        self.call = (city, camera_id, top)
        return self.upstream


class CctvRouteTests(unittest.IsolatedAsyncioTestCase):
    async def test_proxies_image_bytes_and_closes_the_upstream_response(self):
        upstream = FakeUpstream()
        service = FakeService(upstream)

        response = get_cctv_image("高雄市", "camera-1", service)
        body = b"".join([chunk async for chunk in response.body_iterator])

        self.assertEqual(body, b"image-bytes")
        self.assertEqual(service.call, ("高雄市", "camera-1", 1000))
        self.assertEqual(response.headers["cache-control"], "no-store")
        self.assertTrue(upstream.closed)

    def test_rejects_a_non_image_upstream_response(self):
        upstream = FakeUpstream("text/html")
        service = FakeService(upstream)

        with self.assertRaises(HTTPException) as context:
            get_cctv_image("高雄市", "camera-1", service)

        self.assertEqual(context.exception.status_code, 502)
        self.assertTrue(upstream.closed)


if __name__ == "__main__":
    unittest.main()
