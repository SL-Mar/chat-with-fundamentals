"""
Redis Caching Layer

Security:
- No sensitive data in cache keys
- Automatic expiration (TTL)
- Serialization validation

Robustness:
- Graceful fallback if Redis unavailable
- Connection pooling
- Error logging
"""

from .redis_cache import RedisCache, cache_key

__all__ = ['RedisCache', 'cache_key']
