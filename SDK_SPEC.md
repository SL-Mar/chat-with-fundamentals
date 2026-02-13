# Chat-with-Fundamentals SDK Specification

> End-to-end spec for a **continuously running, autonomous** quantitative
> research & trading SDK. The system operates unattended 24/7: discovering
> papers, generating strategies, backtesting, self-improving, trading live,
> and maintaining its own data — all without human intervention.

---

## 0. Glossary

| Term | Definition |
|------|-----------|
| **Universe** | A set of tickers + their OHLCV/fundamental data stored in a per-universe Postgres DB |
| **Strategy** | A user-defined Python class that emits orders on each rebalance |
| **Backtest** | An event-driven simulation that feeds historical bars to a Strategy |
| **Paper** | An ArXiv paper whose methodology is extracted and turned into a Strategy |
| **Memory** | A persistent key-value + vector store that agents read/write between sessions |
| **Runner** | A live execution engine that connects a Strategy to TWS (Interactive Brokers) |
| **Loop** | The self-improvement cycle: backtest → evaluate → learn → mutate → repeat |
| **Daemon** | The top-level always-on process that orchestrates all autonomous operations |
| **Scheduler** | Cron-like subsystem that triggers jobs on time/event schedules |
| **Heartbeat** | Periodic health signal; missed heartbeats trigger self-healing |
| **Event Bus** | Async pub/sub channel (Redis Streams) connecting all subsystems |
| **Circuit Breaker** | Pattern that stops retrying a failing subsystem until it recovers |
| **Runbook** | Persisted plan of action the daemon follows when anomalies occur |

---

## 0.1 Design Principles for Autonomous Operation

1. **No human in the loop.** Every subsystem must start, run, recover, and
   stop without manual intervention. Humans can observe and override, never required.
2. **Crash-only design.** Every process can be killed at any time. State is
   always in Postgres or Redis, never only in memory. On restart, each process
   resumes from persisted state.
3. **Idempotent operations.** Every scheduled job can be re-run safely.
   Duplicate ingestion, duplicate backtests, duplicate orders are all no-ops.
4. **Observable by default.** Every action emits a structured event to the
   event bus. Dashboards and alerts consume these events — not logs.
5. **Graceful degradation.** If EODHD is down: use cached data. If the LLM is
   down: skip mutations but keep trading the current best strategy. If TWS
   disconnects: queue orders and reconnect with exponential backoff.
6. **Circuit breakers everywhere.** After N consecutive failures, stop
   hammering a dependency and wait for it to recover.

---

## A. Autonomous Daemon & Orchestrator

### A.1 Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          cwf-daemon                                 │
│                    (single long-running process)                    │
│                                                                     │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌───────────────┐   │
│  │ Scheduler │  │  Health    │  │  Event    │  │  Process      │   │
│  │ (APScheduler)│  Monitor  │  │  Bus      │  │  Supervisor   │   │
│  └─────┬─────┘  └─────┬─────┘  └─────┬─────┘  └───────┬───────┘   │
│        │              │              │                │             │
│        ▼              ▼              ▼                ▼             │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     Managed Processes                        │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────────┐  │   │
│  │  │ Universe │ │ Research │ │ Backtest  │ │ Improvement  │  │   │
│  │  │ Keeper   │ │ Scanner  │ │ Farm      │ │ Loop         │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └───────────────┘  │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                    │   │
│  │  │ TWS Live │ │ Risk     │ │ Reporter │                    │   │
│  │  │ Runner   │ │ Monitor  │ │          │                    │   │
│  │  └──────────┘ └──────────┘ └──────────┘                    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│                    ┌──────────────────┐                             │
│                    │  FastAPI (HTTP)   │  ← optional human UI       │
│                    └──────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
         │                    │                    │
    ┌────▼────┐         ┌────▼────┐         ┌────▼────┐
    │Postgres │         │  Redis  │         │  TWS    │
    │(state)  │         │(events) │         │(broker) │
    └─────────┘         └─────────┘         └─────────┘
```

### A.2 Location

```
backend/daemon/
├── __init__.py
├── main.py              # Entry point: start the daemon
├── scheduler.py         # Job scheduling (APScheduler)
├── supervisor.py        # Process lifecycle management
├── health.py            # Health checks + self-healing
├── event_bus.py         # Redis Streams pub/sub
├── circuit_breaker.py   # Circuit breaker pattern
├── state_machine.py     # Persisted state transitions
└── config.py            # Daemon-specific configuration
```

### A.3 Daemon Entry Point

```python
# backend/daemon/main.py

import asyncio
import logging
import signal
from datetime import datetime

from daemon.scheduler import Scheduler
from daemon.supervisor import ProcessSupervisor
from daemon.health import HealthMonitor
from daemon.event_bus import EventBus
from daemon.state_machine import DaemonState, DaemonStateMachine
from memory.store import memory

logger = logging.getLogger(__name__)


class CWFDaemon:
    """
    Top-level autonomous daemon. Runs forever.

    Lifecycle:
      STARTING → RUNNING → DRAINING → STOPPED
                    ↑          │
                    └── RECOVERING ←─ (on failure)
    """

    def __init__(self):
        self.event_bus = EventBus()
        self.health = HealthMonitor(self.event_bus)
        self.scheduler = Scheduler(self.event_bus)
        self.supervisor = ProcessSupervisor(self.event_bus)
        self.state = DaemonStateMachine()
        self._shutdown_event = asyncio.Event()

    async def start(self) -> None:
        """Boot the daemon. Blocks until shutdown signal."""
        await self.state.transition(DaemonState.STARTING)
        logger.info("CWF Daemon starting...")

        # 1. Connect infrastructure
        await self.event_bus.connect()
        await self.health.start()

        # 2. Recover any in-flight work from before crash/restart
        await self._recover_state()

        # 3. Register scheduled jobs
        self._register_jobs()

        # 4. Start the scheduler
        await self.scheduler.start()

        # 5. Start supervised processes
        await self.supervisor.start_all()

        await self.state.transition(DaemonState.RUNNING)
        await self.event_bus.publish("daemon", {
            "event": "daemon_started",
            "timestamp": datetime.utcnow().isoformat(),
        })

        logger.info("CWF Daemon running. Awaiting shutdown signal...")
        await self._shutdown_event.wait()

        # Graceful shutdown
        await self.state.transition(DaemonState.DRAINING)
        await self.supervisor.drain_all(timeout=60)
        await self.scheduler.stop()
        await self.health.stop()
        await self.event_bus.publish("daemon", {
            "event": "daemon_stopped",
            "timestamp": datetime.utcnow().isoformat(),
        })
        await self.event_bus.disconnect()
        await self.state.transition(DaemonState.STOPPED)

    async def _recover_state(self) -> None:
        """
        On startup, check for work that was in-flight when we last crashed.
        Resume or clean up as appropriate.
        """
        # Check for universe ingestions that were mid-flight
        await self.supervisor.recover("universe_keeper")
        # Check for backtests that were running
        await self.supervisor.recover("backtest_farm")
        # Check for improvement loops that were mid-iteration
        await self.supervisor.recover("improvement_loop")
        # Check if TWS runner was active
        await self.supervisor.recover("tws_runner")

    def _register_jobs(self) -> None:
        """Register all recurring autonomous jobs."""

        # ── Universe maintenance ──
        self.scheduler.add_job(
            name="universe_refresh",
            func="daemon.jobs.universe_refresh",
            trigger="cron",
            hour=2, minute=0,          # 2:00 AM daily
            description="Re-ingest OHLCV for all active universes, pick up new delistings",
        )
        self.scheduler.add_job(
            name="universe_extend",
            func="daemon.jobs.universe_extend",
            trigger="cron",
            day_of_week="sun", hour=3,  # Sunday 3:00 AM
            description="Extend universe end_date to today, ingest new tickers from ETF rebalance",
        )

        # ── Research ──
        self.scheduler.add_job(
            name="arxiv_scan",
            func="daemon.jobs.arxiv_scan",
            trigger="cron",
            hour=6, minute=0,          # 6:00 AM daily
            description="Scan ArXiv for new q-fin papers, extract methodologies, store in memory",
        )
        self.scheduler.add_job(
            name="paper_to_strategy",
            func="daemon.jobs.paper_to_strategy",
            trigger="cron",
            hour=7, minute=0,          # 7:00 AM daily
            description="Generate strategies from high-implementability papers, auto-backtest",
        )

        # ── Self-improvement ──
        self.scheduler.add_job(
            name="improvement_cycle",
            func="daemon.jobs.improvement_cycle",
            trigger="cron",
            day_of_week="mon,wed,fri", hour=20,  # MWF 8 PM
            description="Run N mutation iterations on each active strategy",
        )

        # ── Live trading ──
        self.scheduler.add_job(
            name="pre_market_check",
            func="daemon.jobs.pre_market_check",
            trigger="cron",
            day_of_week="mon-fri", hour=9, minute=0,  # 9:00 AM ET
            description="Verify TWS connection, positions match expected, no anomalies",
        )
        self.scheduler.add_job(
            name="live_rebalance",
            func="daemon.jobs.live_rebalance",
            trigger="cron",
            day_of_week="mon-fri", hour=9, minute=35,  # 9:35 AM ET
            description="Execute rebalance on all live strategies",
        )
        self.scheduler.add_job(
            name="post_market_reconcile",
            func="daemon.jobs.post_market_reconcile",
            trigger="cron",
            day_of_week="mon-fri", hour=16, minute=15,  # 4:15 PM ET
            description="Reconcile fills, compute daily P&L, store in memory",
        )

        # ── Reporting ──
        self.scheduler.add_job(
            name="daily_report",
            func="daemon.jobs.daily_report",
            trigger="cron",
            day_of_week="mon-fri", hour=17,  # 5:00 PM ET
            description="Generate daily performance report, send to Telegram",
        )
        self.scheduler.add_job(
            name="weekly_report",
            func="daemon.jobs.weekly_report",
            trigger="cron",
            day_of_week="sat", hour=10,  # Saturday 10:00 AM
            description="Weekly strategy leaderboard + improvement summary",
        )

        # ── Health ──
        self.scheduler.add_job(
            name="heartbeat",
            func="daemon.jobs.heartbeat",
            trigger="interval",
            seconds=30,
            description="Emit heartbeat, check all subsystems, trigger self-healing",
        )
        self.scheduler.add_job(
            name="memory_gc",
            func="daemon.jobs.memory_gc",
            trigger="cron",
            day_of_week="sun", hour=4,  # Sunday 4:00 AM
            description="Expire old memory entries, compact event bus streams",
        )

    def handle_shutdown(self) -> None:
        """Signal handler for SIGTERM/SIGINT."""
        logger.info("Shutdown signal received")
        self._shutdown_event.set()


def main():
    daemon = CWFDaemon()
    loop = asyncio.new_event_loop()

    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, daemon.handle_shutdown)

    loop.run_until_complete(daemon.start())


if __name__ == "__main__":
    main()
```

### A.4 Scheduler

```python
# backend/daemon/scheduler.py

import logging
from typing import Callable, Optional
from dataclasses import dataclass, field
from datetime import datetime

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.events import EVENT_JOB_ERROR, EVENT_JOB_EXECUTED

from daemon.event_bus import EventBus

logger = logging.getLogger(__name__)


@dataclass
class JobConfig:
    name: str
    func: str                      # dotted import path
    trigger: str                   # "cron" | "interval"
    description: str = ""
    enabled: bool = True
    max_retries: int = 3
    retry_delay_seconds: int = 60
    # Cron fields (optional)
    hour: Optional[int] = None
    minute: Optional[int] = None
    day_of_week: Optional[str] = None
    # Interval fields (optional)
    seconds: Optional[int] = None


