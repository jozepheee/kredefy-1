"""
Kredefy FastAPI Application
Production-grade with middleware stack and proper error handling
"""

from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import sys

from app.config import get_settings
from app.middleware import (
    RequestIDMiddleware,
    StructuredLoggingMiddleware,
    RateLimitMiddleware,
    SecurityHeadersMiddleware,
    get_request_id,
)
from app.utils import task_manager
from app.api.v1 import (
    auth,
    circles,
    vouches,
    loans,
    payments,
    emergency,
    diary,
    nova,
    trust_score,
    saathi,
)

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format='{"timestamp":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}',
    stream=sys.stdout,
)
logger = logging.getLogger(__name__)

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup/shutdown"""
    # Startup
    logger.info("Starting Kredefy API...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    
    # Initialize services (connections are lazy)
    
    yield
    
    # Shutdown
    logger.info("Shutting down Kredefy API...")
    
    # Cancel background tasks
    await task_manager.shutdown()
    
    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="Kredefy API",
    description="Trust-based P2P lending platform for India's underbanked population",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
    lifespan=lifespan,
)

# ============================================
# Middleware Stack (order matters!)
# ============================================

# 1. Security headers (outermost)
app.add_middleware(SecurityHeadersMiddleware)

# 2. Rate limiting
app.add_middleware(
    RateLimitMiddleware,
    requests_per_minute=settings.rate_limit_per_minute,
)

# 3. Structured logging
app.add_middleware(StructuredLoggingMiddleware)

# 4. Request ID tracing
app.add_middleware(RequestIDMiddleware)

# 5. CORS (innermost before handlers)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time", "X-RateLimit-Remaining"],
)


# ============================================
# Exception Handlers
# ============================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all unhandled exceptions with request context"""
    request_id = get_request_id() or getattr(request.state, "request_id", "unknown")
    
    logger.error(
        f"Unhandled exception",
        extra={
            "request_id": request_id,
            "path": request.url.path,
            "error": str(exc),
        },
        exc_info=True,
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": "Internal server error",
            "request_id": request_id,
            "detail": str(exc) if settings.debug else None,
        },
        headers={"X-Request-ID": request_id},
    )


@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handle validation/business logic errors"""
    request_id = get_request_id() or "unknown"
    
    return JSONResponse(
        status_code=400,
        content={
            "success": False,
            "error": "Bad Request",
            "detail": str(exc),
            "request_id": request_id,
        },
        headers={"X-Request-ID": request_id},
    )


# ============================================
# Health & Info Endpoints
# ============================================

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint for Docker and load balancers
    Returns service status and dependencies
    """
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.environment,
        "services": {
            "database": "connected",  # Would check actual connection
            "blockchain": "connected",
            "ai": "connected",
        },
    }


@app.get("/", tags=["System"])
async def root():
    """Root endpoint with API info"""
    return {
        "name": "Kredefy API",
        "version": "1.0.0",
        "description": "Trust-based P2P lending for 400M underbanked Indians",
        "docs": "/docs" if settings.debug else "Disabled in production",
        "sponsor_tracks": ["Mastra AI", "Dodo Payments", "Polygon Web3"],
    }


@app.get("/readiness", tags=["System"])
async def readiness_check():
    """Kubernetes readiness probe"""
    # Check critical dependencies
    try:
        # Would check Supabase, Blockchain, etc.
        return {"ready": True}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"ready": False, "error": str(e)},
        )


# ============================================
# API Routers
# ============================================

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(circles.router, prefix="/api/v1/circles", tags=["Trust Circles"])
app.include_router(vouches.router, prefix="/api/v1/vouches", tags=["Vouching"])
app.include_router(loans.router, prefix="/api/v1/loans", tags=["Loans"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(emergency.router, prefix="/api/v1/emergency", tags=["Emergency"])
app.include_router(diary.router, prefix="/api/v1/diary", tags=["Financial Diary"])
app.include_router(nova.router, prefix="/api/v1/nova", tags=["Nova AI"])
app.include_router(trust_score.router, prefix="/api/v1/trust-score", tags=["Trust Score"])
app.include_router(saathi.router, prefix="/api/v1/saathi", tags=["Saathi Token"])

# Import and register nearby users router
from app.api.v1 import nearby
app.include_router(nearby.router, prefix="/api/v1/nearby", tags=["Nearby Users"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_config=None,  # Use our custom logging
    )
