"""Universe data populator — screens tickers, fetches OHLCV + fundamentals."""

import asyncio
import logging
import time
import json
import urllib.request
import urllib.parse
from datetime import datetime
from typing import Optional

from sqlalchemy import select, text, update
from sqlalchemy.dialects.postgresql import insert as pg_insert

from core.config import settings
from database.universe_db_manager import db_manager
from database.models.universe_registry import (
    Universe, UniverseTicker, UniverseStatus, TickerStatus, SourceType,
)
from database.models.universe_data import UniverseOHLCV, UniverseFundamental
from tools.eodhd_client import EODHDClient

logger = logging.getLogger(__name__)

# Rate limiting: 60 requests per minute for EODHD
RATE_LIMIT_PER_MINUTE = 55  # Leave headroom
_request_times: list[float] = []


def _wait_for_rate_limit():
    """Block until rate limit window allows another request."""
    global _request_times
    now = time.time()
    _request_times = [t for t in _request_times if now - t < 60]
    if len(_request_times) >= RATE_LIMIT_PER_MINUTE:
        wait = 60 - (now - _request_times[0]) + 0.5
        logger.info(f"Rate limit: waiting {wait:.1f}s")
        time.sleep(wait)
    _request_times.append(time.time())


def _screen_sector(sector: str, api_key: str) -> list[dict]:
    """Screen EODHD for tickers in a sector."""
    all_tickers = []
    offset = 0
    limit = 100

    while True:
        params = {
            "api_token": api_key,
            "filters": json.dumps([
                ["exchange", "=", "us"],
                ["sector", "=", sector],
            ]),
            "limit": str(limit),
            "offset": str(offset),
            "sort": "market_capitalization.desc",
        }
        url = "https://eodhd.com/api/screener?" + urllib.parse.urlencode(params)
        _wait_for_rate_limit()

        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                data = json.loads(resp.read())
        except Exception as e:
            logger.error(f"Screener API error at offset {offset}: {e}")
            break

        results = data.get("data", [])
        if not results:
            break

        all_tickers.extend(results)
        logger.info(f"Screened {len(all_tickers)} tickers so far (offset={offset})")

        if len(results) < limit:
            break
        offset += limit

    return all_tickers


def _get_etf_holdings(etf_symbol: str, api_key: str) -> list[dict]:
    """Fetch ETF holdings from EODHD fundamentals endpoint."""
    symbol = etf_symbol if "." in etf_symbol else f"{etf_symbol}.US"
    params = {
        "api_token": api_key,
        "filter": "ETF_Data::Holdings",
    }
    url = f"https://eodhd.com/api/fundamentals/{symbol}?" + urllib.parse.urlencode(params)
    _wait_for_rate_limit()

    try:
        with urllib.request.urlopen(url, timeout=30) as resp:
            data = json.loads(resp.read())
    except Exception as e:
        logger.error(f"ETF holdings API error for {symbol}: {e}")
        return []

    if not isinstance(data, dict) or data == "NA":
        logger.warning(f"No holdings data for {symbol}")
        return []

    # Holdings is a dict keyed by "TICKER.EXCHANGE"
    holdings = []
    for key, info in data.items():
        if not isinstance(info, dict):
            continue
        code = info.get("Code", "")
        if not code:
            continue
        holdings.append({
            "code": code,
            "name": info.get("Name", ""),
            "sector": info.get("Sector", ""),
            "industry": info.get("Industry", ""),
            "weight": info.get("Assets_%", 0),
        })

    # Sort by weight descending
    holdings.sort(key=lambda h: float(h.get("weight", 0) or 0), reverse=True)
    logger.info(f"Fetched {len(holdings)} holdings for {symbol}")
    return holdings