class Scheduler:
    """
    APScheduler wrapper with:
    - Persistent job state (survives restarts via DB job store)
    - Automatic retry on failure
    - Event emission for every job start/complete/fail
    - Runtime enable/disable of individual jobs
    """

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self._scheduler = AsyncIOScheduler(
            job_defaults={"coalesce": True, "max_instances": 1},
        )
        self._jobs: dict[str, JobConfig] = {}
        self._retry_counts: dict[str, int] = {}

        self._scheduler.add_listener(self._on_job_executed, EVENT_JOB_EXECUTED)
        self._scheduler.add_listener(self._on_job_error, EVENT_JOB_ERROR)

    def add_job(self, **kwargs) -> None:
        config = JobConfig(**kwargs)
        self._jobs[config.name] = config

        if config.trigger == "cron":
            trigger = CronTrigger(
                hour=config.hour,
                minute=config.minute,
                day_of_week=config.day_of_week,
            )
        else:
            trigger = IntervalTrigger(seconds=config.seconds)

        self._scheduler.add_job(
            self._run_job,
            trigger=trigger,
            id=config.name,
            name=config.name,
            args=[config.name],
            replace_existing=True,
        )

    async def _run_job(self, job_name: str) -> None:
        """Execute a job by its name, with event emission."""
        config = self._jobs[job_name]
        if not config.enabled:
            return

        await self.event_bus.publish("scheduler", {
            "event": "job_started",
            "job": job_name,
            "timestamp": datetime.utcnow().isoformat(),
        })

        # Dynamic import and call
        module_path, func_name = config.func.rsplit(".", 1)
        import importlib
        module = importlib.import_module(module_path)
        func = getattr(module, func_name)
        await func()

    async def _on_job_executed(self, event) -> None:
        self._retry_counts.pop(event.job_id, None)
        await self.event_bus.publish("scheduler", {
            "event": "job_completed",
            "job": event.job_id,
            "timestamp": datetime.utcnow().isoformat(),
        })

    async def _on_job_error(self, event) -> None:
        job_name = event.job_id
        config = self._jobs.get(job_name)
        count = self._retry_counts.get(job_name, 0) + 1
        self._retry_counts[job_name] = count

        await self.event_bus.publish("scheduler", {
            "event": "job_failed",
            "job": job_name,
            "error": str(event.exception)[:500],
            "retry_count": count,
            "timestamp": datetime.utcnow().isoformat(),
        })

        if config and count >= config.max_retries:
            logger.error(f"Job {job_name} failed {count} times, disabling.")
            config.enabled = False
            await self.event_bus.publish("scheduler", {
                "event": "job_disabled",
                "job": job_name,
                "reason": f"exceeded max_retries ({config.max_retries})",
            })

    async def start(self) -> None:
        self._scheduler.start()
        logger.info(f"Scheduler started with {len(self._jobs)} jobs")

    async def stop(self) -> None:
        self._scheduler.shutdown(wait=True)

    def enable_job(self, name: str) -> None:
        if name in self._jobs:
            self._jobs[name].enabled = True
            self._retry_counts.pop(name, None)

    def disable_job(self, name: str) -> None:
        if name in self._jobs:
            self._jobs[name].enabled = False
```

### A.5 Event Bus (Redis Streams)

```python
# backend/daemon/event_bus.py

import json
import logging
from datetime import datetime
from typing import AsyncIterator, Optional
import redis.asyncio as aioredis

from core.config import settings

logger = logging.getLogger(__name__)


class EventBus:
    """
    Redis Streams-based event bus for decoupled communication.

    Every subsystem publishes events. Any subsystem can subscribe.
    Events are persisted in Redis and survive process restarts.
    Consumer groups ensure each subscriber processes each event exactly once.

    Streams:
      - daemon:     lifecycle events (started, stopped, heartbeat)
      - scheduler:  job started/completed/failed/disabled
      - universe:   ingestion progress, refresh, errors
      - research:   papers found, methodologies extracted, strategies generated
      - backtest:   started, completed, metrics
      - improve:    iteration started, mutation result, accepted/rejected
      - live:       connected, rebalance, order filled, P&L, disconnected
      - risk:       drawdown alert, position limit, circuit breaker triggered
      - health:     heartbeat, subsystem status, self-healing actions
    """

    def __init__(self, redis_url: str = None):
        self._url = redis_url or settings.redis_url
        self._redis: Optional[aioredis.Redis] = None

    async def connect(self) -> None:
        self._redis = aioredis.from_url(self._url, decode_responses=True)
        await self._redis.ping()
        logger.info("Event bus connected")

    async def disconnect(self) -> None:
        if self._redis:
            await self._redis.aclose()

    async def publish(self, stream: str, data: dict) -> str:
        """Publish an event to a stream. Returns the event ID."""
        data["_published_at"] = datetime.utcnow().isoformat()
        event_id = await self._redis.xadd(
            f"cwf:{stream}",
            {k: json.dumps(v) if not isinstance(v, str) else v for k, v in data.items()},
            maxlen=10_000,  # cap each stream at 10k events
        )
        return event_id

    async def subscribe(
        self,
        stream: str,
        group: str,
        consumer: str,
        block_ms: int = 5000,
    ) -> AsyncIterator[dict]:
        """
        Subscribe to a stream using consumer groups.
        Yields events one at a time. Blocks up to block_ms between events.
        Automatically acknowledges after yield.
        """
        stream_key = f"cwf:{stream}"

        # Create consumer group if it doesn't exist
        try:
            await self._redis.xgroup_create(stream_key, group, id="0", mkstream=True)
        except aioredis.ResponseError as e:
            if "BUSYGROUP" not in str(e):
                raise

        while True:
            results = await self._redis.xreadgroup(
                group, consumer, {stream_key: ">"}, count=1, block=block_ms,
            )
            if not results:
                continue
            for _, messages in results:
                for msg_id, fields in messages:
                    parsed = {}
                    for k, v in fields.items():
                        try:
                            parsed[k] = json.loads(v)
                        except (json.JSONDecodeError, TypeError):
                            parsed[k] = v
                    yield parsed
                    await self._redis.xack(stream_key, group, msg_id)

    async def get_recent(self, stream: str, count: int = 50) -> list[dict]:
        """Get the most recent N events from a stream (no consumer group)."""
        stream_key = f"cwf:{stream}"
        results = await self._redis.xrevrange(stream_key, count=count)
        events = []
        for msg_id, fields in results:
            parsed = {"_id": msg_id}
            for k, v in fields.items():
                try:
                    parsed[k] = json.loads(v)
                except (json.JSONDecodeError, TypeError):
                    parsed[k] = v
            events.append(parsed)
        return events

    async def trim(self, stream: str, max_len: int = 5000) -> None:
        """Trim a stream to max_len entries."""
        await self._redis.xtrim(f"cwf:{stream}", maxlen=max_len)
```

### A.6 State Machine (Persisted in Postgres)

```python
# backend/daemon/state_machine.py

import enum
import logging
from datetime import datetime
from typing import Optional

from sqlalchemy import text
from database.universe_db_manager import db_manager

logger = logging.getLogger(__name__)


class DaemonState(str, enum.Enum):
    STARTING = "starting"
    RUNNING = "running"
    RECOVERING = "recovering"
    DRAINING = "draining"
    STOPPED = "stopped"


class ProcessState(str, enum.Enum):
    """State for each managed subprocess."""
    IDLE = "idle"
    STARTING = "starting"
    RUNNING = "running"
    FAILED = "failed"
    RECOVERING = "recovering"
    STOPPING = "stopping"
    STOPPED = "stopped"
    CIRCUIT_OPEN = "circuit_open"   # circuit breaker tripped


# Valid transitions
DAEMON_TRANSITIONS = {
    DaemonState.STARTING: {DaemonState.RUNNING, DaemonState.RECOVERING},
    DaemonState.RUNNING: {DaemonState.DRAINING, DaemonState.RECOVERING},
    DaemonState.RECOVERING: {DaemonState.RUNNING, DaemonState.DRAINING},
    DaemonState.DRAINING: {DaemonState.STOPPED},
    DaemonState.STOPPED: {DaemonState.STARTING},
}

PROCESS_TRANSITIONS = {
    ProcessState.IDLE: {ProcessState.STARTING},
    ProcessState.STARTING: {ProcessState.RUNNING, ProcessState.FAILED},
    ProcessState.RUNNING: {ProcessState.STOPPING, ProcessState.FAILED},
    ProcessState.FAILED: {ProcessState.RECOVERING, ProcessState.STOPPED, ProcessState.CIRCUIT_OPEN},
    ProcessState.RECOVERING: {ProcessState.RUNNING, ProcessState.FAILED},
    ProcessState.STOPPING: {ProcessState.STOPPED},
    ProcessState.STOPPED: {ProcessState.STARTING, ProcessState.IDLE},
    ProcessState.CIRCUIT_OPEN: {ProcessState.RECOVERING, ProcessState.STOPPED},
}


class DaemonStateMachine:
    """Persists daemon state in Postgres so it survives crashes."""

    async def get(self) -> DaemonState:
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text("SELECT value FROM app_settings WHERE key = 'daemon_state'")
            )
            row = result.fetchone()
            if not row:
                return DaemonState.STOPPED
            return DaemonState(row.value.get("state", "stopped"))

    async def transition(self, new_state: DaemonState) -> None:
        current = await self.get()
        if new_state not in DAEMON_TRANSITIONS.get(current, set()):
            # Allow STARTING from any state on fresh boot
            if new_state != DaemonState.STARTING:
                raise ValueError(f"Invalid transition: {current} → {new_state}")

        await self._persist("daemon_state", {
            "state": new_state.value,
            "changed_at": datetime.utcnow().isoformat(),
            "previous": current.value,
        })
        logger.info(f"Daemon state: {current} → {new_state}")

    async def _persist(self, key: str, value: dict) -> None:
        import json
        async with db_manager.get_registry_session() as session:
            await session.execute(
                text("""
                    INSERT INTO app_settings (key, value, updated_at)
                    VALUES (:key, :val, NOW())
                    ON CONFLICT (key) DO UPDATE SET value = :val, updated_at = NOW()
                """),
                {"key": key, "val": json.dumps(value)},
            )
```

### A.7 Process Supervisor

```python
# backend/daemon/supervisor.py

import asyncio
import logging
from datetime import datetime
from typing import Optional

from daemon.event_bus import EventBus
from daemon.circuit_breaker import CircuitBreaker
from daemon.state_machine import ProcessState

logger = logging.getLogger(__name__)


class ManagedProcess:
    """A single managed subprocess with lifecycle tracking."""

    def __init__(self, name: str, start_fn, event_bus: EventBus):
        self.name = name
        self.start_fn = start_fn
        self.event_bus = event_bus
        self.state = ProcessState.IDLE
        self.task: Optional[asyncio.Task] = None
        self.circuit_breaker = CircuitBreaker(
            name=name,
            failure_threshold=5,
            recovery_timeout=300,  # 5 minutes
        )
        self.consecutive_failures = 0
        self.last_started: Optional[datetime] = None
        self.last_failed: Optional[datetime] = None

    async def start(self) -> None:
        if self.circuit_breaker.is_open:
            self.state = ProcessState.CIRCUIT_OPEN
            return
        self.state = ProcessState.STARTING
        self.last_started = datetime.utcnow()
        self.task = asyncio.create_task(self._run_with_supervision())

    async def _run_with_supervision(self) -> None:
        """Run the process. On crash, attempt auto-restart."""
        try:
            self.state = ProcessState.RUNNING
            self.consecutive_failures = 0
            await self.event_bus.publish("health", {
                "event": "process_started",
                "process": self.name,
            })
            await self.start_fn()
        except asyncio.CancelledError:
            self.state = ProcessState.STOPPED
        except Exception as e:
            self.state = ProcessState.FAILED
            self.last_failed = datetime.utcnow()
            self.consecutive_failures += 1
            self.circuit_breaker.record_failure()

            await self.event_bus.publish("health", {
                "event": "process_failed",
                "process": self.name,
                "error": str(e)[:500],
                "consecutive_failures": self.consecutive_failures,
            })
            logger.error(f"Process {self.name} failed: {e}")

            # Auto-restart with backoff
            if not self.circuit_breaker.is_open:
                delay = min(2 ** self.consecutive_failures, 300)  # max 5 min
                logger.info(f"Restarting {self.name} in {delay}s...")
                await asyncio.sleep(delay)
                self.state = ProcessState.RECOVERING
                await self.start()
            else:
                self.state = ProcessState.CIRCUIT_OPEN
                await self.event_bus.publish("risk", {
                    "event": "circuit_breaker_open",
                    "process": self.name,
                    "failures": self.consecutive_failures,
                })

    async def stop(self, timeout: float = 30) -> None:
        self.state = ProcessState.STOPPING
        if self.task and not self.task.done():
            self.task.cancel()
            try:
                await asyncio.wait_for(self.task, timeout=timeout)
            except (asyncio.TimeoutError, asyncio.CancelledError):
                pass
        self.state = ProcessState.STOPPED


class ProcessSupervisor:
    """Manages all long-running processes."""

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self._processes: dict[str, ManagedProcess] = {}

    def register(self, name: str, start_fn) -> None:
        self._processes[name] = ManagedProcess(name, start_fn, self.event_bus)

    async def start_all(self) -> None:
        for proc in self._processes.values():
            await proc.start()

    async def drain_all(self, timeout: float = 60) -> None:
        tasks = [proc.stop(timeout) for proc in self._processes.values()]
        await asyncio.gather(*tasks, return_exceptions=True)

    async def recover(self, name: str) -> None:
        """Check if a process needs recovery after daemon restart."""
        proc = self._processes.get(name)
        if proc and proc.state == ProcessState.FAILED:
            proc.circuit_breaker.record_success()  # give it another chance
            await proc.start()

    def get_status(self) -> dict[str, dict]:
        return {
            name: {
                "state": proc.state.value,
                "consecutive_failures": proc.consecutive_failures,
                "circuit_breaker_open": proc.circuit_breaker.is_open,
                "last_started": proc.last_started.isoformat() if proc.last_started else None,
                "last_failed": proc.last_failed.isoformat() if proc.last_failed else None,
            }
            for name, proc in self._processes.items()
        }
