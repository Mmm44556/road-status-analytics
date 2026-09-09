import unittest
from types import SimpleNamespace

from fastapi import HTTPException

from server.api.routes.ai_chat import enforce_ai_chat_rate_limit
from server.core.rate_limiter import RateLimitExceededError, SlidingWindowRateLimiter


class SlidingWindowRateLimiterTests(unittest.TestCase):
    def test_allows_requests_up_to_the_limit(self):
        now = [0.0]
        limiter = SlidingWindowRateLimiter(
            max_requests=3, window_seconds=60, clock=lambda: now[0]
        )

        for _ in range(3):
            limiter.check("1.2.3.4")

    def test_rejects_the_request_that_exceeds_the_limit(self):
        now = [0.0]
        limiter = SlidingWindowRateLimiter(
            max_requests=2, window_seconds=60, clock=lambda: now[0]
        )

        limiter.check("1.2.3.4")
        limiter.check("1.2.3.4")
        with self.assertRaises(RateLimitExceededError):
            limiter.check("1.2.3.4")

    def test_different_keys_have_independent_limits(self):
        now = [0.0]
        limiter = SlidingWindowRateLimiter(
            max_requests=1, window_seconds=60, clock=lambda: now[0]
        )

        limiter.check("1.2.3.4")
        limiter.check("5.6.7.8")  # 不同來源，不應該被前一個用光的額度擋下來

    def test_allows_requests_again_once_the_window_slides_past(self):
        now = [0.0]
        limiter = SlidingWindowRateLimiter(
            max_requests=1, window_seconds=60, clock=lambda: now[0]
        )

        limiter.check("1.2.3.4")
        now[0] = 61.0
        limiter.check("1.2.3.4")  # 舊的紀錄已經滑出視窗，應該再次放行

    def test_reports_a_reasonable_retry_after(self):
        now = [0.0]
        limiter = SlidingWindowRateLimiter(
            max_requests=1, window_seconds=60, clock=lambda: now[0]
        )

        limiter.check("1.2.3.4")
        now[0] = 10.0
        with self.assertRaises(RateLimitExceededError) as context:
            limiter.check("1.2.3.4")
        self.assertAlmostEqual(context.exception.retry_after_seconds, 50.0)


class EnforceAiChatRateLimitTests(unittest.TestCase):
    def test_passes_through_when_under_the_limit(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = SimpleNamespace(client=SimpleNamespace(host="1.2.3.4"))

        enforce_ai_chat_rate_limit(request, limiter)

    def test_raises_429_with_retry_after_header_when_over_the_limit(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = SimpleNamespace(client=SimpleNamespace(host="1.2.3.4"))

        enforce_ai_chat_rate_limit(request, limiter)
        with self.assertRaises(HTTPException) as context:
            enforce_ai_chat_rate_limit(request, limiter)

        self.assertEqual(context.exception.status_code, 429)
        self.assertIn("Retry-After", context.exception.headers)

    def test_treats_a_missing_client_as_a_single_shared_key(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = SimpleNamespace(client=None)

        enforce_ai_chat_rate_limit(request, limiter)
        with self.assertRaises(HTTPException):
            enforce_ai_chat_rate_limit(request, limiter)


if __name__ == "__main__":
    unittest.main()