async def populate_universe(universe: Universe) -> None:
    """Background task: populate a universe with OHLCV + fundamentals data."""
    universe_id = universe.id
    db_name = universe.db_name

    try:
        # Step 1: Create the universe database
        await db_manager.create_universe_database(db_name)

        # Step 2: Screen for tickers
        api_key = settings.eodhd_api_key
        if not api_key:
            raise ValueError("EODHD_API_KEY not configured")

        client = EODHDClient(api_key=api_key)

        # Fetch tickers based on source type
        if universe.source_type == SourceType.ETF:
            logger.info(f"Fetching ETF holdings: {universe.etf_symbol}")
            screened = await asyncio.to_thread(_get_etf_holdings, universe.etf_symbol, api_key)
            source_label = f"ETF {universe.etf_symbol}"
        else:
            logger.info(f"Screening sector: {universe.sector}")
            screened = await asyncio.to_thread(_screen_sector, universe.sector, api_key)
            source_label = f"Sector {universe.sector}"

        if not screened:
            await _update_status(universe_id, UniverseStatus.ERROR, f"No tickers found for {source_label}")
            return

        # Step 3: Insert tickers into registry
        async with db_manager.get_registry_session() as session:
            for s in screened:
                ticker_code = s.get("code", "").split(".")[0]
                if not ticker_code:
                    continue
                ut = UniverseTicker(
                    universe_id=universe_id,
                    ticker=ticker_code,
                    company_name=s.get("name", ""),
                )
                session.add(ut)
            await session.execute(
                update(Universe)
                .where(Universe.id == universe_id)
                .values(total_tickers=len(screened), status=UniverseStatus.CREATING)
            )

        logger.info(f"Registered {len(screened)} tickers for universe {universe_id}")

        # Step 4: Ingest data for each ticker
        completed = 0
        from_date_str = universe.start_date.isoformat()
        to_date_str = universe.end_date.isoformat()

        for s in screened:
            ticker_code = s.get("code", "").split(".")[0]
            if not ticker_code:
                continue

            try:
                await _ingest_ticker_data(
                    client=client,
                    db_name=db_name,
                    ticker=ticker_code,
                    from_date=from_date_str,
                    to_date=to_date_str,
                    granularities=universe.granularities,
                    universe_id=universe_id,
                )
                completed += 1
            except Exception as e:
                logger.warning(f"Failed to ingest {ticker_code}: {e}")
                # Mark ticker as error but continue
                await _update_ticker_status(universe_id, ticker_code, "error", "error")

            # Update progress
            async with db_manager.get_registry_session() as session:
                await session.execute(
                    update(Universe)
                    .where(Universe.id == universe_id)
                    .values(tickers_completed=completed)
                )

        # Step 5: Mark complete
        await _update_status(universe_id, UniverseStatus.READY)
        logger.info(f"Universe {universe_id} ready: {completed}/{len(screened)} tickers ingested")

        # Telegram notification
        _send_telegram(
            f"Universe ready: {universe.name}\n"
            f"Source: {source_label}\n"
            f"Tickers: {completed}/{len(screened)}"
        )

    except Exception as e:
        logger.error(f"Universe population failed: {e}", exc_info=True)
        await _update_status(universe_id, UniverseStatus.ERROR, str(e)[:500])
        _send_telegram(f"Universe FAILED: {universe.name}\nError: {str(e)[:200]}")


async def _ingest_ticker_data(
    client: EODHDClient,
    db_name: str,
    ticker: str,
    from_date: str,
    to_date: str,
    granularities: list[str],
    universe_id,
) -> None:
    """Ingest OHLCV + fundamentals for one ticker."""
    symbol = f"{ticker}.US"

    # OHLCV for each granularity
    for gran in granularities:
        try:
            if gran == "d":
                data = await asyncio.to_thread(
                    client.historical.get_eod, symbol, from_date=from_date, to_date=to_date
                )
                _wait_for_rate_limit()
                await _insert_ohlcv(db_name, ticker, "d", data, is_eod=True)
            elif gran in ("5m", "1h"):
                from_ts = int(datetime.strptime(from_date, "%Y-%m-%d").timestamp())
                to_ts = int(datetime.strptime(to_date, "%Y-%m-%d").timestamp())
                interval = gran
                data = await asyncio.to_thread(
                    client.historical.get_intraday, symbol, interval=interval,
                    from_timestamp=from_ts, to_timestamp=to_ts,
                )
                _wait_for_rate_limit()
                await _insert_ohlcv(db_name, ticker, gran, data, is_eod=False)
        except Exception as e:
            logger.warning(f"OHLCV {ticker}/{gran} failed: {e}")

    await _update_ticker_status(universe_id, ticker, "ready", None)

    # Fundamentals
    try:
        fund_data = await asyncio.to_thread(client.fundamental.get_fundamentals, symbol)
        _wait_for_rate_limit()
        await _insert_fundamentals(db_name, ticker, fund_data)
        await _update_ticker_status(universe_id, ticker, None, "ready")
    except Exception as e:
        logger.warning(f"Fundamentals {ticker} failed: {e}")
        await _update_ticker_status(universe_id, ticker, None, "error")


