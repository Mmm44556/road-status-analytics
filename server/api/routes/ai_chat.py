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


def enforce_ai_chat_rate_limit(
    request: Request,
    limiter: SlidingWindowRateLimiter = Depends(get_ai_chat_rate_limiter),
) -> None:
    # request.client.host 在部署於反向代理後面時可能只看到代理的 IP，
    # 但這裡的目的是擋掉單一來源的暴衝流量，不是做精準的使用者識別，先用這個簡單、
    # 不會被隨意偽造（不信任 X-Forwarded-For）的來源就夠了。
    client_key = request.client.host if request.client else "unknown"
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