```

### A.8 Circuit Breaker

```python
# backend/daemon/circuit_breaker.py

import time
import logging

logger = logging.getLogger(__name__)


class CircuitBreaker:
    """
    Prevents hammering a failing dependency.

    States:
      CLOSED  → normal operation, requests pass through
      OPEN    → dependency is down, requests are blocked
      HALF_OPEN → testing if dependency recovered (one request allowed)

    After `failure_threshold` consecutive failures, circuit opens.
    After `recovery_timeout` seconds, circuit moves to half-open.
    One success in half-open closes the circuit. One failure re-opens it.
    """

    def __init__(self, name: str, failure_threshold: int = 5, recovery_timeout: int = 300):
        self.name = name
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self._failures = 0
        self._last_failure_time = 0.0
        self._state = "closed"

    @property
    def is_open(self) -> bool:
        if self._state == "open":
            # Check if recovery timeout has elapsed
            if time.time() - self._last_failure_time > self.recovery_timeout:
                self._state = "half_open"
                logger.info(f"Circuit {self.name}: open → half_open")
                return False
            return True
        return False

    def record_failure(self) -> None:
        self._failures += 1
        self._last_failure_time = time.time()
        if self._failures >= self.failure_threshold:
            self._state = "open"
            logger.warning(
                f"Circuit {self.name}: OPEN after {self._failures} failures"
            )

    def record_success(self) -> None:
        self._failures = 0
        if self._state == "half_open":
            self._state = "closed"
            logger.info(f"Circuit {self.name}: half_open → closed")
```

### A.9 Health Monitor

```python
# backend/daemon/health.py

import asyncio
import logging
from datetime import datetime, timedelta

from daemon.event_bus import EventBus

logger = logging.getLogger(__name__)


class HealthMonitor:
    """
    Continuously monitors all subsystems and triggers self-healing.

    Checks:
    - Postgres connectivity
    - Redis connectivity
    - TWS connection status
    - EODHD API reachability
    - LLM provider reachability
    - Scheduler job lag (jobs not running on time)
    - Memory pressure (Postgres DB size, Redis memory)
    - Strategy drift (live P&L vs backtest expectations)
    """

    def __init__(self, event_bus: EventBus):
        self.event_bus = event_bus
        self._running = False
        self._task: asyncio.Task | None = None
        self._last_heartbeats: dict[str, datetime] = {}

    async def start(self) -> None:
        self._running = True
        self._task = asyncio.create_task(self._loop())

    async def stop(self) -> None:
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def _loop(self) -> None:
        while self._running:
            try:
                status = await self._check_all()
                await self.event_bus.publish("health", {
                    "event": "health_check",
                    "timestamp": datetime.utcnow().isoformat(),
                    "status": status,
                })

                # Trigger self-healing for any failing checks
                for name, check in status.items():
                    if not check["healthy"]:
                        await self._self_heal(name, check)

            except Exception as e:
                logger.error(f"Health check error: {e}")

            await asyncio.sleep(30)

    async def _check_all(self) -> dict:
        checks = {}
        checks["postgres"] = await self._check_postgres()
        checks["redis"] = await self._check_redis()
        checks["eodhd"] = await self._check_eodhd()
        checks["llm"] = await self._check_llm()
        return checks

    async def _check_postgres(self) -> dict:
        try:
            from database.universe_db_manager import db_manager
            from sqlalchemy import text
            async with db_manager.get_registry_session() as session:
                await session.execute(text("SELECT 1"))
            return {"healthy": True}
        except Exception as e:
            return {"healthy": False, "error": str(e)[:200]}

    async def _check_redis(self) -> dict:
        try:
            import redis.asyncio as aioredis
            from core.config import settings
            r = aioredis.from_url(settings.redis_url)
            await r.ping()
            await r.aclose()
            return {"healthy": True}
        except Exception as e:
            return {"healthy": False, "error": str(e)[:200]}

    async def _check_eodhd(self) -> dict:
        try:
            import urllib.request
            from core.config import settings
            url = f"https://eodhd.com/api/eod/AAPL.US?api_token={settings.eodhd_api_key}&fmt=json&from=2025-01-01&to=2025-01-02"
            with urllib.request.urlopen(url, timeout=10):
                pass
            return {"healthy": True}
        except Exception as e:
            return {"healthy": False, "error": str(e)[:200]}

    async def _check_llm(self) -> dict:
        try:
            from agents.llm.router import llm_router
            result = await llm_router.chat(
                system_prompt="Reply with OK",
                user_message="health check",
                temperature=0.0,
                max_tokens=10,
            )
            if result.error:
                return {"healthy": False, "error": result.error}
            return {"healthy": True}
        except Exception as e:
            return {"healthy": False, "error": str(e)[:200]}

    async def _self_heal(self, name: str, check: dict) -> None:
        """Attempt automatic recovery for a failing subsystem."""
        logger.warning(f"Self-healing: {name} is unhealthy: {check.get('error')}")
        await self.event_bus.publish("health", {
            "event": "self_healing",
            "subsystem": name,
            "error": check.get("error", ""),
            "timestamp": datetime.utcnow().isoformat(),
        })
        # Specific recovery actions are handled by the supervisor
        # based on the circuit breaker state of each process.
```

---

## B. Autonomous Job Definitions

### B.1 Location

```
backend/daemon/jobs/
├── __init__.py
├── universe_refresh.py
├── universe_extend.py
├── arxiv_scan.py
├── paper_to_strategy.py
├── improvement_cycle.py
├── pre_market_check.py
├── live_rebalance.py
├── post_market_reconcile.py
├── daily_report.py
├── weekly_report.py
├── heartbeat.py
├── memory_gc.py
```

### B.2 Key Job Implementations

```python
# backend/daemon/jobs/arxiv_scan.py

async def arxiv_scan() -> None:
    """
    Autonomous daily ArXiv scan.

    1. Search for new q-fin papers (last 24h).
    2. For each paper, extract methodology via LLM.
    3. Filter by implementability_score >= 3.
    4. Store in agent memory (category='paper').
    5. Emit event for paper_to_strategy job to pick up.
    """
    from research.arxiv_pipeline import search
    from research.paper_parser import extract_methodology
    from memory.store import memory
    from daemon.event_bus import EventBus

    bus = EventBus()
    await bus.connect()

    papers = search(
        query="stock returns OR factor model OR portfolio OR alpha",
        max_results=50,
        sort_by="submittedDate",
    )

    new_count = 0
    for paper in papers:
        # Skip if already processed
        existing = await memory.get("paper", f"arxiv_{paper.arxiv_id}")
        if existing:
            continue

        methodology = await extract_methodology(paper)
        score = methodology.get("implementability_score", 0)

        await memory.put("paper", f"arxiv_{paper.arxiv_id}", {
            "title": paper.title,
            "authors": paper.authors,
            "abstract": paper.abstract[:500],
            "methodology": methodology,
            "implementability_score": score,
            "status": "pending_generation" if score >= 3 else "low_implementability",
            "discovered_at": paper.published.isoformat(),
        })

        if score >= 3:
            new_count += 1
            await bus.publish("research", {
                "event": "paper_discovered",
                "arxiv_id": paper.arxiv_id,
                "title": paper.title,
                "implementability_score": score,
            })

    await bus.publish("research", {
        "event": "arxiv_scan_complete",
        "papers_scanned": len(papers),
        "new_implementable": new_count,
    })
    await bus.disconnect()
```

```python
# backend/daemon/jobs/paper_to_strategy.py

async def paper_to_strategy() -> None:
    """
    Autonomous strategy generation from discovered papers.

    1. Load papers with status='pending_generation' from memory.
    2. For each, generate a Strategy subclass via LLM.
    3. Validate the generated code (compiles, inherits Strategy).
    4. Auto-backtest on the default universe.
    5. Store results. If Sharpe > 0.3, mark as 'candidate'.
    """
    from memory.store import memory
    from research.strategy_generator import generate_strategy
    from backtest.engine import BacktestEngine, BacktestConfig
    from strategies.base import Strategy
    from daemon.event_bus import EventBus
    from datetime import date, timedelta

    bus = EventBus()
    await bus.connect()

    papers = await memory.list_by_category("paper", limit=100)
    pending = [p for p in papers if p.value.get("status") == "pending_generation"]

    for entry in pending[:5]:  # Process max 5 per run to limit LLM cost
        paper_data = entry.value
        arxiv_id = entry.key

        try:
            code = await generate_strategy(
                paper_data["methodology"],
                paper_data["title"],
            )

            # Validate: must compile and contain a Strategy subclass
            namespace = {}
            exec(code, namespace)
            strategy_cls = None
            for obj in namespace.values():
                if isinstance(obj, type) and issubclass(obj, Strategy) and obj is not Strategy:
                    strategy_cls = obj
                    break

            if not strategy_cls:
                paper_data["status"] = "generation_failed"
                paper_data["error"] = "No Strategy subclass found in generated code"
                await memory.put("paper", arxiv_id, paper_data)
                continue

            # Auto-backtest
            strategy = strategy_cls()
            config = BacktestConfig(
                universe_db_name="default_universe",  # configurable
                start_date=date.today() - timedelta(days=365 * 3),
                end_date=date.today() - timedelta(days=1),
            )
            engine = BacktestEngine(config)
            result = await engine.run(strategy)

            sharpe = result.metrics.get("sharpe_ratio", 0)
            paper_data["status"] = "candidate" if sharpe > 0.3 else "backtested_weak"
            paper_data["generated_code"] = code
            paper_data["backtest_metrics"] = result.metrics
            await memory.put("paper", arxiv_id, paper_data)

            await bus.publish("research", {
                "event": "strategy_generated",
                "arxiv_id": arxiv_id,
                "strategy_name": strategy.name,
                "sharpe": sharpe,
                "status": paper_data["status"],
            })

        except Exception as e:
            paper_data["status"] = "generation_failed"
            paper_data["error"] = str(e)[:500]
            await memory.put("paper", arxiv_id, paper_data)

    await bus.disconnect()
```

```python
# backend/daemon/jobs/improvement_cycle.py

async def improvement_cycle() -> None:
    """
    Autonomous self-improvement.

    1. Load all strategies with status='candidate' or 'live'.
    2. For each, run N improvement iterations.
    3. If improved version beats current, promote it.
    4. If a candidate exceeds the promotion threshold, flag for live deployment.
    """
    from memory.store import memory
    from loop.improver import StrategyImprover
    from strategies.base import Strategy
    from daemon.event_bus import EventBus
    from datetime import date, timedelta

    bus = EventBus()
    await bus.connect()

    # Load candidate strategies from memory
    papers = await memory.list_by_category("paper", limit=100)
    candidates = [p for p in papers if p.value.get("status") in ("candidate", "live")]

    for entry in candidates[:3]:  # Max 3 per cycle
        paper_data = entry.value
        code = paper_data.get("generated_code")
        if not code:
            continue

        try:
            namespace = {}
            exec(code, namespace)
            strategy = None
            for obj in namespace.values():
                if isinstance(obj, type) and issubclass(obj, Strategy) and obj is not Strategy:
                    strategy = obj()
                    break
            if not strategy:
                continue

            improver = StrategyImprover(
                strategy=strategy,
                universe_db_name="default_universe",
                start_date=date.today() - timedelta(days=365 * 3),
                end_date=date.today() - timedelta(days=1),
                max_iterations=5,
                min_sharpe=1.0,
                min_cagr=0.10,
                max_drawdown=-0.20,
            )
            result = await improver.run()

            final_sharpe = result["final_metrics"].get("sharpe_ratio", 0)

            # Update memory with improved version
            paper_data["backtest_metrics"] = result["final_metrics"]
            paper_data["improvement_history"] = result["history"]

            # Promotion threshold
            if final_sharpe >= 1.0 and paper_data["status"] != "live":
                paper_data["status"] = "promote_to_live"
                await bus.publish("improve", {
                    "event": "strategy_promoted",
                    "strategy_name": strategy.name,
                    "sharpe": final_sharpe,
                })

            await memory.put("paper", entry.key, paper_data)

            await bus.publish("improve", {
                "event": "improvement_complete",
                "strategy_name": strategy.name,
                "iterations": result["iterations_run"],
                "final_sharpe": final_sharpe,
            })

        except Exception as e:
            await bus.publish("improve", {
                "event": "improvement_failed",
                "arxiv_id": entry.key,
                "error": str(e)[:500],
            })

    await bus.disconnect()
