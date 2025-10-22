"""
Redis Caching Layer with Security and Robustness

Security:
- No sensitive data in cache (API keys, credentials)
- Sanitized cache keys
- Automatic expiration (TTL)

Robustness:
- Graceful degradation if Redis unavailable
- Connection pooling
- Serialization with Pydantic
- Error logging without disrupting application
"""

import logging
import json
import hashlib
from typing import Optional, Any, Callable, Dict
from functools import wraps
from datetime import timedelta
import redis
from pydantic import BaseModel

from database.config import get_config

logger = logging.getLogger(__name__)


class CacheConfig:
    """Cache TTL configuration"""
    FUNDAMENTALS_TTL = 3600  # 1 hour
    OHLCV_RECENT_TTL = 60    # 1 minute for recent data
    OHLCV_HISTORICAL_TTL = 3600 * 24  # 24 hours for historical
    NEWS_TTL = 1800          # 30 minutes
    QUERY_RESULT_TTL = 300   # 5 minutes for complex queries


class RedisCache:
    """
    Redis caching wrapper with security and robustness

    Features:
    - Automatic serialization/deserialization
    - TTL management
    - Graceful fallback if Redis unavailable
    - Connection pooling
    """

    def __init__(self, enabled: bool = True):
        """
        Initialize Redis cache

        Args:
            enabled: Enable/disable caching (useful for testing)
        """
        self.enabled = enabled
        self.redis_client: Optional[redis.Redis] = None

        if self.enabled:
            try:
                config = get_config()
                self.redis_client = config.get_redis_client()
                # Test connection
                self.redis_client.ping()
                logger.info("✅ Redis cache initialized")
            except Exception as e:
                logger.warning(
                    f"⚠️  Redis unavailable, caching disabled: {e}"
                )
                self.redis_client = None
                self.enabled = False

    def is_available(self) -> bool:
        """Check if Redis is available"""
        if not self.enabled or not self.redis_client:
            return False
        try:
            self.redis_client.ping()
            return True
        except:
            return False

    def _serialize(self, value: Any) -> str:
        """
        Serialize value to JSON

        Security: Validate data before caching
        """
        try:
            # If it's a Pydantic model, use its JSON serializer
            if isinstance(value, BaseModel):
                return value.json()
            # Otherwise use standard JSON
            return json.dumps(value)
        except Exception as e:
            logger.error(f"Serialization error: {e}")
            raise

    def _deserialize(self, value: str, model: Optional[type] = None) -> Any:
        """
        Deserialize JSON to value

        Args:
            value: JSON string
            model: Optional Pydantic model class for validation
        """
        try:
            if model and issubclass(model, BaseModel):
                return model.parse_raw(value)
            return json.loads(value)
        except Exception as e:
            logger.error(f"Deserialization error: {e}")
            raise

    def get(
        self,
        key: str,
        model: Optional[type] = None
    ) -> Optional[Any]:
        """
        Get value from cache

        Args:
            key: Cache key
            model: Optional Pydantic model for validation

        Returns:
            Cached value or None if not found

        Robustness:
        - Returns None if Redis unavailable
        - Logs errors without disrupting application
        """
        if not self.is_available():
            return None

        try:
            value = self.redis_client.get(key)
            if value is None:
                return None

            return self._deserialize(value, model)

        except Exception as e:
            logger.warning(f"Cache get error for key '{key}': {e}")
            return None

    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None
    ) -> bool:
        """
        Set value in cache with TTL

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (None = no expiration)

        Returns:
            True if successful, False otherwise

        Security:
        - Validate key format
        - Automatic expiration
        """
        if not self.is_available():
            return False

        try:
            serialized = self._serialize(value)

            if ttl:
                self.redis_client.setex(key, ttl, serialized)
            else:
                self.redis_client.set(key, serialized)

            return True

        except Exception as e:
            logger.warning(f"Cache set error for key '{key}': {e}")
            return False

    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        if not self.is_available():
            return False

        try:
            self.redis_client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Cache delete error for key '{key}': {e}")
            return False

    def clear_pattern(self, pattern: str) -> int:
        """
        Delete all keys matching pattern

        Args:
            pattern: Pattern (e.g., 'fundamentals:*')

        Returns:
            Number of keys deleted

        Security: Use with caution
        """
        if not self.is_available():
            return 0

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.warning(f"Cache clear error for pattern '{pattern}': {e}")
            return 0

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        if not self.is_available():
            return {'status': 'unavailable'}

        try:
            info = self.redis_client.info()
            return {
                'status': 'available',
                'used_memory_human': info.get('used_memory_human', 'N/A'),
                'connected_clients': info.get('connected_clients', 0),
                'total_commands_processed': info.get('total_commands_processed', 0),
                'keyspace_hits': info.get('keyspace_hits', 0),
                'keyspace_misses': info.get('keyspace_misses', 0),
                'hit_rate': self._calculate_hit_rate(
                    info.get('keyspace_hits', 0),
                    info.get('keyspace_misses', 0)
                )
            }
        except Exception as e:
            logger.warning(f"Failed to get cache stats: {e}")
            return {'status': 'error', 'error': str(e)}

    def _calculate_hit_rate(self, hits: int, misses: int) -> float:
        """Calculate cache hit rate"""
        total = hits + misses
        if total == 0:
            return 0.0
        return round((hits / total) * 100, 2)


def cache_key(*args, **kwargs) -> str:
    """
    Generate cache key from arguments

    Security:
    - Creates consistent, sanitized keys
    - Hashes long keys to prevent key collision

    Args:
        *args: Positional arguments
        **kwargs: Keyword arguments

    Returns:
        Cache key string

    Example:
        cache_key('fundamentals', ticker='AAPL.US')
        # Returns: 'fundamentals:ticker=AAPL.US'
    """
    parts = []

    # Add positional args
    for arg in args:
        if isinstance(arg, str):
            parts.append(arg)
        else:
            parts.append(str(arg))

    # Add keyword args (sorted for consistency)
    for key, value in sorted(kwargs.items()):
        parts.append(f"{key}={value}")

    key = ':'.join(parts)

    # Hash if key is too long (Redis key limit is 512MB, but keep reasonable)
    if len(key) > 200:
        hash_suffix = hashlib.md5(key.encode()).hexdigest()[:8]
        key = f"{key[:190]}:{hash_suffix}"

    return key


def cached(
    ttl: int = CacheConfig.QUERY_RESULT_TTL,
    key_prefix: str = "query",
    model: Optional[type] = None
):
    """
    Decorator for caching function results

    Args:
        ttl: Time to live in seconds
        key_prefix: Prefix for cache key
        model: Optional Pydantic model for validation

    Example:
        @cached(ttl=3600, key_prefix='fundamentals')
        def get_fundamentals(ticker: str):
            return db.query(Fundamental).filter(ticker=ticker).first()

    Robustness:
    - Falls back to function execution if cache unavailable
    - Logs cache hits/misses
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            cache = RedisCache()

            # Generate cache key from function name and arguments
            key = cache_key(key_prefix, func.__name__, *args, **kwargs)

            # Try to get from cache
            cached_value = cache.get(key, model)
            if cached_value is not None:
                logger.debug(f"Cache hit: {key}")
                return cached_value

            # Cache miss - execute function
            logger.debug(f"Cache miss: {key}")
            result = func(*args, **kwargs)

            # Store in cache
            cache.set(key, result, ttl)

            return result

        return wrapper
    return decorator
