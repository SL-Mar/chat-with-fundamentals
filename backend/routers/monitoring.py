"""
Monitoring & Metrics Router
Provides endpoints for cache metrics, database stats, and system health

Security: Rate-limited expensive operations to prevent DoS and cost escalation
"""

from fastapi import APIRouter, HTTPException, Request
from typing import Dict, Any, List
from datetime import datetime, timedelta
import logging
import psutil
import os
from slowapi import Limiter
from slowapi.util import get_remote_address
from sqlalchemy import text

from database.models.base import SessionLocal, engine
from database.queries_improved import ImprovedDatabaseQueries
from services.cache_warming_service import get_cache_warming_service
from services.data_refresh_pipeline import get_data_refresh_pipeline
from cache.redis_cache import RedisCache

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])
logger = logging.getLogger("monitoring")

# Rate limiter for expensive operations
limiter = Limiter(key_func=get_remote_address)


@router.get("/health")
async def health_check() -> Dict[str, Any]:
    """
    System health check

    Returns:
        - API status
        - Database connectivity
        - Redis connectivity
        - Cache warming service status
    """
    health = {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "checks": {}
    }

    # Check database
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        health["checks"]["database"] = {
            "status": "healthy",
            "message": "Database connection OK"
        }
    except Exception as e:
        health["status"] = "degraded"
        health["checks"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }

    # Check Redis
    try:
        redis_cache = RedisCache()
        if redis_cache.is_available():
            health["checks"]["redis"] = {
                "status": "healthy",
                "message": "Redis connection OK"
            }
        else:
            health["checks"]["redis"] = {
                "status": "degraded",
                "message": "Redis unavailable (graceful degradation active)"
            }
    except Exception as e:
        health["checks"]["redis"] = {
            "status": "degraded",
            "message": f"Redis error: {str(e)}"
        }

    # Check cache warming service
    try:
        service = get_cache_warming_service()
        service_status = service.get_status()
        is_running = service_status.get('is_running', False)
        health["checks"]["cache_warming"] = {
            "status": "healthy" if is_running else "stopped",
            "message": f"Cache warming service {'running' if is_running else 'stopped'}",
            "jobs": len(service_status.get('jobs', []))
        }
    except Exception as e:
        health["checks"]["cache_warming"] = {
            "status": "unknown",
            "message": f"Cache warming service error: {str(e)}"
        }

    return health


@router.get("/metrics/database")
async def database_metrics() -> Dict[str, Any]:
    """
    Database statistics and metrics

    Returns:
        - Table row counts
        - Database size
        - Connection pool status
        - Recent activity
    """
    db = SessionLocal()
    metrics = {}

    try:
        # Get table counts
        from database.models.core import Exchange, Sector, Industry, Company
        from database.models.financial import OHLCV, Fundamental, News, Dividend, InsiderTransaction

        metrics["table_counts"] = {
            "exchanges": db.query(Exchange).count(),
            "sectors": db.query(Sector).count(),
            "industries": db.query(Industry).count(),
            "companies": db.query(Company).count(),
            "ohlcv_records": db.query(OHLCV).count(),
            "fundamentals": db.query(Fundamental).count(),
            "news": db.query(News).count(),
            "dividends": db.query(Dividend).count(),
            "insider_transactions": db.query(InsiderTransaction).count()
        }

        # Get database size (PostgreSQL-specific)
        try:
            result = db.execute(
                text("SELECT pg_size_pretty(pg_database_size(current_database())) as size")
            ).fetchone()
            metrics["database_size"] = result[0] if result else "Unknown"
        except:
            metrics["database_size"] = "Unknown"

        # Get connection pool status
        pool = engine.pool
        metrics["connection_pool"] = {
            "size": pool.size(),
            "checked_in": pool.checkedin(),
            "checked_out": pool.checkedout(),
            "overflow": pool.overflow(),
            "capacity": pool.size() + pool.overflow()
        }

        # Get recent activity (last 24 hours)
        yesterday = datetime.now() - timedelta(days=1)

        # OHLCV uses 'date' field (no updated_at)
        recent_ohlcv = db.query(OHLCV).filter(OHLCV.date >= yesterday).count()
        recent_news = db.query(News).filter(News.created_at >= yesterday).count()

        metrics["recent_activity_24h"] = {
            "ohlcv_updates": recent_ohlcv,
            "news_articles": recent_news
        }

        metrics["timestamp"] = datetime.now().isoformat()

    except Exception as e:
        logger.error(f"Failed to get database metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database metrics: {str(e)}")
    finally:
        db.close()

    return metrics