```

```python
# backend/daemon/jobs/live_rebalance.py

async def live_rebalance() -> None:
    """
    Autonomous live trading rebalance.

    1. Load all strategies with status='live'.
    2. For each, build PortfolioState from TWS + universe DB.
    3. Call strategy.rebalance(state).
    4. Submit orders to TWS.
    5. Wait for fills.
    6. Log everything to event bus.
    """
    from memory.store import memory
    from strategies.base import Strategy
    from live.tws_runner import TWSRunner
    from daemon.event_bus import EventBus

    bus = EventBus()
    await bus.connect()

    papers = await memory.list_by_category("paper", limit=100)
    live_strategies = [p for p in papers if p.value.get("status") == "live"]

    for entry in live_strategies:
        code = entry.value.get("generated_code")
        if not code:
            continue

        try:
            namespace = {}
            exec(code, namespace)
            strategy = None
            for obj in namespace.values():
                if isinstance(obj, type) and issubclass(obj, Strategy) and obj is not Strategy:
                    strategy = obj()
                    break
            if not strategy:
                continue

            runner = TWSRunner(
                strategy=strategy,
                universe_db_name="default_universe",
            )

            await runner._rebalance()

            await bus.publish("live", {
                "event": "rebalance_complete",
                "strategy_name": strategy.name,
            })

        except Exception as e:
            await bus.publish("live", {
                "event": "rebalance_failed",
                "strategy_name": entry.value.get("title", "unknown"),
                "error": str(e)[:500],
            })

    await bus.disconnect()
```

```python
# backend/daemon/jobs/post_market_reconcile.py

async def post_market_reconcile() -> None:
    """
    Autonomous end-of-day reconciliation.

    1. Pull actual positions + P&L from TWS.
    2. Compare with expected positions from last rebalance.
    3. Detect drift > threshold.
    4. Compute daily return for each live strategy.
    5. Check for strategy degradation (rolling 20-day Sharpe < 0).
    6. Store daily P&L in memory.
    7. If degradation detected, emit risk alert.
    """
    from daemon.event_bus import EventBus
    from memory.store import memory
    from datetime import date

    bus = EventBus()
    await bus.connect()

    # ... (TWS position pull + reconciliation logic)

    await bus.publish("live", {
        "event": "reconciliation_complete",
        "date": date.today().isoformat(),
    })
    await bus.disconnect()
```

```python
# backend/daemon/jobs/daily_report.py

async def daily_report() -> None:
    """
    Generate and send daily performance report.

    Contents:
    - Portfolio equity curve (today vs. yesterday)
    - Strategy-level P&L attribution
    - Improvement loop progress
    - New papers discovered
    - System health summary
    - Alerts/anomalies
    """
    from daemon.event_bus import EventBus
    from memory.store import memory
    from datetime import date
    import urllib.request
    import urllib.parse

    bus = EventBus()
    await bus.connect()

    # Build report from memory + event bus
    daily_results = await memory.list_by_category("strategy_result", limit=20)
    health_events = await bus.get_recent("health", count=100)
    research_events = await bus.get_recent("research", count=50)

    report_lines = [
        f"=== CWF Daily Report: {date.today()} ===",
        "",
    ]

    # Strategy performance
    for entry in daily_results[:5]:
        m = entry.value
        report_lines.append(
            f"  {entry.key}: Sharpe={m.get('sharpe_ratio','?')} "
            f"CAGR={m.get('cagr','?')} MaxDD={m.get('max_drawdown','?')}"
        )

    # New papers
    new_papers = [e for e in research_events if e.get("event") == "paper_discovered"]
    report_lines.append(f"\nNew implementable papers: {len(new_papers)}")

    # Health
    unhealthy = [e for e in health_events if e.get("event") == "self_healing"]
    report_lines.append(f"Self-healing events: {len(unhealthy)}")

    report = "\n".join(report_lines)

    # Send to Telegram
    try:
        encoded = urllib.parse.quote(report)
        url = f"http://localhost:5678/webhook/send-telegram?message={encoded}"
        urllib.request.urlopen(url, timeout=5)
    except Exception:
        pass

    await bus.publish("daemon", {
        "event": "daily_report_sent",
        "date": date.today().isoformat(),
    })
    await bus.disconnect()
```

```python
# backend/daemon/jobs/heartbeat.py

async def heartbeat() -> None:
    """
    Emit heartbeat every 30s. Stored in Redis for monitoring.
    External watchdog (systemd, Docker healthcheck) can poll this.
    """
    import redis.asyncio as aioredis
    from core.config import settings
    from datetime import datetime

    r = aioredis.from_url(settings.redis_url)
    await r.set("cwf:heartbeat", datetime.utcnow().isoformat(), ex=120)
    await r.aclose()
```

```python
# backend/daemon/jobs/memory_gc.py

async def memory_gc() -> None:
    """
    Garbage-collect expired memory entries and trim event bus streams.
    """
    from database.universe_db_manager import db_manager
    from sqlalchemy import text
    from daemon.event_bus import EventBus

    # Delete expired memory entries
    async with db_manager.get_registry_session() as session:
        await session.execute(text(
            "DELETE FROM agent_memory WHERE expires_at IS NOT NULL AND expires_at < NOW()"
        ))

    # Trim event bus streams
    bus = EventBus()
    await bus.connect()
    for stream in ["daemon", "scheduler", "universe", "research",
                    "backtest", "improve", "live", "risk", "health"]:
        await bus.trim(stream, max_len=5000)
    await bus.disconnect()
```

---

## C. Autonomous Daily Schedule

```
Time (ET)   Job                     What it does
─────────   ─────────────────────   ──────────────────────────────────────────
  02:00     universe_refresh        Re-ingest OHLCV for all universes (nightly)
  03:00*    universe_extend         Extend universe, ingest new tickers (Sundays)
  04:00*    memory_gc               Expire old memory, trim event streams (Sundays)
  06:00     arxiv_scan              Scan ArXiv for new papers
  07:00     paper_to_strategy       Generate strategies from papers, auto-backtest
  09:00     pre_market_check        Verify TWS, positions, no anomalies
  09:35     live_rebalance          Execute rebalance on all live strategies
  16:15     post_market_reconcile   Reconcile fills, compute daily P&L
  17:00     daily_report            Send performance report to Telegram
  10:00*    weekly_report           Strategy leaderboard (Saturdays)
  20:00†    improvement_cycle       Self-improvement loop (Mon/Wed/Fri)
  every 30s heartbeat               Health signal

  * = weekly only    † = Mon/Wed/Fri only
```

---

## D. Risk Monitor (Autonomous Safety Layer)

### D.1 Location

```
backend/daemon/risk_monitor.py
```

### D.2 Interface

```python
# backend/daemon/risk_monitor.py

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Optional

from daemon.event_bus import EventBus
from memory.store import memory

logger = logging.getLogger(__name__)


@dataclass
class RiskLimits:
    max_portfolio_drawdown: float = -0.15    # -15% from peak
    max_strategy_drawdown: float = -0.20     # -20% per strategy
    max_daily_loss: float = -0.03            # -3% in one day
    max_position_pct: float = 0.10           # 10% max single position
    max_sector_pct: float = 0.30             # 30% max single sector
    max_correlation_to_spy: float = 0.95     # avoid closet indexing
    min_rolling_sharpe_20d: float = -0.5     # deactivate if Sharpe < -0.5
    max_consecutive_loss_days: int = 10


class RiskMonitor:
    """
    Always-on risk monitor. Runs as a subscriber to the event bus.
    Can autonomously:
    - Flatten all positions (emergency stop)
    - Deactivate a strategy (move from 'live' to 'suspended')
    - Send Telegram alerts
    - Block rebalance if limits breached
    """

    def __init__(self, limits: RiskLimits = None):
        self.limits = limits or RiskLimits()
        self.event_bus = EventBus()

    async def run(self) -> None:
        """Subscribe to live events and check risk limits."""
        await self.event_bus.connect()

        async for event in self.event_bus.subscribe(
            stream="live",
            group="risk_monitor",
            consumer="risk_1",
        ):
            if event.get("event") == "rebalance_complete":
                await self._check_post_rebalance(event)
            elif event.get("event") == "reconciliation_complete":
                await self._check_post_reconcile(event)

    async def check_pre_rebalance(self, strategy_name: str) -> tuple[bool, str]:
        """
        Called before rebalance. Returns (allowed, reason).
        If not allowed, the rebalance is skipped.
        """
        entry = await memory.get("strategy_result", f"{strategy_name}_daily")
        if not entry:
            return True, ""

        metrics = entry.value
        rolling_sharpe = metrics.get("rolling_sharpe_20d", 0)
        if rolling_sharpe < self.limits.min_rolling_sharpe_20d:
            reason = (
                f"Rolling 20d Sharpe={rolling_sharpe:.2f} < "
                f"limit={self.limits.min_rolling_sharpe_20d}"
            )
            await self._alert(f"BLOCKED rebalance for {strategy_name}: {reason}")
            return False, reason

        daily_pnl = metrics.get("daily_pnl_pct", 0)
        if daily_pnl < self.limits.max_daily_loss:
            reason = f"Daily loss={daily_pnl:.2%} exceeds limit={self.limits.max_daily_loss:.2%}"
            await self._alert(f"BLOCKED rebalance for {strategy_name}: {reason}")
            return False, reason

        return True, ""

    async def _check_post_rebalance(self, event: dict) -> None:
        """Check position concentration limits after rebalance."""
        # Implementation: pull positions from TWS, check max_position_pct, max_sector_pct
        pass

    async def _check_post_reconcile(self, event: dict) -> None:
        """Check drawdown and streak limits after daily reconciliation."""
        # If drawdown exceeds limit, flatten all positions
        pass

    async def emergency_flatten(self, reason: str) -> None:
        """EMERGENCY: close all positions immediately."""
        logger.critical(f"EMERGENCY FLATTEN: {reason}")
        await self.event_bus.publish("risk", {
            "event": "emergency_flatten",
            "reason": reason,
        })
        await self._alert(f"EMERGENCY FLATTEN: {reason}")
        # The TWSRunner listens for this event and closes all positions

    async def _alert(self, message: str) -> None:
        """Send alert via Telegram + event bus."""
        import urllib.request, urllib.parse
        await self.event_bus.publish("risk", {
            "event": "alert",
            "message": message,
        })
        try:
            encoded = urllib.parse.quote(f"[RISK] {message}")
            url = f"http://localhost:5678/webhook/send-telegram?message={encoded}"
            urllib.request.urlopen(url, timeout=5)
        except Exception:
            pass
```

---

## E. Docker Compose for Autonomous Mode

```yaml
# docker-compose.autonomous.yml — extends docker-compose.yml

services:
  postgres:
    extends:
      file: docker-compose.yml
      service: postgres

  redis:
    extends:
      file: docker-compose.yml
      service: redis

  daemon:
    build: ./backend
    container_name: cwf-daemon
    command: python -m daemon.main
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      - EODHD_API_KEY=${EODHD_API_KEY}
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - DATABASE_URL=postgresql://postgres:postgres@cwf-db:5432/universe_registry
      - REDIS_URL=redis://cwf-redis:6379
    healthcheck:
      test: ["CMD", "python", "-c",
        "import redis; r=redis.Redis.from_url('redis://cwf-redis:6379'); import sys; v=r.get('cwf:heartbeat'); sys.exit(0 if v else 1)"]
      interval: 60s
      timeout: 10s
      retries: 3
      start_period: 30s
    deploy:
      resources:
        limits:
          memory: 4g
          cpus: '2.0'

  api:
    build: ./backend
    container_name: cwf-api
    command: uvicorn main:app --host 0.0.0.0 --port 8001
    restart: unless-stopped
    depends_on:
      - postgres
      - redis
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@cwf-db:5432/universe_registry
      - REDIS_URL=redis://cwf-redis:6379

volumes:
  cwf_postgres_data:
  cwf_redis_data:
```

---

## 1. Survivorship-Bias-Free Universe

### 1.1 Problem

The current `universe_populator.py` only ingests *currently listed* tickers
(via EODHD screener or ETF holdings).  Strategies trained on this universe
suffer survivorship bias because delisted companies (bankruptcies, take-privates,
M&A) are invisible.

### 1.2 Existing Code to Leverage

| File | What it gives us |
|------|-----------------|
| `tools/eodhd_client/exchange_data.py` → `get_exchange_symbols(exchange, delisted=1)` | Full symbol list including delisted tickers |
| `tools/eodhd_client/exchange_data.py` → `get_delisted_symbols(exchange, from_date, to_date)` | Delisted symbols with delisting date & reason |
| `tools/eodhd_client/historical_data.py` → `get_eod(symbol)` | OHLCV for any symbol (active or delisted) |
| `database/models/universe_registry.py` → `UniverseTicker` | Already has `ticker`, `ohlcv_status`, `fundamentals_status` |

### 1.3 Schema Changes

**`universe_tickers` table — add columns:**

```sql
ALTER TABLE universe_tickers
  ADD COLUMN is_delisted        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN delisted_date      DATE,
  ADD COLUMN delisting_reason   VARCHAR(200),
  ADD COLUMN last_traded_price  FLOAT;
