-- Phase 3D: Intraday OHLCV Schema
-- Migration script for minute-level intraday data
-- Requires TimescaleDB extension

-- Ensure TimescaleDB extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Create interval enum type
CREATE TYPE intraday_interval_enum AS ENUM ('1m', '5m', '15m', '30m', '1h');

------------------------------------------------------------------------------------
-- 1. Intraday OHLCV Table (Minute-level data)
------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intraday_ohlcv (
    ticker           VARCHAR(20) NOT NULL,
    timestamp        TIMESTAMPTZ NOT NULL,
    interval         intraday_interval_enum NOT NULL DEFAULT '1m',

    -- OHLCV data
    open             NUMERIC(12, 4) NOT NULL,
    high             NUMERIC(12, 4) NOT NULL,
    low              NUMERIC(12, 4) NOT NULL,
    close            NUMERIC(12, 4) NOT NULL,
    volume           BIGINT NOT NULL DEFAULT 0,

    -- Additional metrics
    trades           BIGINT,
    vwap             NUMERIC(12, 4),

    -- Metadata
    source           VARCHAR(50) NOT NULL DEFAULT 'eodhd',
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT uq_intraday_ticker_timestamp_interval
        UNIQUE (ticker, timestamp, interval),
    CONSTRAINT ck_intraday_high_gte_low CHECK (high >= low),
    CONSTRAINT ck_intraday_high_gte_open CHECK (high >= open),
    CONSTRAINT ck_intraday_high_gte_close CHECK (high >= close),
    CONSTRAINT ck_intraday_low_lte_open CHECK (low <= open),
    CONSTRAINT ck_intraday_low_lte_close CHECK (low <= close),
    CONSTRAINT ck_intraday_volume_non_negative CHECK (volume >= 0)
);

COMMENT ON TABLE intraday_ohlcv IS
    'Intraday OHLCV data with minute-level granularity (TimescaleDB hypertable)';

