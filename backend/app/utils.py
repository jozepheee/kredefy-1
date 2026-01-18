"""
Production Utilities
Retry decorators, circuit breakers, background task manager
"""

import asyncio
import logging
from typing import Callable, TypeVar, Any, Optional
from functools import wraps
from datetime import datetime, timedelta
from enum import Enum
import random

logger = logging.getLogger(__name__)

T = TypeVar("T")


class RetryConfig:
    """Configuration for retry behavior"""
    max_retries: int = 3
    base_delay: float = 1.0
    max_delay: float = 30.0
    exponential_base: float = 2.0
    jitter: bool = True


def retry_with_backoff(
    max_retries: int = 3,
    base_delay: float = 1.0,
    max_delay: float = 30.0,
    exceptions: tuple = (Exception,),
    on_retry: Optional[Callable] = None,
):
    """
    Retry decorator with exponential backoff and jitter
    
    Usage:
        @retry_with_backoff(max_retries=3, exceptions=(httpx.HTTPError,))
        async def call_external_api():
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        async def wrapper(*args, **kwargs) -> T:
            last_exception = None
            
            for attempt in range(max_retries + 1):
                try:
                    return await func(*args, **kwargs)
                except exceptions as e:
                    last_exception = e
                    
                    if attempt == max_retries:
                        logger.error(
                            f"All {max_retries + 1} attempts failed for {func.__name__}: {e}"
                        )
                        raise
                    
                    # Calculate delay with exponential backoff + jitter
                    delay = min(base_delay * (2 ** attempt), max_delay)
                    delay = delay * (0.5 + random.random())  # Add jitter
                    
                    logger.warning(
                        f"Attempt {attempt + 1}/{max_retries + 1} failed for {func.__name__}: {e}. "
                        f"Retrying in {delay:.2f}s..."
                    )
                    
                    if on_retry:
                        on_retry(attempt, e)
                    
                    await asyncio.sleep(delay)
            
            raise last_exception
        
        return wrapper
    return decorator


class CircuitState(Enum):
    CLOSED = "closed"      # Normal operation
    OPEN = "open"          # Failing, reject all calls
    HALF_OPEN = "half_open"  # Testing if service recovered


class CircuitBreaker:
    """
    Circuit breaker pattern for external services
    Prevents cascade failures and allows recovery
    
    Usage:
        dodo_breaker = CircuitBreaker(name="dodo", failure_threshold=5)
        
        async def call_dodo():
            async with dodo_breaker:
                return await dodo_service.create_payment(...)
    """
    
    def __init__(
        self,
        name: str,
        failure_threshold: int = 5,
        recovery_timeout: int = 30,
        success_threshold: int = 2,
    ):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time: Optional[datetime] = None
    
    async def __aenter__(self):
        if self.state == CircuitState.OPEN:
            # Check if recovery timeout passed
            if self.last_failure_time:
                elapsed = (datetime.utcnow() - self.last_failure_time).seconds
                if elapsed >= self.recovery_timeout:
                    self.state = CircuitState.HALF_OPEN
                    self.success_count = 0
                    logger.info(f"Circuit {self.name}: OPEN → HALF_OPEN")
                else:
                    raise CircuitOpenError(
                        f"Circuit {self.name} is OPEN. Retry in {self.recovery_timeout - elapsed}s"
                    )
        
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if exc_type is None:
            # Success
            self._record_success()
        else:
            # Failure
            self._record_failure()
        
        return False  # Don't suppress exceptions
    
    def _record_success(self):
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                logger.info(f"Circuit {self.name}: HALF_OPEN → CLOSED")
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0  # Reset on success
    
    def _record_failure(self):
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            logger.warning(f"Circuit {self.name}: HALF_OPEN → OPEN")
        elif self.state == CircuitState.CLOSED:
            if self.failure_count >= self.failure_threshold:
                self.state = CircuitState.OPEN
                logger.warning(f"Circuit {self.name}: CLOSED → OPEN (failures: {self.failure_count})")


class CircuitOpenError(Exception):
    """Raised when circuit breaker is open"""
    pass


class BackgroundTaskManager:
    """
    Manages background tasks with proper error handling
    """
    
    def __init__(self):
        self._tasks: list[asyncio.Task] = []
    
    def add_task(self, coro, name: str = None):
        """Add a coroutine to run in background"""
        task = asyncio.create_task(self._wrap_task(coro, name))
        self._tasks.append(task)
        return task
    
    async def _wrap_task(self, coro, name: str):
        """Wrap task with error handling"""
        try:
            return await coro
        except Exception as e:
            logger.error(f"Background task {name or 'unnamed'} failed: {e}")
            raise
    
    async def shutdown(self):
        """Cancel all pending tasks"""
        for task in self._tasks:
            if not task.done():
                task.cancel()
        
        if self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)


# Global instances
task_manager = BackgroundTaskManager()

# Circuit breakers for external services
dodo_circuit = CircuitBreaker(name="dodo_payments", failure_threshold=5)
twilio_circuit = CircuitBreaker(name="twilio", failure_threshold=5)
groq_circuit = CircuitBreaker(name="groq", failure_threshold=3)
blockchain_circuit = CircuitBreaker(name="blockchain", failure_threshold=3)
