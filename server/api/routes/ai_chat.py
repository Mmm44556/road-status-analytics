import json

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from google.genai import errors as genai_errors

from server.core.rate_limiter import RateLimitExceededError, SlidingWindowRateLimiter
from server.dependencies import get_ai_chat_rate_limiter, get_ai_chat_service
from server.schemas.ai_chat import AiChatRequest
from server.services.ai_chat_service import AiChatService, InvalidAiChatRequestError


router = APIRouter(prefix="/ai", tags=["ai"])


def _format_event(payload: dict) -> str:
    return f"data: {json.dumps(payload)}\n\n"


def _resolve_client_key(request: Request) -> str:
    """依序信任 Cloudflare／反向代理設定的來源 IP header，最後才退回
    request.client.host。

    這支服務不論是哪種部署方式都一定躲在自己掌控的反向代理後面（Docker
    裡的 nginx、Render 自己的 edge、或再疊一層 Cloudflare proxy），不會
    被外部直接連上 TCP 連線，所以可以信任這些代理自己寫入的 header——
    反過來說，如果不信任、只看 request.client.host，在反向代理後面拿到
    的永遠是「代理自己」的 IP，會讓所有使用者共用同一份 rate limit 額度，
    幾個人同時操作就會互相把彼此擋下來（這是先前這裡的寫法）。
    """
    cf_connecting_ip = request.headers.get("cf-connecting-ip")
    if cf_connecting_ip:
        return cf_connecting_ip.strip()
    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        # 多層代理時第一個是最原始的來源。
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def enforce_ai_chat_rate_limit(
    request: Request,
    limiter: SlidingWindowRateLimiter = Depends(get_ai_chat_rate_limiter),
) -> None:
    client_key = _resolve_client_key(request)
    try:
        limiter.check(client_key)
    except RateLimitExceededError as error:
        raise HTTPException(
            status_code=429,
            detail="Too many requests, please slow down",
            headers={"Retry-After": str(int(error.retry_after_seconds) + 1)},
        ) from error


@router.post("/chat")
async def chat(
    payload: AiChatRequest,
    request: Request,
    service: AiChatService = Depends(get_ai_chat_service),
    _rate_limit: None = Depends(enforce_ai_chat_rate_limit),
) -> StreamingResponse:
    async def event_source():
        generator = service.stream_message(payload)
        try:
            async for event in generator:
                if await request.is_disconnected():
                    break
                yield _format_event(event)
        except InvalidAiChatRequestError as error:
            yield _format_event({"type": "error", "detail": str(error)})
        except genai_errors.APIError:
            yield _format_event(
                {"type": "error", "detail": "Gemini upstream request failed"}
            )
        finally:
            await generator.aclose()

    return StreamingResponse(event_source(), media_type="text/event-stream")
