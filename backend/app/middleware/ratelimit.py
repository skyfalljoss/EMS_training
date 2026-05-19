from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from collections import defaultdict
import time


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests_per_minute: int = 10):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self._requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(self, request: Request, call_next):
        if request.url.path == "/auth/login":
            ip = request.client.host if request.client else "unknown"
            now = time.monotonic()
            window_start = now - 60
            self._requests[ip] = [t for t in self._requests[ip] if t > window_start]
            if len(self._requests[ip]) >= self.requests_per_minute:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again later.",
                )
            self._requests[ip].append(now)
        response = await call_next(request)
        return response