@router.get("/metrics/cache")
async def cache_metrics() -> Dict[str, Any]:
    """
    Cache performance metrics

    Returns:
        - Cache hit rate (calculated from logs - simplified)
        - Redis memory usage
        - Cache warming status
    """
    metrics = {
        "timestamp": datetime.now().isoformat()
    }

    try:
        redis_cache = RedisCache()

        if redis_cache.is_available():
            # Get Redis info
            info = redis_cache.redis_client.info()

            metrics["redis"] = {
                "status": "available",
                "memory_used": info.get('used_memory_human', 'Unknown'),
                "memory_peak": info.get('used_memory_peak_human', 'Unknown'),
                "connected_clients": info.get('connected_clients', 0),
                "total_commands": info.get('total_commands_processed', 0),
                "uptime_days": info.get('uptime_in_days', 0)
            }

            # Get keyspace stats
            db_info = info.get('db0', {})
            if db_info:
                metrics["redis"]["keys_count"] = db_info.get('keys', 0)
                metrics["redis"]["expires_count"] = db_info.get('expires', 0)
            else:
                metrics["redis"]["keys_count"] = 0
                metrics["redis"]["expires_count"] = 0

        else:
            metrics["redis"] = {
                "status": "unavailable",
                "message": "Redis not available (graceful degradation active)"
            }

        # Get cache warming service status
        service = get_cache_warming_service()
        service_status = service.get_status()

        metrics["cache_warming"] = {
            "status": "running" if service_status.get('is_running') else "stopped",
            "scheduled_jobs": len(service_status.get('jobs', [])),
            "jobs": service_status.get('jobs', [])
        }

    except Exception as e:
        logger.error(f"Failed to get cache metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get cache metrics: {str(e)}")

    return metrics


@router.get("/metrics/system")
async def system_metrics() -> Dict[str, Any]:
    """
    System resource metrics

    Returns:
        - CPU usage
        - Memory usage
        - Disk usage
        - Process info
    """
    try:
        metrics = {
            "timestamp": datetime.now().isoformat(),
            "cpu": {
                "percent": psutil.cpu_percent(interval=1),
                "count": psutil.cpu_count(),
                "freq_mhz": psutil.cpu_freq().current if psutil.cpu_freq() else None
            },
            "memory": {
                "total_gb": round(psutil.virtual_memory().total / (1024**3), 2),
                "used_gb": round(psutil.virtual_memory().used / (1024**3), 2),
                "available_gb": round(psutil.virtual_memory().available / (1024**3), 2),
                "percent": psutil.virtual_memory().percent
            },
            "disk": {
                "total_gb": round(psutil.disk_usage('/').total / (1024**3), 2),
                "used_gb": round(psutil.disk_usage('/').used / (1024**3), 2),
                "free_gb": round(psutil.disk_usage('/').free / (1024**3), 2),
                "percent": psutil.disk_usage('/').percent
            },
            "process": {
                "pid": os.getpid(),
                "memory_mb": round(psutil.Process().memory_info().rss / (1024**2), 2),
                "cpu_percent": psutil.Process().cpu_percent(interval=0.1),
                "threads": psutil.Process().num_threads()
            }
        }

        return metrics

    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get system metrics: {str(e)}")


@router.get("/metrics/api-usage")
async def api_usage_metrics() -> Dict[str, Any]:
    """
    API usage statistics

    Returns:
        - EODHD API call counts
        - Rate limit status
        - Cost estimates
    """
    db = SessionLocal()

    try:
        from database.models.monitoring import DataIngestionLog, APIRateLimit

        # Get ingestion stats (last 24 hours)
        yesterday = datetime.now() - timedelta(days=1)

        ingestion_logs = db.query(DataIngestionLog).filter(
            DataIngestionLog.start_time >= yesterday
        ).all()

        metrics = {
            "timestamp": datetime.now().isoformat(),
            "last_24h": {
                "total_ingestions": len(ingestion_logs),
                "successful": len([log for log in ingestion_logs if log.status == 'success']),
                "failed": len([log for log in ingestion_logs if log.status == 'failed']),
                "in_progress": len([log for log in ingestion_logs if log.status == 'running'])
            }
        }

        # Get API rate limit status (using request_time instead of window_start)
        rate_limits = db.query(APIRateLimit).filter(
            APIRateLimit.request_time >= yesterday
        ).all()

        if rate_limits:
            # Count total API calls
            total_calls = len(rate_limits)
            metrics["last_24h"]["api_calls"] = total_calls

            # Estimate cost (assuming $0.001 per call)
            metrics["last_24h"]["estimated_cost_usd"] = round(total_calls * 0.001, 2)
        else:
            metrics["last_24h"]["api_calls"] = 0
            metrics["last_24h"]["estimated_cost_usd"] = 0.0

        return metrics

    except Exception as e:
        logger.error(f"Failed to get API usage metrics: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get API usage metrics: {str(e)}")
    finally:
        db.close()


