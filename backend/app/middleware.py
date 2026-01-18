"""
Production Middleware Stack
Request tracing, rate limiting, structured logging
"""

import time
import uuid
import logging
from typing import Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from contextvars import ContextVar
from collections import defaultdict
import asyncio

# Context variable for request ID (available in all async contexts)
request_id_ctx: ContextVar[str] = ContextVar("request_id", default="")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """
    Adds unique request ID to every request
    Used for distributed tracing and log correlation
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get or generate request ID
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        
        # Store in context var for logging
        request_id_ctx.set(request_id)
        
        # Store in request state
        request.state.request_id = request_id
        
        # Process request
        response = await call_next(request)
        
        # Add to response headers
        response.headers["X-Request-ID"] = request_id
        
        return response


class StructuredLoggingMiddleware(BaseHTTPMiddleware):
    """
    Structured JSON logging with request context
    Compatible with ELK stack, CloudWatch, etc.
    """
    
    def __init__(self, app, logger_name: str = "kredefy.api"):
        super().__init__(app)
        self.logger = logging.getLogger(logger_name)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.time()
        request_id = getattr(request.state, "request_id", "unknown")
        
        # Log request
        self.logger.info(
            "request_started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "client_ip": request.client.host if request.client else "unknown",
                "user_agent": request.headers.get("user-agent", ""),
            }
        )
        
        # Process request
        try:
            response = await call_next(request)
            duration_ms = int((time.time() - start_time) * 1000)
            
            # Log response
            self.logger.info(
                "request_completed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms,
                }
            )
            
            # Add timing header
            response.headers["X-Response-Time"] = f"{duration_ms}ms"
            
            return response
            
        except Exception as e:
            duration_ms = int((time.time() - start_time) * 1000)
            self.logger.error(
                "request_failed",
                extra={
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "error": str(e),
                    "duration_ms": duration_ms,
                },
                exc_info=True,
            )
            raise


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    In-memory rate limiting per IP and per user
    Production: Use Redis for distributed rate limiting
    """
    
    def __init__(self, app, requests_per_minute: int = 60):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts: defaultdict = defaultdict(list)
        self._cleanup_task = None
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip rate limit for health checks
        if request.url.path in ["/health", "/", "/docs", "/openapi.json"]:
            return await call_next(request)
        
        # Get client identifier (IP or user ID)
        client_ip = request.client.host if request.client else "unknown"
        client_key = f"ip:{client_ip}"
        
        # Check if user is authenticated
        auth_header = request.headers.get("authorization", "")
        if auth_header:
            # Use token hash as key for authenticated users
            client_key = f"auth:{hash(auth_header) % 10000}"
        
        current_time = time.time()
        window_start = current_time - 60  # 1 minute window
        
        # Clean old requests
        self.request_counts[client_key] = [
            t for t in self.request_counts[client_key] 
            if t > window_start
        ]
        
        # Check rate limit
        if len(self.request_counts[client_key]) >= self.requests_per_minute:
            return Response(
                content='{"error": "Rate limit exceeded", "retry_after": 60}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )
        
        # Record request
        self.request_counts[client_key].append(current_time)
        
        # Add rate limit headers
        response = await call_next(request)
        remaining = self.requests_per_minute - len(self.request_counts[client_key])
        response.headers["X-RateLimit-Limit"] = str(self.requests_per_minute)
        response.headers["X-RateLimit-Remaining"] = str(max(0, remaining))
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Add security headers to all responses
    """
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response


def get_request_id() -> str:
    """Get current request ID from context"""
    return request_id_ctx.get()