```

**`universes` table — add column:**

```sql
ALTER TABLE universes
  ADD COLUMN include_delisted   BOOLEAN NOT NULL DEFAULT TRUE;
```

### 1.4 Implementation

**File:** `ingestion/universe_populator.py`

Add a new function called after the primary ticker screen:

```python
async def _fetch_delisted_tickers(
    client: EODHDClient,
    from_date: str,
    to_date: str,
) -> list[dict]:
    """Fetch US delisted tickers within the universe date range."""
    raw = await asyncio.to_thread(
        client.exchange.get_delisted_symbols,
        "US",
        from_date=from_date,
        to_date=to_date,
    )
    _wait_for_rate_limit()
    return [
        {
            "code": r["Code"],
            "name": r.get("Name", ""),
            "delisted_date": r.get("Delisting_Date"),
            "delisting_reason": r.get("Description", ""),
        }
        for r in raw
        if r.get("Code")
    ]
```

Wire into `populate_universe()` after step 3 (insert active tickers):

```python
if universe.include_delisted:
    delisted = await _fetch_delisted_tickers(client, from_date_str, to_date_str)
    async with db_manager.get_registry_session() as session:
        for d in delisted:
            ut = UniverseTicker(
                universe_id=universe_id,
                ticker=d["code"],
                company_name=d["name"],
                is_delisted=True,
                delisted_date=d.get("delisted_date"),
                delisting_reason=d.get("delisting_reason"),
            )
            session.add(ut)
    # Append delisted tickers to the ingestion list
    screened.extend(delisted)
```

The OHLCV ingestion loop (step 4) already processes every item in `screened`,
so delisted tickers get their historical price data ingested identically.

### 1.5 Backtest Integration

When the backtest engine loads the universe, it must:

1. Include delisted tickers in the price panel.
2. On the bar where `timestamp > delisted_date`, set price to `last_traded_price`
   and mark the position as force-closed (simulating a real delisting event).
3. This prevents look-ahead bias: the strategy can hold a stock that later gets
   delisted, and the backtest correctly penalizes it.

---

## 2. Strategy Base Class

### 2.1 Location

```
backend/strategies/base.py
backend/strategies/__init__.py
```

### 2.2 Interface

```python
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Optional


@dataclass
class Order:
    """A single order emitted by a strategy."""
    ticker: str
    side: str              # "buy" | "sell"
    quantity: float        # shares (fractional OK)
    order_type: str = "market"  # "market" | "limit"
    limit_price: Optional[float] = None
    reason: str = ""       # free-text rationale for logging


@dataclass
class PortfolioState:
    """Read-only snapshot passed to the strategy on each rebalance."""
    timestamp: datetime
    cash: float
    equity: float                          # cash + sum(positions * price)
    positions: dict[str, float]            # ticker → shares held
    prices: dict[str, float]               # ticker → current close price
    fundamentals: dict[str, dict]          # ticker → latest fundamental row (dict)
    bar_data: "pd.DataFrame"               # full OHLCV panel for the universe up to `timestamp`


class Strategy(ABC):
    """Base class for all strategies."""

    name: str = "Unnamed Strategy"
    rebalance_frequency: str = "monthly"   # "daily" | "weekly" | "monthly" | "quarterly"
    max_positions: int = 30
    position_size_method: str = "equal_weight"  # "equal_weight" | "risk_parity" | "custom"

    def __init__(self, params: dict | None = None):
        self.params = params or {}

    @abstractmethod
    def rebalance(self, state: PortfolioState) -> list[Order]:
        """
        Called on each rebalance date.

        Receives the current portfolio state (positions, prices, fundamentals,
        full historical bar data up to this point).

        Returns a list of Order objects. The backtest engine will execute them
        at the *next bar's open* to avoid look-ahead bias.
        """
        ...

    def on_start(self, state: PortfolioState) -> None:
        """Optional hook called once at the start of the backtest."""
        pass

    def on_end(self, state: PortfolioState) -> None:
        """Optional hook called once at the end of the backtest."""
        pass

    # ---- Convenience helpers (not abstract) ----

    def buy(self, ticker: str, quantity: float, reason: str = "") -> Order:
        return Order(ticker=ticker, side="buy", quantity=quantity, reason=reason)

    def sell(self, ticker: str, quantity: float, reason: str = "") -> Order:
        return Order(ticker=ticker, side="sell", quantity=quantity, reason=reason)

    def target_weights(
        self, weights: dict[str, float], state: PortfolioState
    ) -> list[Order]:
        """
        Convenience: given target portfolio weights {ticker: 0.05, ...},
        compute the trades needed to rebalance from current positions.
        Weights must sum to <= 1.0 (remainder stays in cash).
        """
        orders = []
        total_equity = state.equity
        for ticker, target_w in weights.items():
            target_value = total_equity * target_w
            current_shares = state.positions.get(ticker, 0)
            current_price = state.prices.get(ticker)
            if current_price is None or current_price <= 0:
                continue
            current_value = current_shares * current_price
            diff_value = target_value - current_value
            diff_shares = diff_value / current_price
            if abs(diff_shares) < 0.01:
                continue
            if diff_shares > 0:
                orders.append(self.buy(ticker, diff_shares))
            else:
                orders.append(self.sell(ticker, abs(diff_shares)))
        # Close positions not in target weights
        for ticker, shares in state.positions.items():
            if ticker not in weights and shares > 0:
                orders.append(self.sell(ticker, shares, reason="not in target"))
        return orders
```

### 2.3 Example Strategy

```python
# backend/strategies/examples/value_momentum.py

from strategies.base import Strategy, PortfolioState, Order
import numpy as np

class ValueMomentum(Strategy):
    name = "Value + Momentum Combo"
    rebalance_frequency = "monthly"
    max_positions = 20

    def rebalance(self, state: PortfolioState) -> list[Order]:
        scores = {}
        for ticker, fund in state.fundamentals.items():
            pe = fund.get("pe_ratio")
            price = state.prices.get(ticker)
            if pe is None or pe <= 0 or price is None:
                continue
            # Value: inverse PE z-score (computed later)
            value_score = 1.0 / pe
            # Momentum: 6-month return
            hist = state.bar_data[state.bar_data["ticker"] == ticker]
            if len(hist) < 126:
                continue
            mom = hist["close"].iloc[-1] / hist["close"].iloc[-126] - 1
            scores[ticker] = 0.5 * value_score + 0.5 * mom

        # Rank and pick top N
        ranked = sorted(scores, key=scores.get, reverse=True)[:self.max_positions]
        weights = {t: 1.0 / len(ranked) for t in ranked}
        return self.target_weights(weights, state)
```

---

## 3. Backtest Engine

### 3.1 Location

```
backend/backtest/engine.py
backend/backtest/metrics.py
backend/backtest/models.py
```

### 3.2 Data Flow

```
Universe DB (OHLCV + Fundamentals)
        │
        ▼
   ┌─────────┐      ┌──────────┐      ┌───────────┐
   │  Loader  │─────▶│  Engine   │─────▶│  Metrics  │
   └─────────┘      └──────────┘      └───────────┘
                          │
                     Strategy.rebalance()
```

### 3.3 Engine Interface

```python
# backend/backtest/engine.py

from dataclasses import dataclass
from datetime import date
from typing import Optional
import pandas as pd

from strategies.base import Strategy, PortfolioState, Order


@dataclass
class BacktestConfig:
    universe_db_name: str
    start_date: date
    end_date: date
    initial_capital: float = 1_000_000.0
    commission_bps: float = 5.0         # 5 basis points per trade
    slippage_bps: float = 5.0           # 5 basis points slippage
    margin_requirement: float = 1.0     # 1.0 = no leverage
    rebalance_frequency: str = "monthly"  # override strategy default if set
    benchmark_ticker: Optional[str] = "SPY"


@dataclass
class TradeRecord:
    timestamp: pd.Timestamp
    ticker: str
    side: str
    quantity: float
    price: float             # execution price (with slippage)
    commission: float
    reason: str


@dataclass
class BacktestResult:
    config: BacktestConfig
    strategy_name: str
    equity_curve: pd.Series          # date → portfolio value
    benchmark_curve: pd.Series       # date → benchmark value (if benchmark_ticker set)
    trades: list[TradeRecord]
    daily_returns: pd.Series
    metrics: dict                    # populated by metrics.py
    positions_over_time: pd.DataFrame  # date × ticker → shares


class BacktestEngine:
    """Event-driven backtest engine."""

    def __init__(self, config: BacktestConfig):
        self.config = config
        self._cash: float = config.initial_capital
        self._positions: dict[str, float] = {}
        self._trades: list[TradeRecord] = []
        self._equity_curve: list[tuple] = []

    async def run(self, strategy: Strategy) -> BacktestResult:
        """
        Main loop:
        1. Load universe OHLCV + fundamentals from the universe DB.
        2. Build a date index of rebalance dates.
        3. For each trading day:
           a. Update prices (mark-to-market).
           b. Handle delistings (force-close positions).
           c. If rebalance date: call strategy.rebalance(state).
           d. Execute orders at *next bar's open* with slippage + commission.
           e. Record equity.
        4. Compute metrics.
        """
        ohlcv, fundamentals = await self._load_data()
        dates = ohlcv[ohlcv["granularity"] == "d"]["timestamp"].sort_values().unique()

        rebalance_dates = self._compute_rebalance_dates(dates)

        strategy.on_start(self._build_state(dates[0], ohlcv, fundamentals))

        pending_orders: list[Order] = []

        for i, dt in enumerate(dates):
            prices = self._get_prices_at(ohlcv, dt)
            self._handle_delistings(dt, prices)

            # Execute pending orders at today's open
            if pending_orders:
                opens = self._get_opens_at(ohlcv, dt)
                self._execute_orders(pending_orders, opens, dt)
                pending_orders = []

            # Record equity
            equity = self._mark_to_market(prices)
            self._equity_curve.append((dt, equity))

            # Rebalance?
            if dt in rebalance_dates:
                state = self._build_state(dt, ohlcv, fundamentals)
                pending_orders = strategy.rebalance(state)

        strategy.on_end(self._build_state(dates[-1], ohlcv, fundamentals))

        return self._build_result(strategy, ohlcv)

    def _execute_orders(
        self, orders: list[Order], opens: dict[str, float], dt
    ) -> None:
        """Fill orders at open price with slippage and commission."""
        for order in orders:
            raw_price = opens.get(order.ticker)
            if raw_price is None or raw_price <= 0:
                continue  # skip unfillable

            # Apply slippage
            slip = raw_price * (self.config.slippage_bps / 10_000)
            fill_price = raw_price + slip if order.side == "buy" else raw_price - slip

            cost = order.quantity * fill_price
            commission = cost * (self.config.commission_bps / 10_000)

            if order.side == "buy":
                if self._cash < cost + commission:
                    continue  # insufficient cash
                self._cash -= cost + commission
                self._positions[order.ticker] = (
                    self._positions.get(order.ticker, 0) + order.quantity
                )
            else:
                held = self._positions.get(order.ticker, 0)
                actual_qty = min(order.quantity, held)
                if actual_qty <= 0:
                    continue
                self._cash += actual_qty * fill_price - commission
                self._positions[order.ticker] = held - actual_qty
                if self._positions[order.ticker] <= 0:
                    del self._positions[order.ticker]

            self._trades.append(TradeRecord(
                timestamp=dt,
                ticker=order.ticker,
                side=order.side,
                quantity=order.quantity,
                price=fill_price,
                commission=commission,
                reason=order.reason,
            ))

    async def _load_data(self) -> tuple[pd.DataFrame, pd.DataFrame]:
        """Load OHLCV and fundamentals from the universe database."""
        from database.universe_db_manager import db_manager
        db_name = self.config.universe_db_name
        async with db_manager.get_universe_session(db_name) as session:
            ohlcv_result = await session.execute(
                text(
                    "SELECT * FROM ohlcv WHERE granularity = 'd' "
                    "AND timestamp BETWEEN :start AND :end "
                    "ORDER BY ticker, timestamp"
                ),
                {"start": self.config.start_date, "end": self.config.end_date},
            )
            ohlcv = pd.DataFrame(ohlcv_result.fetchall(), columns=ohlcv_result.keys())

            fund_result = await session.execute(
                text("SELECT * FROM fundamentals ORDER BY ticker, date")
            )
            fundamentals = pd.DataFrame(fund_result.fetchall(), columns=fund_result.keys())

        return ohlcv, fundamentals