async def _insert_ohlcv(
    db_name: str, ticker: str, granularity: str, data: list, is_eod: bool
) -> None:
    """Bulk insert OHLCV data into universe database."""
    if not data:
        return

    records = []
    for row in data:
        try:
            if is_eod:
                ts = datetime.strptime(row["date"], "%Y-%m-%d")
            else:
                ts = datetime.fromtimestamp(row.get("timestamp", 0))

            records.append({
                "ticker": ticker,
                "granularity": granularity,
                "timestamp": ts,
                "open": row.get("open"),
                "high": row.get("high"),
                "low": row.get("low"),
                "close": row["close"],
                "volume": row.get("volume"),
                "adjusted_close": row.get("adjusted_close"),
            })
        except Exception:
            continue

    if not records:
        return

    async with db_manager.get_universe_session(db_name) as session:
        # Batch insert with ON CONFLICT DO UPDATE
        for i in range(0, len(records), 500):
            batch = records[i:i + 500]
            stmt = pg_insert(UniverseOHLCV).values(batch)
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker", "granularity", "timestamp"],
                set_={
                    "open": stmt.excluded.open,
                    "high": stmt.excluded.high,
                    "low": stmt.excluded.low,
                    "close": stmt.excluded.close,
                    "volume": stmt.excluded.volume,
                    "adjusted_close": stmt.excluded.adjusted_close,
                },
            )
            await session.execute(stmt)

    logger.info(f"Inserted {len(records)} OHLCV records for {ticker}/{granularity}")


async def _insert_fundamentals(db_name: str, ticker: str, fund_data: dict) -> None:
    """Parse EODHD fundamentals response and insert into universe database."""
    if not fund_data or not isinstance(fund_data, dict):
        return

    records = []

    # Parse financial statements
    financials = fund_data.get("Financials", {})
    highlights = fund_data.get("Highlights", {})
    valuation = fund_data.get("Valuation", {})

    # Extract quarterly data from Balance Sheet / Income / Cash Flow
    for statement_type in ["Income_Statement", "Balance_Sheet", "Cash_Flow"]:
        quarterly = financials.get(statement_type, {}).get("quarterly", {})
        for date_key, values in quarterly.items():
            try:
                d = datetime.strptime(date_key, "%Y-%m-%d").date()
            except Exception:
                continue

            existing = next((r for r in records if r["date"] == d and r["period_type"] == "quarterly"), None)
            if not existing:
                existing = {"ticker": ticker, "date": d, "period_type": "quarterly"}
                records.append(existing)

            _map_financials(existing, statement_type, values)

    # Add highlights/valuation to latest record
    if records:
        latest = sorted(records, key=lambda r: r["date"], reverse=True)[0]
        latest["market_cap"] = highlights.get("MarketCapitalization")
        latest["pe_ratio"] = highlights.get("PERatio")
        latest["eps"] = highlights.get("EarningsShare")
        latest["eps_diluted"] = highlights.get("DilutedEPS")
        latest["dividend_per_share"] = highlights.get("DividendShare")
        latest["dividend_yield"] = highlights.get("DividendYield")
        latest["pb_ratio"] = valuation.get("PriceBookMRQ")
        latest["ps_ratio"] = valuation.get("PriceSalesTTM")
        latest["peg_ratio"] = valuation.get("PEGRatio")
        latest["ev_ebitda"] = valuation.get("EnterpriseValueEbitda")
        latest["ev_revenue"] = valuation.get("EnterpriseValueRevenue")
        latest["enterprise_value"] = valuation.get("EnterpriseValue")
        latest["gross_margin"] = highlights.get("ProfitMargin")
        latest["operating_margin"] = highlights.get("OperatingMarginTTM")
        latest["roe"] = highlights.get("ReturnOnEquityTTM")
        latest["roa"] = highlights.get("ReturnOnAssetsTTM")

    if not records:
        return

    # Ensure all records have required fields
    for r in records:
        r.setdefault("raw_data", None)

    async with db_manager.get_universe_session(db_name) as session:
        for r in records:
            stmt = pg_insert(UniverseFundamental).values(**r)
            stmt = stmt.on_conflict_do_update(
                constraint="uq_fundamentals_ticker_date_period",
                set_={k: v for k, v in r.items() if k not in ("ticker", "date", "period_type")},
            )
            await session.execute(stmt)

    logger.info(f"Inserted {len(records)} fundamental records for {ticker}")