-- Convert to TimescaleDB hypertable (partitioned by timestamp)
-- Chunk size: 1 day (optimal for intraday data)
SELECT create_hypertable(
    'intraday_ohlcv',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_intraday_ticker_timestamp_desc
    ON intraday_ohlcv (ticker, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_intraday_timestamp_ticker
    ON intraday_ohlcv (timestamp, ticker);

CREATE INDEX IF NOT EXISTS idx_intraday_ticker_interval_timestamp
    ON intraday_ohlcv (ticker, interval, timestamp);

-- Create index on source for data quality tracking
CREATE INDEX IF NOT EXISTS idx_intraday_source
    ON intraday_ohlcv (source);

------------------------------------------------------------------------------------
-- 2. Intraday Quotes Table (Tick data) - Optional
------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS intraday_quotes (
    ticker           VARCHAR(20) NOT NULL,
    timestamp        TIMESTAMPTZ NOT NULL,

    -- Quote data
    bid              NUMERIC(12, 4),
    ask              NUMERIC(12, 4),
    bid_size         BIGINT,
    ask_size         BIGINT,
    last_price       NUMERIC(12, 4),
    last_size        BIGINT,

    -- Metadata
    source           VARCHAR(50) NOT NULL DEFAULT 'eodhd',
    ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_intraday_quotes_ticker_timestamp
        UNIQUE (ticker, timestamp)
);

COMMENT ON TABLE intraday_quotes IS
    'Real-time quote snapshots (tick data)';

-- Convert to hypertable
SELECT create_hypertable(
    'intraday_quotes',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_quotes_ticker_timestamp_desc
    ON intraday_quotes (ticker, timestamp DESC);

------------------------------------------------------------------------------------
-- 3. Compression Policy (Save storage space)
------------------------------------------------------------------------------------

-- Enable compression on chunks older than 7 days
-- Compression ratio: typically 70-80% reduction for time-series data
SELECT add_compression_policy(
    'intraday_ohlcv',
    compress_after => INTERVAL '7 days',
    if_not_exists => TRUE
);

SELECT add_compression_policy(
    'intraday_quotes',
    compress_after => INTERVAL '3 days',
    if_not_exists => TRUE
);

------------------------------------------------------------------------------------
-- 4. Data Retention Policy
------------------------------------------------------------------------------------

-- Drop chunks older than 90 days for 1m/5m data
-- This keeps database size manageable while retaining sufficient history
SELECT add_retention_policy(
    'intraday_ohlcv',
    drop_after => INTERVAL '90 days',
    if_not_exists => TRUE
);

-- Drop tick data older than 7 days
SELECT add_retention_policy(
    'intraday_quotes',
    drop_after => INTERVAL '7 days',
    if_not_exists => TRUE
);

------------------------------------------------------------------------------------
-- 5. Continuous Aggregates (Pre-computed aggregations)
------------------------------------------------------------------------------------

-- 5-minute aggregate (from 1-minute data)
CREATE MATERIALIZED VIEW IF NOT EXISTS intraday_ohlcv_5m
WITH (timescaledb.continuous) AS
SELECT
    ticker,
    time_bucket('5 minutes', timestamp) AS timestamp,
    '5m'::intraday_interval_enum AS interval,
    first(open, timestamp) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, timestamp) AS close,
    sum(volume) AS volume,
    sum(trades) AS trades,
    sum(volume * close) / NULLIF(sum(volume), 0) AS vwap,
    max(source) AS source,
    max(ingested_at) AS ingested_at
FROM intraday_ohlcv
WHERE interval = '1m'
GROUP BY ticker, time_bucket('5 minutes', timestamp);

-- Refresh policy for 5m aggregate (every 5 minutes, keep data for last 7 days)
SELECT add_continuous_aggregate_policy(
    'intraday_ohlcv_5m',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE
);

-- 15-minute aggregate (from 5-minute data)
CREATE MATERIALIZED VIEW IF NOT EXISTS intraday_ohlcv_15m
WITH (timescaledb.continuous) AS
SELECT
    ticker,
    time_bucket('15 minutes', timestamp) AS timestamp,
    '15m'::intraday_interval_enum AS interval,
    first(open, timestamp) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, timestamp) AS close,
    sum(volume) AS volume,
    sum(trades) AS trades,
    sum(volume * close) / NULLIF(sum(volume), 0) AS vwap,
    max(source) AS source,
    max(ingested_at) AS ingested_at
FROM intraday_ohlcv
WHERE interval = '5m'
GROUP BY ticker, time_bucket('15 minutes', timestamp);

SELECT add_continuous_aggregate_policy(
    'intraday_ohlcv_15m',
    start_offset => INTERVAL '30 days',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE
);

-- 1-hour aggregate
CREATE MATERIALIZED VIEW IF NOT EXISTS intraday_ohlcv_1h
WITH (timescaledb.continuous) AS
SELECT
    ticker,
    time_bucket('1 hour', timestamp) AS timestamp,
    '1h'::intraday_interval_enum AS interval,
    first(open, timestamp) AS open,
    max(high) AS high,
    min(low) AS low,
    last(close, timestamp) AS close,
    sum(volume) AS volume,
    sum(trades) AS trades,
    sum(volume * close) / NULLIF(sum(volume), 0) AS vwap,
    max(source) AS source,
    max(ingested_at) AS ingested_at
FROM intraday_ohlcv
WHERE interval = '15m'
GROUP BY ticker, time_bucket('1 hour', timestamp);

SELECT add_continuous_aggregate_policy(
    'intraday_ohlcv_1h',
    start_offset => INTERVAL '90 days',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

------------------------------------------------------------------------------------
-- 6. Helper Functions
------------------------------------------------------------------------------------

-- Function to get latest intraday candle for a ticker
CREATE OR REPLACE FUNCTION get_latest_intraday_candle(
    p_ticker VARCHAR(20),
    p_interval intraday_interval_enum DEFAULT '1m'
)
RETURNS TABLE (
    ticker VARCHAR(20),
    timestamp TIMESTAMPTZ,
    open NUMERIC(12, 4),
    high NUMERIC(12, 4),
    low NUMERIC(12, 4),
    close NUMERIC(12, 4),
    volume BIGINT,
    vwap NUMERIC(12, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.ticker,
        i.timestamp,
        i.open,
        i.high,
        i.low,
        i.close,
        i.volume,
        i.vwap
    FROM intraday_ohlcv i
    WHERE i.ticker = p_ticker
      AND i.interval = p_interval
    ORDER BY i.timestamp DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- Function to get intraday data for date range
CREATE OR REPLACE FUNCTION get_intraday_range(
    p_ticker VARCHAR(20),
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_interval intraday_interval_enum DEFAULT '1m'
)
RETURNS TABLE (
    timestamp TIMESTAMPTZ,
    open NUMERIC(12, 4),
    high NUMERIC(12, 4),
    low NUMERIC(12, 4),
    close NUMERIC(12, 4),
    volume BIGINT,
    vwap NUMERIC(12, 4)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        i.timestamp,
        i.open,
        i.high,
        i.low,
        i.close,
        i.volume,
        i.vwap
    FROM intraday_ohlcv i
    WHERE i.ticker = p_ticker
      AND i.interval = p_interval
      AND i.timestamp >= p_start_time
      AND i.timestamp <= p_end_time
    ORDER BY i.timestamp ASC;
END;
$$ LANGUAGE plpgsql;

------------------------------------------------------------------------------------
-- 7. Grants (Permissions)
------------------------------------------------------------------------------------

-- Grant SELECT on tables (read access)
-- GRANT SELECT ON intraday_ohlcv TO readonlyuser;
-- GRANT SELECT ON intraday_quotes TO readonlyuser;
-- GRANT SELECT ON intraday_ohlcv_5m TO readonlyuser;
-- GRANT SELECT ON intraday_ohlcv_15m TO readonlyuser;
-- GRANT SELECT ON intraday_ohlcv_1h TO readonlyuser;

------------------------------------------------------------------------------------
-- 8. Statistics and Monitoring
------------------------------------------------------------------------------------

-- Create view for monitoring chunk statistics
CREATE OR REPLACE VIEW intraday_chunk_stats AS
SELECT
    hypertable_name,
    chunk_name,
    range_start,
    range_end,
    num_rows,
    pg_size_pretty(total_bytes) AS total_size,
    pg_size_pretty(compressed_total_bytes) AS compressed_size,
    ROUND(100.0 * (1 - compressed_total_bytes::numeric / NULLIF(total_bytes, 0)), 2) AS compression_ratio_pct
FROM timescaledb_information.chunks
WHERE hypertable_name IN ('intraday_ohlcv', 'intraday_quotes')
ORDER BY range_start DESC;

COMMENT ON VIEW intraday_chunk_stats IS
    'Monitor chunk statistics for intraday tables';

------------------------------------------------------------------------------------
-- Migration Complete
------------------------------------------------------------------------------------

-- Print summary
DO $$
BEGIN
    RAISE NOTICE 'Phase 3D Intraday Schema Migration Complete';
    RAISE NOTICE 'Created tables: intraday_ohlcv, intraday_quotes';
    RAISE NOTICE 'Created continuous aggregates: 5m, 15m, 1h';
    RAISE NOTICE 'Enabled compression (7-day policy for OHLCV, 3-day for quotes)';
    RAISE NOTICE 'Enabled retention (90 days for OHLCV, 7 days for quotes)';
    RAISE NOTICE 'Created helper functions: get_latest_intraday_candle, get_intraday_range';
END $$;