@router.get("/dashboard")
async def monitoring_dashboard() -> Dict[str, Any]:
    """
    Combined monitoring dashboard

    Returns:
        - All metrics in one response
        - Health status
        - Quick stats
    """
    try:
        # Get all metrics
        health = await health_check()
        db_metrics = await database_metrics()
        cache_metrics_data = await cache_metrics()
        system = await system_metrics()
        api_usage = await api_usage_metrics()

        dashboard = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": health["status"],
            "health": health,
            "database": db_metrics,
            "cache": cache_metrics_data,
            "system": system,
            "api_usage": api_usage,
            "quick_stats": {
                "companies": db_metrics["table_counts"]["companies"],
                "ohlcv_records": db_metrics["table_counts"]["ohlcv_records"],
                "database_size": db_metrics["database_size"],
                "memory_usage_percent": system["memory"]["percent"],
                "cpu_usage_percent": system["cpu"]["percent"],
                "api_calls_24h": api_usage["last_24h"]["api_calls"],
                "cache_warming_status": cache_metrics_data["cache_warming"]["status"]
            }
        }

        return dashboard

    except Exception as e:
        logger.error(f"Failed to get dashboard: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get dashboard: {str(e)}")


@router.post("/cache-warming/start")
async def start_cache_warming():
    """Manually start cache warming service"""
    try:
        service = get_cache_warming_service()
        service.start()
        return {"status": "success", "message": "Cache warming service started"}
    except Exception as e:
        logger.error(f"Failed to start cache warming: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start cache warming: {str(e)}")


@router.post("/cache-warming/stop")
async def stop_cache_warming():
    """Manually stop cache warming service"""
    try:
        service = get_cache_warming_service()
        service.stop()
        return {"status": "success", "message": "Cache warming service stopped"}
    except Exception as e:
        logger.error(f"Failed to stop cache warming: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop cache warming: {str(e)}")


@router.post("/cache-warming/trigger")
@limiter.limit("5/hour")  # Max 5 triggers per hour to prevent cost escalation
async def trigger_cache_warming(request: Request):
    """Manually trigger full cache warming (rate-limited: 5/hour)"""
    try:
        service = get_cache_warming_service()
        # Run in background (don't wait for completion)
        import threading
        thread = threading.Thread(target=service.warm_all_caches)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "Cache warming triggered in background"
        }
    except Exception as e:
        logger.error(f"Failed to trigger cache warming: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger cache warming: {str(e)}")


# ──────────────────────────────────────────────────────────────────────
# Data Refresh Pipeline Endpoints
# ──────────────────────────────────────────────────────────────────────

@router.get("/refresh-pipeline/status")
async def get_refresh_pipeline_status():
    """
    Get data refresh pipeline status

    Returns:
        - Pipeline running status
        - Scheduled jobs
        - Last refresh times for each data type
    """
    try:
        pipeline = get_data_refresh_pipeline()
        status = pipeline.get_status()
        return status
    except Exception as e:
        logger.error(f"Failed to get refresh pipeline status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get refresh pipeline status: {str(e)}")


@router.post("/refresh-pipeline/start")
async def start_refresh_pipeline():
    """Start data refresh pipeline service"""
    try:
        pipeline = get_data_refresh_pipeline()
        pipeline.start()
        return {"status": "success", "message": "Data refresh pipeline started"}
    except Exception as e:
        logger.error(f"Failed to start refresh pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start refresh pipeline: {str(e)}")