```

### 3.4 Metrics Module

```python
# backend/backtest/metrics.py

import numpy as np
import pandas as pd


def compute_metrics(
    equity_curve: pd.Series,
    benchmark_curve: pd.Series | None,
    trades: list,
    risk_free_rate: float = 0.04,
) -> dict:
    """Compute standard quant performance metrics."""
    returns = equity_curve.pct_change().dropna()
    trading_days = 252

    total_return = equity_curve.iloc[-1] / equity_curve.iloc[0] - 1
    n_years = len(returns) / trading_days
    cagr = (1 + total_return) ** (1 / max(n_years, 0.01)) - 1
    vol = returns.std() * np.sqrt(trading_days)
    sharpe = (cagr - risk_free_rate) / vol if vol > 0 else 0

    # Max drawdown
    cummax = equity_curve.cummax()
    drawdown = (equity_curve - cummax) / cummax
    max_drawdown = drawdown.min()
    calmar = cagr / abs(max_drawdown) if max_drawdown != 0 else 0

    # Sortino
    downside = returns[returns < 0].std() * np.sqrt(trading_days)
    sortino = (cagr - risk_free_rate) / downside if downside > 0 else 0

    # Win rate
    trade_pnls = _compute_trade_pnls(trades)
    win_rate = sum(1 for p in trade_pnls if p > 0) / max(len(trade_pnls), 1)
    profit_factor = (
        sum(p for p in trade_pnls if p > 0) / abs(sum(p for p in trade_pnls if p < 0))
        if any(p < 0 for p in trade_pnls)
        else float("inf")
    )

    result = {
        "total_return": round(total_return, 4),
        "cagr": round(cagr, 4),
        "volatility": round(vol, 4),
        "sharpe_ratio": round(sharpe, 2),
        "sortino_ratio": round(sortino, 2),
        "max_drawdown": round(max_drawdown, 4),
        "calmar_ratio": round(calmar, 2),
        "win_rate": round(win_rate, 4),
        "profit_factor": round(profit_factor, 2),
        "total_trades": len(trades),
        "avg_trade_pnl": round(np.mean(trade_pnls), 2) if trade_pnls else 0,
    }

    if benchmark_curve is not None:
        bench_returns = benchmark_curve.pct_change().dropna()
        aligned = pd.concat([returns, bench_returns], axis=1).dropna()
        if len(aligned) > 10:
            beta = aligned.iloc[:, 0].cov(aligned.iloc[:, 1]) / aligned.iloc[:, 1].var()
            alpha = cagr - (risk_free_rate + beta * (
                bench_returns.mean() * trading_days - risk_free_rate
            ))
            result["alpha"] = round(alpha, 4)
            result["beta"] = round(beta, 2)
            result["information_ratio"] = round(
                (returns - bench_returns).mean() / (returns - bench_returns).std()
                * np.sqrt(trading_days),
                2,
            )

    return result
```

---

## 4. ArXiv Paper Pipeline

### 4.1 Location

```
backend/research/arxiv_pipeline.py
backend/research/paper_parser.py
backend/research/strategy_generator.py
```

### 4.2 Data Flow

```
ArXiv API  ──search()──▶  Paper list
                              │
                         fetch(id)
                              │
                              ▼
                        PDF / abstract
                              │
                    extract_methodology()
                              │
                              ▼
                   Structured methodology JSON
                              │
                    generate_strategy()
                              │
                              ▼
                   Strategy subclass (Python code)
                              │
                       backtest + evaluate
```

### 4.3 Interface

```python
# backend/research/arxiv_pipeline.py

import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime


@dataclass
class ArxivPaper:
    arxiv_id: str
    title: str
    authors: list[str]
    abstract: str
    published: datetime
    pdf_url: str
    categories: list[str]


def search(
    query: str,
    max_results: int = 20,
    sort_by: str = "relevance",  # "relevance" | "lastUpdatedDate" | "submittedDate"
) -> list[ArxivPaper]:
    """
    Search ArXiv for quantitative finance papers.

    Examples:
        search("momentum factor cross-section")
        search("machine learning stock prediction")
        search("value investing fundamental analysis")
    """
    params = {
        "search_query": f"cat:q-fin.* AND ({query})",
        "start": 0,
        "max_results": max_results,
        "sortBy": sort_by,
        "sortOrder": "descending",
    }
    url = "http://export.arxiv.org/api/query?" + urllib.parse.urlencode(params)
    with urllib.request.urlopen(url, timeout=30) as resp:
        root = ET.fromstring(resp.read())

    ns = {"atom": "http://www.w3.org/2005/Atom"}
    papers = []
    for entry in root.findall("atom:entry", ns):
        papers.append(ArxivPaper(
            arxiv_id=entry.find("atom:id", ns).text.split("/abs/")[-1],
            title=entry.find("atom:title", ns).text.strip(),
            authors=[a.find("atom:name", ns).text for a in entry.findall("atom:author", ns)],
            abstract=entry.find("atom:summary", ns).text.strip(),
            published=datetime.fromisoformat(
                entry.find("atom:published", ns).text.replace("Z", "+00:00")
            ),
            pdf_url=next(
                (l.attrib["href"] for l in entry.findall("atom:link", ns)
                 if l.attrib.get("title") == "pdf"),
                "",
            ),
            categories=[c.attrib["term"] for c in entry.findall("atom:category", ns)],
        ))
    return papers


def fetch(arxiv_id: str) -> ArxivPaper:
    """Fetch a single paper by its ArXiv ID."""
    results = search(f"id:{arxiv_id}", max_results=1)
    if not results:
        raise ValueError(f"Paper not found: {arxiv_id}")
    return results[0]
```

### 4.4 Methodology Extraction

```python
# backend/research/paper_parser.py

from agents.llm.router import llm_router

EXTRACT_METHODOLOGY_PROMPT = """You are a quantitative finance researcher.
Given a paper's title and abstract, extract a structured methodology that
can be implemented as a trading strategy.

Return a JSON object with:
{
  "strategy_type": "momentum | value | quality | statistical_arbitrage | ml | multi_factor",
  "universe": "description of the stock universe used",
  "signals": [
    {"name": "signal_name", "formula": "how to compute it", "data_needed": "ohlcv | fundamentals | both"}
  ],
  "portfolio_construction": "equal_weight | risk_parity | optimization | custom",
  "rebalance_frequency": "daily | weekly | monthly | quarterly",
  "risk_management": "description of any risk controls mentioned",
  "lookback_periods": {"signal_name": "N days/months"},
  "key_findings": "one-sentence summary of the paper's main result",
  "implementability_score": 1-5  // 5 = easily implementable with OHLCV+fundamentals
}

If the paper is too theoretical or requires data we don't have, set
implementability_score to 1-2 and explain in key_findings."""


async def extract_methodology(paper: "ArxivPaper") -> dict:
    """Use LLM to extract implementable methodology from a paper."""
    user_msg = f"Title: {paper.title}\n\nAbstract: {paper.abstract}"
    result = await llm_router.chat(
        system_prompt=EXTRACT_METHODOLOGY_PROMPT,
        user_message=user_msg,
        temperature=0.0,
        max_tokens=2048,
    )
    # Parse JSON from response (reuse pipeline._extract_json)
    from agents.pipeline import _extract_json
    parsed = _extract_json(result.content)
    if not parsed:
        return {"error": "Failed to parse methodology", "raw": result.content[:500]}
    return parsed
```

### 4.5 Strategy Generation

```python
# backend/research/strategy_generator.py

from agents.llm.router import llm_router

GENERATE_STRATEGY_PROMPT = """You are a quantitative developer.
Given a structured methodology extracted from a research paper, write a
Python Strategy subclass.

The strategy MUST:
1. Inherit from `strategies.base.Strategy`
2. Implement `rebalance(self, state: PortfolioState) -> list[Order]`
3. Only use data available in `state.prices`, `state.fundamentals`, and `state.bar_data`
4. Use `self.target_weights(weights, state)` or `self.buy()`/`self.sell()` helpers
5. Handle missing data gracefully (skip tickers with NaN)

Available columns in state.fundamentals[ticker]:
  pe_ratio, pb_ratio, ps_ratio, roe, roa, roic, gross_margin, operating_margin,
  net_margin, revenue_growth_yoy, earnings_growth_yoy, debt_to_equity,
  current_ratio, free_cash_flow, market_cap, ev_ebitda, dividend_yield

Available columns in state.bar_data:
  ticker, timestamp, open, high, low, close, volume, adjusted_close

Return ONLY valid Python code. No markdown fencing. No explanation."""


async def generate_strategy(methodology: dict, paper_title: str) -> str:
    """Generate a Strategy subclass from an extracted methodology."""
    import json
    user_msg = (
        f"Paper: {paper_title}\n\n"
        f"Methodology:\n{json.dumps(methodology, indent=2)}"
    )
    result = await llm_router.chat(
        system_prompt=GENERATE_STRATEGY_PROMPT,
        user_message=user_msg,
        temperature=0.1,
        max_tokens=4096,
    )
    code = result.content.strip()
    # Strip markdown fences if present
    if code.startswith("```"):
        lines = code.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        code = "\n".join(lines)
    return code
```

---

## 5. Agent Memory

### 5.1 Location

```
backend/memory/store.py
backend/memory/models.py
```

### 5.2 Schema

**New table in the registry database:**

```sql
CREATE TABLE agent_memory (
    id            SERIAL PRIMARY KEY,
    category      VARCHAR(50)  NOT NULL,  -- 'strategy_result', 'paper', 'learning', 'user_pref'
    key           VARCHAR(200) NOT NULL,
    value         JSONB        NOT NULL,
    embedding     VECTOR(1536),           -- pgvector; nullable if no embedding needed
    created_at    TIMESTAMP DEFAULT NOW(),
    updated_at    TIMESTAMP DEFAULT NOW(),
    expires_at    TIMESTAMP,              -- optional TTL
    UNIQUE(category, key)
);

CREATE INDEX idx_memory_category ON agent_memory(category);
CREATE INDEX idx_memory_embedding ON agent_memory USING ivfflat (embedding vector_cosine_ops);
```

### 5.3 Interface

```python
# backend/memory/store.py

from dataclasses import dataclass
from datetime import datetime
from typing import Optional
import json

from sqlalchemy import text
from database.universe_db_manager import db_manager


@dataclass
class MemoryEntry:
    category: str
    key: str
    value: dict
    created_at: datetime
    updated_at: datetime


