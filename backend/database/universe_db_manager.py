"""Dynamic database manager — one database per universe."""

import logging
from contextlib import asynccontextmanager
from typing import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    AsyncEngine,
    create_async_engine,
    async_sessionmaker,
)

from core.config import settings
from database.models.universe_registry import Base as RegistryBase
from database.models.universe_data import UniverseBase

logger = logging.getLogger(__name__)


class UniverseDBManager:
    def __init__(self):
        self._registry_engine: AsyncEngine | None = None
        self._registry_session_factory: async_sessionmaker | None = None
        self._universe_engines: dict[str, AsyncEngine] = {}
        self._universe_session_factories: dict[str, async_sessionmaker] = {}

    def _make_url(self, db_name: str) -> str:
        base = settings.database_url
        # Replace last path segment with target db name
        parts = base.rsplit("/", 1)
        url = f"{parts[0]}/{db_name}"
        # Use asyncpg driver
        return url.replace("postgresql://", "postgresql+asyncpg://")

    async def init_registry(self) -> None:
        """Create registry engine and tables."""
        url = self._make_url("universe_registry")
        self._registry_engine = create_async_engine(url, pool_size=10, echo=False)
        self._registry_session_factory = async_sessionmaker(
            self._registry_engine, expire_on_commit=False
        )
        async with self._registry_engine.begin() as conn:
            await conn.run_sync(RegistryBase.metadata.create_all)
        logger.info("Registry database initialized")

    @asynccontextmanager
    async def get_registry_session(self) -> AsyncGenerator[AsyncSession, None]:
        async with self._registry_session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def create_universe_database(self, db_name: str) -> None:
        """Create a new database for a universe and set up tables."""
        # Use raw connection with AUTOCOMMIT for CREATE DATABASE
        admin_url = self._make_url("universe_registry")
        admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
        async with admin_engine.connect() as conn:
            # Check if DB already exists
            result = await conn.execute(
                text("SELECT 1 FROM pg_database WHERE datname = :name"),
                {"name": db_name},
            )
            if not result.scalar():
                await conn.execute(text(f'CREATE DATABASE "{db_name}"'))
                logger.info(f"Created database: {db_name}")
        await admin_engine.dispose()

        # Connect to new DB and create tables + TimescaleDB extension
        engine = await self._get_universe_engine(db_name)
        async with engine.begin() as conn:
            await conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE"))
            await conn.run_sync(UniverseBase.metadata.create_all)
            # Convert ohlcv to hypertable
            try:
                await conn.execute(
                    text(
                        "SELECT create_hypertable('ohlcv', 'timestamp', "
                        "if_not_exists => TRUE, migrate_data => TRUE)"
                    )
                )
            except Exception as e:
                logger.warning(f"Hypertable creation note: {e}")
        logger.info(f"Universe database ready: {db_name}")

    async def drop_universe_database(self, db_name: str) -> None:
        """Drop a universe database."""
        # Dispose engine if cached
        if db_name in self._universe_engines:
            await self._universe_engines[db_name].dispose()
            del self._universe_engines[db_name]
            del self._universe_session_factories[db_name]

        admin_url = self._make_url("universe_registry")
        admin_engine = create_async_engine(admin_url, isolation_level="AUTOCOMMIT")
        async with admin_engine.connect() as conn:
            # Terminate existing connections
            await conn.execute(
                text(
                    f"SELECT pg_terminate_backend(pid) FROM pg_stat_activity "
                    f"WHERE datname = :name AND pid <> pg_backend_pid()"
                ),
                {"name": db_name},
            )
            await conn.execute(text(f'DROP DATABASE IF EXISTS "{db_name}"'))
        await admin_engine.dispose()
        logger.info(f"Dropped database: {db_name}")

    async def _get_universe_engine(self, db_name: str) -> AsyncEngine:
        if db_name not in self._universe_engines:
            url = self._make_url(db_name)
            engine = create_async_engine(url, pool_size=5, echo=False)
            self._universe_engines[db_name] = engine
            self._universe_session_factories[db_name] = async_sessionmaker(
                engine, expire_on_commit=False
            )
        return self._universe_engines[db_name]

    @asynccontextmanager
    async def get_universe_session(self, db_name: str) -> AsyncGenerator[AsyncSession, None]:
        if db_name not in self._universe_session_factories:
            await self._get_universe_engine(db_name)
        async with self._universe_session_factories[db_name]() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def dispose_all(self) -> None:
        if self._registry_engine:
            await self._registry_engine.dispose()
        for engine in self._universe_engines.values():
            await engine.dispose()
        self._universe_engines.clear()
        self._universe_session_factories.clear()


db_manager = UniverseDBManager()
