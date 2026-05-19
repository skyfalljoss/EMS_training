from collections import defaultdict
import math
import time

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


LOGIN_RATE_LIMIT = 5
REGISTER_RATE_LIMIT = 3
WINDOW_SECONDS = 60

RATE_LIMIT_CONFIG: dict[str, int] = {
    "/auth/login": LOGIN_RATE_LIMIT,
    "/auth/register": REGISTER_RATE_LIMIT,
}

_requests: dict[str, list[float]] = defaultdict(list)


def reset_rate_limiter() -> None:
    _requests.clear()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        limit = RATE_LIMIT_CONFIG.get(path)
        if limit is None:
            return await call_next(request)

        ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        window_start = now - WINDOW_SECONDS

        key = f"{ip}:{path}"
        _requests[key] = [t for t in _requests[key] if t > window_start]

        if len(_requests[key]) >= limit:
            retry_after = math.ceil(_requests[key][0] + WINDOW_SECONDS - now)
            if retry_after < 1:
                retry_after = 1
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Try again later."},
                headers={"Retry-After": str(retry_after)},
            )

        _requests[key].append(now)
        return await call_next(request)