@router.post("/refresh-pipeline/stop")
async def stop_refresh_pipeline():
    """Stop data refresh pipeline service"""
    try:
        pipeline = get_data_refresh_pipeline()
        pipeline.stop()
        return {"status": "success", "message": "Data refresh pipeline stopped"}
    except Exception as e:
        logger.error(f"Failed to stop refresh pipeline: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to stop refresh pipeline: {str(e)}")


@router.post("/refresh-pipeline/trigger-daily")
@limiter.limit("3/hour")  # Max 3 daily refreshes per hour (expensive operation)
async def trigger_daily_refresh(request: Request):
    """
    Manually trigger daily data refresh (rate-limited: 3/hour)

    Runs:
    - OHLCV incremental refresh
    - Fundamentals smart refresh
    - News refresh
    """
    try:
        pipeline = get_data_refresh_pipeline()
        # Run in background (don't wait for completion)
        import threading
        thread = threading.Thread(target=pipeline.run_daily_refresh)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "Daily data refresh triggered in background",
            "details": "This will refresh OHLCV, fundamentals, and news for all companies"
        }
    except Exception as e:
        logger.error(f"Failed to trigger daily refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger daily refresh: {str(e)}")


@router.post("/refresh-pipeline/trigger-weekly")
@limiter.limit("3/hour")  # Max 3 weekly refreshes per hour
async def trigger_weekly_refresh(request: Request):
    """
    Manually trigger weekly data refresh (rate-limited: 3/hour)

    Runs:
    - Dividends refresh
    """
    try:
        pipeline = get_data_refresh_pipeline()
        # Run in background (don't wait for completion)
        import threading
        thread = threading.Thread(target=pipeline.run_weekly_refresh)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "Weekly data refresh triggered in background",
            "details": "This will refresh dividends for all companies"
        }
    except Exception as e:
        logger.error(f"Failed to trigger weekly refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger weekly refresh: {str(e)}")


@router.post("/refresh-pipeline/trigger-ohlcv")
@limiter.limit("5/hour")  # Max 5 OHLCV refreshes per hour
async def trigger_ohlcv_refresh(request: Request):
    """Manually trigger OHLCV incremental refresh only (rate-limited: 5/hour)"""
    try:
        pipeline = get_data_refresh_pipeline()
        import threading
        thread = threading.Thread(target=pipeline.refresh_ohlcv)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "OHLCV refresh triggered in background"
        }
    except Exception as e:
        logger.error(f"Failed to trigger OHLCV refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger OHLCV refresh: {str(e)}")


@router.post("/refresh-pipeline/trigger-fundamentals")
@limiter.limit("5/hour")  # Max 5 fundamentals refreshes per hour
async def trigger_fundamentals_refresh(request: Request):
    """Manually trigger fundamentals smart refresh only (rate-limited: 5/hour)"""
    try:
        pipeline = get_data_refresh_pipeline()
        import threading
        thread = threading.Thread(target=pipeline.refresh_fundamentals)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "Fundamentals refresh triggered in background"
        }
    except Exception as e:
        logger.error(f"Failed to trigger fundamentals refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger fundamentals refresh: {str(e)}")


@router.post("/refresh-pipeline/trigger-news")
@limiter.limit("5/hour")  # Max 5 news refreshes per hour
async def trigger_news_refresh(request: Request):
    """Manually trigger news incremental refresh only (rate-limited: 5/hour)"""
    try:
        pipeline = get_data_refresh_pipeline()
        import threading
        thread = threading.Thread(target=pipeline.refresh_news)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "News refresh triggered in background"
        }
    except Exception as e:
        logger.error(f"Failed to trigger news refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger news refresh: {str(e)}")


@router.post("/refresh-pipeline/trigger-dividends")
@limiter.limit("5/hour")  # Max 5 dividends refreshes per hour
async def trigger_dividends_refresh(request: Request):
    """Manually trigger dividends refresh only (rate-limited: 5/hour)"""
    try:
        pipeline = get_data_refresh_pipeline()
        import threading
        thread = threading.Thread(target=pipeline.refresh_dividends)
        thread.daemon = True
        thread.start()

        return {
            "status": "success",
            "message": "Dividends refresh triggered in background"
        }
    except Exception as e:
        logger.error(f"Failed to trigger dividends refresh: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to trigger dividends refresh: {str(e)}")