def _map_financials(record: dict, statement_type: str, values: dict) -> None:
    """Map EODHD financial statement values to our model fields."""
    if statement_type == "Income_Statement":
        record["revenue"] = _safe_float(values.get("totalRevenue"))
        record["gross_profit"] = _safe_float(values.get("grossProfit"))
        record["operating_income"] = _safe_float(values.get("operatingIncome"))
        record["net_income"] = _safe_float(values.get("netIncome"))
        record["ebitda"] = _safe_float(values.get("ebitda"))
    elif statement_type == "Balance_Sheet":
        record["total_assets"] = _safe_float(values.get("totalAssets"))
        record["total_liabilities"] = _safe_float(values.get("totalLiab"))
        record["total_equity"] = _safe_float(values.get("totalStockholderEquity"))
        record["total_debt"] = _safe_float(values.get("shortLongTermDebt"))
        record["cash_and_equivalents"] = _safe_float(values.get("cash"))
        td = record.get("total_debt")
        te = record.get("total_equity")
        if td and te and te != 0:
            record["debt_to_equity"] = td / te
        ca = _safe_float(values.get("totalCurrentAssets"))
        cl = _safe_float(values.get("totalCurrentLiabilities"))
        if ca and cl and cl != 0:
            record["current_ratio"] = ca / cl
    elif statement_type == "Cash_Flow":
        record["operating_cash_flow"] = _safe_float(values.get("totalCashFromOperatingActivities"))
        record["capex"] = _safe_float(values.get("capitalExpenditures"))
        ocf = record.get("operating_cash_flow")
        capex = record.get("capex")
        if ocf is not None and capex is not None:
            record["free_cash_flow"] = ocf - abs(capex)


def _safe_float(val) -> Optional[float]:
    if val is None or val == "None" or val == "":
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


async def _update_status(universe_id, status: UniverseStatus, error_msg: str = None):
    async with db_manager.get_registry_session() as session:
        values = {"status": status, "error_message": error_msg}
        await session.execute(
            update(Universe).where(Universe.id == universe_id).values(**values)
        )


async def _update_ticker_status(universe_id, ticker: str, ohlcv: str = None, fund: str = None):
    async with db_manager.get_registry_session() as session:
        values = {}
        if ohlcv:
            values["ohlcv_status"] = TickerStatus(ohlcv)
        if fund:
            values["fundamentals_status"] = TickerStatus(fund)
        if values:
            await session.execute(
                update(UniverseTicker)
                .where(UniverseTicker.universe_id == universe_id, UniverseTicker.ticker == ticker)
                .values(**values)
            )


def _send_telegram(message: str):
    """Best-effort Telegram notification."""
    try:
        encoded = urllib.parse.quote(message)
        url = f"http://localhost:5678/webhook/send-telegram?message={encoded}"
        urllib.request.urlopen(url, timeout=5)
    except Exception:
        pass