class MemoryStore:
    """Persistent structured knowledge store for agents."""

    async def put(self, category: str, key: str, value: dict) -> None:
        """Insert or update a memory entry."""
        async with db_manager.get_registry_session() as session:
            await session.execute(
                text("""
                    INSERT INTO agent_memory (category, key, value, updated_at)
                    VALUES (:cat, :key, :val, NOW())
                    ON CONFLICT (category, key)
                    DO UPDATE SET value = :val, updated_at = NOW()
                """),
                {"cat": category, "key": key, "val": json.dumps(value)},
            )

    async def get(self, category: str, key: str) -> Optional[MemoryEntry]:
        """Retrieve a single memory entry."""
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text("SELECT * FROM agent_memory WHERE category = :cat AND key = :key"),
                {"cat": category, "key": key},
            )
            row = result.fetchone()
            if not row:
                return None
            return MemoryEntry(
                category=row.category,
                key=row.key,
                value=row.value,
                created_at=row.created_at,
                updated_at=row.updated_at,
            )

    async def list_by_category(self, category: str, limit: int = 50) -> list[MemoryEntry]:
        """List all entries in a category, newest first."""
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text(
                    "SELECT * FROM agent_memory WHERE category = :cat "
                    "ORDER BY updated_at DESC LIMIT :lim"
                ),
                {"cat": category, "lim": limit},
            )
            return [
                MemoryEntry(
                    category=row.category,
                    key=row.key,
                    value=row.value,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
                for row in result.fetchall()
            ]

    async def search_similar(
        self, embedding: list[float], category: str = None, limit: int = 10
    ) -> list[MemoryEntry]:
        """Semantic search via pgvector cosine similarity."""
        where = "WHERE embedding IS NOT NULL"
        params = {"emb": str(embedding), "lim": limit}
        if category:
            where += " AND category = :cat"
            params["cat"] = category
        async with db_manager.get_registry_session() as session:
            result = await session.execute(
                text(
                    f"SELECT *, embedding <=> :emb AS distance FROM agent_memory "
                    f"{where} ORDER BY distance LIMIT :lim"
                ),
                params,
            )
            return [
                MemoryEntry(
                    category=row.category,
                    key=row.key,
                    value=row.value,
                    created_at=row.created_at,
                    updated_at=row.updated_at,
                )
                for row in result.fetchall()
            ]

    async def delete(self, category: str, key: str) -> None:
        """Delete a memory entry."""
        async with db_manager.get_registry_session() as session:
            await session.execute(
                text("DELETE FROM agent_memory WHERE category = :cat AND key = :key"),
                {"cat": category, "key": key},
            )


# Singleton
memory = MemoryStore()
```

### 5.4 Memory Categories

| Category | Key pattern | Value schema |
|----------|-------------|-------------|
| `strategy_result` | `{strategy_name}_{date}` | `{sharpe, cagr, max_dd, trades, config}` |
| `paper` | `arxiv_{id}` | `{title, methodology, implementability, generated_strategy}` |
| `learning` | `{strategy}_{iteration}` | `{what_worked, what_failed, mutation_applied, before_sharpe, after_sharpe}` |
| `user_pref` | `{setting_name}` | Any JSON |

---

## 6. TWS Live Runner

### 6.1 Location

```
backend/live/tws_runner.py
backend/live/ib_wrapper.py
backend/live/models.py
```

### 6.2 Dependencies

```
ibapi>=9.81.1  # Official Interactive Brokers TWS API
```

### 6.3 Interface (Daemon-Aware)

The TWSRunner operates as a **managed process** under the daemon supervisor.
It does not poll for rebalance times itself — the **scheduler** triggers
`live_rebalance` at the right time. The runner's job is to maintain a
persistent TWS connection, auto-reconnect on drops, listen to event bus
signals (including emergency flatten), and execute orders with risk gating.

```python
# backend/live/tws_runner.py

import asyncio
import logging
from datetime import datetime, time as dt_time
from typing import Optional

from ibapi.client import EClient
from ibapi.wrapper import EWrapper
from ibapi.contract import Contract
from ibapi.order import Order as IBOrder

from strategies.base import Strategy, PortfolioState
from daemon.event_bus import EventBus
from daemon.circuit_breaker import CircuitBreaker

logger = logging.getLogger(__name__)


class IBWrapper(EWrapper):
    """Receives callbacks from TWS."""

    def __init__(self):
        super().__init__()
        self.positions: dict[str, float] = {}
        self.prices: dict[str, float] = {}
        self.account_value: float = 0.0
        self.cash: float = 0.0
        self._order_id: int = 0
        self._pending_orders: dict[int, asyncio.Future] = {}
        self.connected = False

    def nextValidId(self, orderId: int):
        self._order_id = orderId
        self.connected = True

    def position(self, account, contract, pos, avgCost):
        if pos != 0:
            self.positions[contract.symbol] = pos
        elif contract.symbol in self.positions:
            del self.positions[contract.symbol]

    def tickPrice(self, reqId, tickType, price, attrib):
        if tickType == 4 and price > 0:
            self.prices[self._ticker_for_req(reqId)] = price

    def orderStatus(self, orderId, status, filled, remaining, *args):
        if status in ("Filled", "Cancelled", "Error"):
            fut = self._pending_orders.pop(orderId, None)
            if fut and not fut.done():
                fut.set_result(status)

    def error(self, reqId, errorCode, errorString, advancedOrderRejectJson=""):
        logger.error(f"TWS error {errorCode}: {errorString}")
        if errorCode in (1100, 1101, 1102, 2110):  # connection-related
            self.connected = False


class IBClient(EClient):
    def __init__(self, wrapper: IBWrapper):
        super().__init__(wrapper)


class TWSRunner:
    """
    Daemon-managed TWS connection.

    Lifecycle:
    - Daemon supervisor starts this as a managed process.
    - Maintains persistent TWS connection with auto-reconnect.
    - Listens to event bus for:
        - "risk:emergency_flatten" → close all positions immediately
        - rebalance is triggered by the scheduler, not by polling
    - All state persisted: if daemon restarts, TWSRunner reconnects
      and resumes from last known positions.
    """

    def __init__(
        self,
        host: str = "127.0.0.1",
        port: int = 7497,
        client_id: int = 1,
        universe_db_name: str = None,
    ):
        self.host = host
        self.port = port
        self.client_id = client_id
        self.universe_db_name = universe_db_name

        self.wrapper = IBWrapper()
        self.client = IBClient(self.wrapper)
        self.event_bus = EventBus()
        self.circuit_breaker = CircuitBreaker(
            name="tws", failure_threshold=5, recovery_timeout=120,
        )
        self._running = False

    async def start(self) -> None:
        """
        Main entry point (called by daemon supervisor).
        Connects to TWS, then runs two concurrent loops:
        1. Connection watchdog (reconnect on drop)
        2. Event bus listener (emergency flatten, etc.)
        """
        await self.event_bus.connect()
        await self._connect_tws()
        self._running = True

        await self.event_bus.publish("live", {
            "event": "tws_runner_started",
            "host": self.host,
            "port": self.port,
        })

        # Run both loops concurrently
        await asyncio.gather(
            self._connection_watchdog(),
            self._event_listener(),
        )

    async def stop(self) -> None:
        self._running = False
        self.client.disconnect()
        await self.event_bus.disconnect()

    async def _connect_tws(self) -> None:
        """Connect to TWS with exponential backoff."""
        import threading
        attempt = 0
        while self._running:
            if self.circuit_breaker.is_open:
                await self.event_bus.publish("live", {
                    "event": "tws_circuit_open",
                    "reason": "too many connection failures",
                })
                await asyncio.sleep(60)
                continue

            try:
                self.client.connect(self.host, self.port, self.client_id)
                thread = threading.Thread(target=self.client.run, daemon=True)
                thread.start()
                await asyncio.sleep(3)

                if self.wrapper.connected:
                    self.client.reqPositions()
                    self.circuit_breaker.record_success()
                    await self.event_bus.publish("live", {
                        "event": "tws_connected",
                        "attempt": attempt,
                    })
                    return
                else:
                    raise ConnectionError("TWS did not respond with nextValidId")

            except Exception as e:
                attempt += 1
                self.circuit_breaker.record_failure()
                delay = min(2 ** attempt, 300)
                logger.warning(f"TWS connect failed (attempt {attempt}): {e}. Retry in {delay}s")
                await self.event_bus.publish("live", {
                    "event": "tws_connect_failed",
                    "error": str(e)[:200],
                    "retry_in": delay,
                })
                await asyncio.sleep(delay)

    async def _connection_watchdog(self) -> None:
        """Monitor TWS connection, auto-reconnect on drop."""
        while self._running:
            if not self.wrapper.connected:
                logger.warning("TWS connection lost, reconnecting...")
                await self.event_bus.publish("live", {
                    "event": "tws_disconnected",
                })
                await self._connect_tws()
            await asyncio.sleep(10)

    async def _event_listener(self) -> None:
        """Listen to event bus for commands."""
        async for event in self.event_bus.subscribe(
            stream="risk",
            group="tws_runner",
            consumer="tws_1",
        ):
            if event.get("event") == "emergency_flatten":
                await self._emergency_flatten(event.get("reason", "unknown"))

    async def rebalance(self, strategy: Strategy) -> list[dict]:
        """
        Called by the scheduler (not internally polled).
        Returns list of fill records for logging.
        """
        from daemon.risk_monitor import RiskMonitor

        # Pre-rebalance risk check
        risk = RiskMonitor()
        allowed, reason = await risk.check_pre_rebalance(strategy.name)
        if not allowed:
            await self.event_bus.publish("live", {
                "event": "rebalance_blocked",
                "strategy": strategy.name,
                "reason": reason,
            })
            return []

        state = await self._build_state()
        orders = strategy.rebalance(state)

        fills = []
        for order in orders:
            status = await self._submit_order(order)
            fills.append({
                "ticker": order.ticker,
                "side": order.side,
                "quantity": order.quantity,
                "status": status,
            })
            await self.event_bus.publish("live", {
                "event": "order_filled" if status == "Filled" else "order_status",
                "ticker": order.ticker,
                "side": order.side,
                "quantity": order.quantity,
                "status": status,
            })

        return fills

    async def _submit_order(self, order) -> str:
        contract = Contract()
        contract.symbol = order.ticker
        contract.secType = "STK"
        contract.exchange = "SMART"
        contract.currency = "USD"

        ib_order = IBOrder()
        ib_order.action = "BUY" if order.side == "buy" else "SELL"
        ib_order.totalQuantity = int(order.quantity)
        ib_order.orderType = "MKT" if order.order_type == "market" else "LMT"
        if order.order_type == "limit":
            ib_order.lmtPrice = order.limit_price

        order_id = self.wrapper._order_id
        self.wrapper._order_id += 1

        fut = asyncio.get_event_loop().create_future()
        self.wrapper._pending_orders[order_id] = fut
        self.client.placeOrder(order_id, contract, ib_order)

        try:
            status = await asyncio.wait_for(fut, timeout=30)
            return status
        except asyncio.TimeoutError:
            return "Timeout"

    async def _emergency_flatten(self, reason: str) -> None:
        """Close ALL positions immediately."""
        logger.critical(f"EMERGENCY FLATTEN: {reason}")
        for ticker, qty in list(self.wrapper.positions.items()):
            if qty > 0:
                from strategies.base import Order
                await self._submit_order(Order(
                    ticker=ticker, side="sell", quantity=abs(qty),
                    reason=f"EMERGENCY: {reason}",
                ))
            elif qty < 0:
                from strategies.base import Order
                await self._submit_order(Order(
                    ticker=ticker, side="buy", quantity=abs(qty),
                    reason=f"EMERGENCY: {reason}",
                ))
        await self.event_bus.publish("live", {
            "event": "emergency_flatten_complete",
            "reason": reason,
        })

    async def _build_state(self) -> PortfolioState:
        import pandas as pd
        from database.universe_db_manager import db_manager
        from sqlalchemy import text

        fundamentals = {}
        bar_data = pd.DataFrame()
        if self.universe_db_name:
            async with db_manager.get_universe_session(self.universe_db_name) as session:
                result = await session.execute(text(
                    "SELECT DISTINCT ON (ticker) * FROM fundamentals "
                    "ORDER BY ticker, date DESC"
                ))
                for row in result.fetchall():
                    fundamentals[row.ticker] = dict(row._mapping)
                ohlcv_result = await session.execute(text(
                    "SELECT * FROM ohlcv WHERE granularity = 'd' ORDER BY ticker, timestamp"
                ))
                bar_data = pd.DataFrame(
                    ohlcv_result.fetchall(), columns=ohlcv_result.keys()
                )

        return PortfolioState(
            timestamp=datetime.now(),
            cash=self.wrapper.cash,
            equity=self.wrapper.account_value,
            positions=dict(self.wrapper.positions),
            prices=dict(self.wrapper.prices),
            fundamentals=fundamentals,
            bar_data=bar_data,
        )
```

---

## 7. Self-Improvement Loop

### 7.1 Location

```
backend/loop/improver.py
backend/loop/mutator.py
```

### 7.2 Data Flow

```
                    ┌──────────────────────────────────────────┐
                    │           Self-Improvement Loop          │
                    │                                          │
  ┌─────────┐      │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
  │  Memory  │◀────▶│  │ Evaluate │──│  Mutate  │──│Backtest│ │
  └─────────┘      │  └──────────┘  └──────────┘  └────────┘ │
                    │       │              ▲             │     │
                    │       └──────────────┘─────────────┘     │
                    │                                          │
                    └──────────────────────────────────────────┘
```

### 7.3 Interface

```python
# backend/loop/improver.py

import logging
from datetime import date
from typing import Optional

from backtest.engine import BacktestEngine, BacktestConfig, BacktestResult
from memory.store import memory
from strategies.base import Strategy

logger = logging.getLogger(__name__)


class StrategyImprover:
    """
    Runs a self-improvement loop:
    1. Backtest the current strategy.
    2. Evaluate results against thresholds.
    3. If underperforming, ask LLM to mutate the strategy.
    4. Backtest the mutated version.
    5. Keep the better version, store learnings in memory.
    6. Repeat up to max_iterations.
    """

    def __init__(
        self,
        strategy: Strategy,
        universe_db_name: str,
        start_date: date,
        end_date: date,
        max_iterations: int = 10,
        min_sharpe: float = 0.5,
        min_cagr: float = 0.05,
        max_drawdown: float = -0.25,
    ):
        self.strategy = strategy
        self.universe_db_name = universe_db_name
        self.start_date = start_date
        self.end_date = end_date
        self.max_iterations = max_iterations
        self.min_sharpe = min_sharpe
        self.min_cagr = min_cagr
        self.max_drawdown = max_drawdown

    async def run(self) -> dict:
        """Run the full improvement loop. Returns final metrics + history."""
        best_strategy = self.strategy
        best_result = await self._backtest(best_strategy)
        best_metrics = best_result.metrics

        history = [{"iteration": 0, "metrics": best_metrics, "mutation": None}]

        await memory.put("strategy_result", f"{best_strategy.name}_iter0", best_metrics)

        for i in range(1, self.max_iterations + 1):
            logger.info(
                f"Improvement iteration {i}/{self.max_iterations} — "
                f"current Sharpe={best_metrics.get('sharpe_ratio', 0)}"
            )

            # Check if we've met all targets
            if self._meets_targets(best_metrics):
                logger.info("All targets met, stopping early.")
                break

            # Load past learnings to inform mutation
            learnings = await memory.list_by_category("learning", limit=20)

            # Mutate
            mutated_code, mutation_desc = await self._mutate(
                best_strategy, best_metrics, learnings
            )
            if not mutated_code:
                logger.warning("Mutation failed, skipping iteration.")
                continue

            # Load mutated strategy
            mutated_strategy = self._load_strategy_from_code(mutated_code)
            if not mutated_strategy:
                logger.warning("Failed to load mutated strategy.")
                continue

            # Backtest mutated version
            mutated_result = await self._backtest(mutated_strategy)
            mutated_metrics = mutated_result.metrics

            # Compare
            improved = mutated_metrics.get("sharpe_ratio", 0) > best_metrics.get("sharpe_ratio", 0)

            # Store learning
            learning = {
                "iteration": i,
                "mutation": mutation_desc,
                "before_sharpe": best_metrics.get("sharpe_ratio", 0),
                "after_sharpe": mutated_metrics.get("sharpe_ratio", 0),
                "improved": improved,
                "what_worked": mutation_desc if improved else None,
                "what_failed": mutation_desc if not improved else None,
            }
            await memory.put("learning", f"{best_strategy.name}_iter{i}", learning)

            if improved:
                logger.info(
                    f"Improvement found! Sharpe: "
                    f"{best_metrics['sharpe_ratio']} → {mutated_metrics['sharpe_ratio']}"
                )
                best_strategy = mutated_strategy
                best_metrics = mutated_metrics
                best_result = mutated_result

            history.append({
                "iteration": i,
                "metrics": mutated_metrics,
                "mutation": mutation_desc,
                "accepted": improved,
            })

        # Store final result
        await memory.put(
            "strategy_result",
            f"{best_strategy.name}_final",
            best_metrics,
        )

        return {
            "final_metrics": best_metrics,
            "iterations_run": len(history) - 1,
            "history": history,
            "strategy_name": best_strategy.name,
        }

    def _meets_targets(self, metrics: dict) -> bool:
        return (
            metrics.get("sharpe_ratio", 0) >= self.min_sharpe
            and metrics.get("cagr", 0) >= self.min_cagr
            and metrics.get("max_drawdown", -1) >= self.max_drawdown
        )

    async def _backtest(self, strategy: Strategy) -> BacktestResult:
        config = BacktestConfig(
            universe_db_name=self.universe_db_name,
            start_date=self.start_date,
            end_date=self.end_date,
        )
        engine = BacktestEngine(config)
        return await engine.run(strategy)

    async def _mutate(
        self,
        strategy: Strategy,
        metrics: dict,
        learnings: list,
    ) -> tuple[Optional[str], Optional[str]]:
        """Ask LLM to suggest a mutation to the strategy."""
        from loop.mutator import mutate_strategy
        return await mutate_strategy(strategy, metrics, learnings)

    def _load_strategy_from_code(self, code: str) -> Optional[Strategy]:
        """Dynamically load a Strategy subclass from generated code."""
        namespace = {}
        try:
            exec(code, namespace)
        except Exception as e:
            logger.error(f"Failed to exec mutated strategy: {e}")
            return None
        # Find the Strategy subclass in the namespace
        for obj in namespace.values():
            if (
                isinstance(obj, type)
                and issubclass(obj, Strategy)
                and obj is not Strategy
            ):
                return obj()
        return None
```

### 7.4 Mutator

```python
# backend/loop/mutator.py

import json
from typing import Optional
import inspect

from agents.llm.router import llm_router
from strategies.base import Strategy

MUTATE_PROMPT = """You are a quantitative strategy optimizer. Given a strategy's
source code and its backtest metrics, suggest ONE specific improvement.

Rules:
1. Make exactly ONE change (don't rewrite everything).
2. Focus on the weakest metric.
3. If Sharpe is low, adjust signal weights or add a complementary signal.
4. If max drawdown is bad, add a risk filter (e.g., skip rebalance if SPY < 200-day MA).
5. If win rate is low, tighten entry criteria.
6. Learn from past failed mutations (provided as context).

Return ONLY a JSON object:
{
  "description": "one-sentence description of the mutation",
  "code": "complete Python code for the mutated Strategy subclass"
}"""


async def mutate_strategy(
    strategy: Strategy,
    metrics: dict,
    learnings: list,
) -> tuple[Optional[str], Optional[str]]:
    """Ask LLM to mutate a strategy based on metrics and learnings."""
    source = inspect.getsource(strategy.__class__)

    context = f"Current strategy code:\n```python\n{source}\n```\n\n"
    context += f"Backtest metrics:\n{json.dumps(metrics, indent=2)}\n\n"

    if learnings:
        context += "Past mutation learnings:\n"
        for entry in learnings[:10]:
            v = entry.value
            context += (
                f"- Mutation: {v.get('mutation', '?')} → "
                f"{'Improved' if v.get('improved') else 'Failed'} "
                f"(Sharpe {v.get('before_sharpe', '?')} → {v.get('after_sharpe', '?')})\n"
            )

    result = await llm_router.chat(
        system_prompt=MUTATE_PROMPT,
        user_message=context,
        temperature=0.3,
        max_tokens=4096,
    )

    from agents.pipeline import _extract_json
    parsed = _extract_json(result.content)
    if not parsed:
        return None, None

    return parsed.get("code"), parsed.get("description")
```

---

## 8. New Directory Structure

```
backend/
├── agents/           # (existing) LLM pipeline + prompts
├── backtest/         # NEW
│   ├── __init__.py
│   ├── engine.py     # BacktestEngine
│   ├── metrics.py    # compute_metrics()
│   └── models.py     # BacktestConfig, BacktestResult, TradeRecord
├── core/             # (existing) config
├── daemon/           # NEW — autonomous orchestration
│   ├── __init__.py
│   ├── main.py       # CWFDaemon entry point
│   ├── scheduler.py  # APScheduler wrapper
│   ├── supervisor.py # Process lifecycle management
│   ├── health.py     # Health checks + self-healing
│   ├── event_bus.py  # Redis Streams pub/sub
│   ├── circuit_breaker.py
│   ├── state_machine.py
│   ├── risk_monitor.py
│   ├── config.py     # Daemon-specific config
│   └── jobs/         # Scheduled autonomous jobs
│       ├── __init__.py
│       ├── universe_refresh.py
│       ├── universe_extend.py
│       ├── arxiv_scan.py
│       ├── paper_to_strategy.py
│       ├── improvement_cycle.py
│       ├── pre_market_check.py
│       ├── live_rebalance.py
│       ├── post_market_reconcile.py
│       ├── daily_report.py
│       ├── weekly_report.py
│       ├── heartbeat.py
│       └── memory_gc.py
├── database/         # (existing) models + DB manager
├── ingestion/        # (existing) universe_populator — modified for delisted tickers
├── live/             # NEW
│   ├── __init__.py
│   ├── tws_runner.py # TWSRunner (daemon-aware)
│   ├── ib_wrapper.py # IBWrapper, IBClient
│   └── models.py
├── loop/             # NEW
│   ├── __init__.py
│   ├── improver.py   # StrategyImprover
│   └── mutator.py    # mutate_strategy()
├── memory/           # NEW
│   ├── __init__.py
│   ├── store.py      # MemoryStore
│   └── models.py     # agent_memory table model
├── research/         # NEW
│   ├── __init__.py
│   ├── arxiv_pipeline.py    # search(), fetch()
│   ├── paper_parser.py      # extract_methodology()
│   └── strategy_generator.py # generate_strategy()
├── routers/          # (existing) FastAPI routers
├── sandbox/          # (existing) Docker executor
├── services/         # (existing) business logic
├── strategies/       # NEW
│   ├── __init__.py
│   ├── base.py       # Strategy, Order, PortfolioState
│   └── examples/
│       └── value_momentum.py
├── tools/            # (existing) EODHD client
├── main.py           # FastAPI app (HTTP API — optional human UI)
└── requirements.txt
```

---

## 9. New API Endpoints

Add to `backend/routers/`:

### 9.1 Backtest Router

```
POST   /api/backtest/run
  body: { strategy_code: str, universe_id: uuid, start_date, end_date, config: {} }
  returns: BacktestResult (equity_curve, metrics, trades)

GET    /api/backtest/{id}
  returns: stored BacktestResult

GET    /api/backtest/history
  returns: list of past backtests with summary metrics
```

### 9.2 Research Router

```
GET    /api/research/search?q=...&max_results=20
  returns: list[ArxivPaper]

POST   /api/research/extract
  body: { arxiv_id: str }
  returns: methodology JSON

POST   /api/research/generate-strategy
  body: { arxiv_id: str }
  returns: { strategy_code: str, methodology: dict }
```

### 9.3 Live Trading Router

```
POST   /api/live/start
  body: { strategy_code: str, universe_id: uuid, port: 7497, paper: true }
  returns: { runner_id: str, status: "connected" }

POST   /api/live/stop
  body: { runner_id: str }

GET    /api/live/status
  returns: { positions, equity, last_rebalance, orders_today }
```

### 9.4 Self-Improvement Router

```
POST   /api/loop/start
  body: { strategy_code: str, universe_id: uuid, max_iterations: 10, targets: {} }
  returns: SSE stream of { iteration, metrics, mutation, accepted }

GET    /api/loop/{id}/result
  returns: final StrategyImprover result
```

---

## 10. Dependencies to Add

```
# requirements.txt additions
ibapi>=9.81.1
pgvector>=0.3.0
apscheduler>=3.10.0
redis>=5.0.0         # async redis client (redis.asyncio)
```

The pgvector extension must be enabled in the registry database:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 11. Implementation Order

| Phase | What | Depends on |
|-------|------|-----------|
| **1** | `strategies/base.py` — Strategy, Order, PortfolioState | Nothing |
| **2** | `backtest/engine.py` + `backtest/metrics.py` | Phase 1 |
| **3** | Survivorship-bias patches to `ingestion/universe_populator.py` | Nothing |
| **4** | `memory/store.py` + migration | Nothing |
| **5** | `daemon/event_bus.py` + `daemon/circuit_breaker.py` + `daemon/state_machine.py` | Nothing |
| **6** | `daemon/health.py` + `daemon/supervisor.py` + `daemon/scheduler.py` | Phase 5 |
| **7** | `research/arxiv_pipeline.py` + `paper_parser.py` + `strategy_generator.py` | Phases 1, 4 |
| **8** | `loop/improver.py` + `loop/mutator.py` | Phases 1, 2, 4 |
| **9** | `live/tws_runner.py` (daemon-aware) | Phases 1, 5, 6 |
| **10** | `daemon/risk_monitor.py` | Phases 5, 9 |
| **11** | `daemon/jobs/*` — all scheduled jobs | Phases 1-10 |
| **12** | `daemon/main.py` — CWFDaemon | Phase 11 |
| **13** | API routers for all new modules | All phases |
| **14** | `docker-compose.autonomous.yml` | Phase 12 |

Phases 1-5 can be parallelized. Phase 6 depends on 5.
Phases 7-8 depend on 1+2+4. Phase 9 depends on 1+5+6.
The daemon (12) is the capstone that wires everything together.

---

## 12. Autonomous Operation Guarantees

| Property | How it's achieved |
|----------|------------------|
| **Starts automatically** | `docker-compose.autonomous.yml` with `restart: always` |
| **Survives crashes** | Crash-only design: all state in Postgres/Redis, daemon resumes from persisted state |
| **Survives dependency outages** | Circuit breakers on EODHD, LLM, TWS; graceful degradation per subsystem |
| **Self-heals** | HealthMonitor detects failures → ProcessSupervisor auto-restarts with backoff |
| **Self-improves** | Scheduled `improvement_cycle` runs MWF, mutations accumulate in memory |
| **Discovers new ideas** | Scheduled `arxiv_scan` + `paper_to_strategy` run daily, no human input needed |
| **Trades autonomously** | Scheduler triggers `live_rebalance` at 9:35 AM ET, risk monitor gates every order |
| **Prevents catastrophe** | RiskMonitor can emergency-flatten all positions; circuit breakers halt runaway failures |
| **Reports to humans** | Daily/weekly Telegram reports; event bus queryable via API for real-time dashboards |
| **Maintains data** | Nightly `universe_refresh`, weekly `universe_extend`, weekly `memory_gc` |
| **Observable** | Every action emits a structured event to Redis Streams; `/api/events` endpoint for streaming |
| **Idempotent** | Every job can be safely re-run; duplicate ingestion/backtests/orders are no-ops |
