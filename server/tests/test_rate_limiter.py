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


def _make_request(headers=None, host="1.2.3.4"):
    return SimpleNamespace(
        headers=headers or {},
        client=SimpleNamespace(host=host) if host is not None else None,
    )


class EnforceAiChatRateLimitTests(unittest.TestCase):
    def test_passes_through_when_under_the_limit(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = _make_request()

        enforce_ai_chat_rate_limit(request, limiter)

    def test_raises_429_with_retry_after_header_when_over_the_limit(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = _make_request()

        enforce_ai_chat_rate_limit(request, limiter)
        with self.assertRaises(HTTPException) as context:
            enforce_ai_chat_rate_limit(request, limiter)

        self.assertEqual(context.exception.status_code, 429)
        self.assertIn("Retry-After", context.exception.headers)

    def test_treats_a_missing_client_as_a_single_shared_key(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = _make_request(host=None)

        enforce_ai_chat_rate_limit(request, limiter)
        with self.assertRaises(HTTPException):
            enforce_ai_chat_rate_limit(request, limiter)

    def test_prefers_cf_connecting_ip_over_the_proxy_that_terminated_the_connection(self):
        # 部署在 Render／Cloudflare 後面時，request.client.host 是代理自己
        # 的 IP，兩個不同使用者若都被同一層代理轉送，client.host 會相同，
        # 但 CF-Connecting-IP 應該正確區分出兩個獨立來源。
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        proxy_host = "10.0.0.1"
        user_a = _make_request(
            headers={"cf-connecting-ip": "1.1.1.1"}, host=proxy_host
        )
        user_b = _make_request(
            headers={"cf-connecting-ip": "2.2.2.2"}, host=proxy_host
        )

        enforce_ai_chat_rate_limit(user_a, limiter)
        enforce_ai_chat_rate_limit(user_b, limiter)  # 不應該被 user_a 用光的額度擋下來

    def test_falls_back_to_the_first_x_forwarded_for_entry(self):
        limiter = SlidingWindowRateLimiter(max_requests=1, window_seconds=60)
        request = _make_request(
            headers={"x-forwarded-for": "3.3.3.3, 10.0.0.1"}
        )

        enforce_ai_chat_rate_limit(request, limiter)
        with self.assertRaises(HTTPException):
            # 同一個 X-Forwarded-For 來源，第二次要被擋下來才對。
            enforce_ai_chat_rate_limit(
                _make_request(headers={"x-forwarded-for": "3.3.3.3, 10.0.0.2"}),
                limiter,
            )


if __name__ == "__main__":
    unittest.main()
