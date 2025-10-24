-- ============================================================================
-- Chat with Fundamentals - Database Schema
-- ============================================================================
-- Version: 1.0
-- Description: Complete database schema for OHLCV, fundamentals, and metadata
-- Database: PostgreSQL 15+ with TimescaleDB 2.11+
-- ============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================================================
-- TABLE: exchanges
-- Description: Stock exchanges metadata
-- ============================================================================
CREATE TABLE exchanges (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL,  -- e.g., 'US', 'LSE', 'JPX'
    name VARCHAR(255) NOT NULL,         -- e.g., 'New York Stock Exchange'
    country VARCHAR(100),
    timezone VARCHAR(50),               -- e.g., 'America/New_York'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_exchanges_code ON exchanges(code);

-- ============================================================================
-- TABLE: sectors
-- Description: Industry sectors classification
-- ============================================================================
CREATE TABLE sectors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'Technology', 'Healthcare'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- TABLE: industries
-- Description: Industry sub-classifications
-- ============================================================================
CREATE TABLE industries (
    id SERIAL PRIMARY KEY,
    sector_id INT REFERENCES sectors(id) ON DELETE SET NULL,
    name VARCHAR(150) UNIQUE NOT NULL,  -- e.g., 'Software - Infrastructure'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_industries_sector ON industries(sector_id);

-- ============================================================================
-- TABLE: companies
-- Description: Company/ticker master data
-- ============================================================================
CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    ticker VARCHAR(20) UNIQUE NOT NULL,     -- e.g., 'AAPL.US', 'MSFT.US'
    name VARCHAR(255) NOT NULL,              -- e.g., 'Apple Inc.'
    exchange_id INT REFERENCES exchanges(id) ON DELETE SET NULL,
    sector_id INT REFERENCES sectors(id) ON DELETE SET NULL,
    industry_id INT REFERENCES industries(id) ON DELETE SET NULL,
    currency VARCHAR(10) DEFAULT 'USD',      -- e.g., 'USD', 'EUR', 'GBP'
    isin VARCHAR(12),                        -- International Securities ID
    cusip VARCHAR(9),                        -- CUSIP identifier
    description TEXT,
    website VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,          -- Active/delisted flag
    ipo_date DATE,                           -- IPO date
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_companies_ticker ON companies(ticker);
CREATE INDEX idx_companies_exchange ON companies(exchange_id);
CREATE INDEX idx_companies_sector ON companies(sector_id);
CREATE INDEX idx_companies_industry ON companies(industry_id);
CREATE INDEX idx_companies_active ON companies(is_active);

-- ============================================================================
-- TABLE: ohlcv
-- Description: Time-series OHLCV data (TimescaleDB hypertable)
-- Storage: ~10 years daily data per ticker = ~2,500 rows × 500 tickers = 1.25M rows
-- ============================================================================
CREATE TABLE ohlcv (
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date TIMESTAMPTZ NOT NULL,
    open NUMERIC(12, 4),
    high NUMERIC(12, 4),
    low NUMERIC(12, 4),
    close NUMERIC(12, 4) NOT NULL,
    volume BIGINT,
    adjusted_close NUMERIC(12, 4),        -- Split/dividend adjusted
    PRIMARY KEY (company_id, date)
);

-- Convert to TimescaleDB hypertable (time-series optimized)
SELECT create_hypertable('ohlcv', 'date',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- Enable compression (10x storage reduction)
ALTER TABLE ohlcv SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'company_id',
    timescaledb.compress_orderby = 'date DESC'
);

-- Auto-compress data older than 7 days
SELECT add_compression_policy('ohlcv', INTERVAL '7 days', if_not_exists => TRUE);

-- Indexes for fast queries
CREATE INDEX idx_ohlcv_company ON ohlcv(company_id, date DESC);
CREATE INDEX idx_ohlcv_date ON ohlcv(date DESC);

-- ============================================================================
-- TABLE: fundamentals
-- Description: Company fundamental metrics (quarterly/annual)
-- ============================================================================
CREATE TABLE fundamentals (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,                    -- Report date
    period_type VARCHAR(10) NOT NULL,      -- 'quarterly' or 'annual'
    fiscal_year INT,
    fiscal_quarter INT,                    -- 1, 2, 3, 4 (NULL for annual)

    -- Valuation metrics
    market_cap NUMERIC(20, 2),
    enterprise_value NUMERIC(20, 2),
    pe_ratio NUMERIC(10, 4),
    peg_ratio NUMERIC(10, 4),
    price_to_book NUMERIC(10, 4),
    price_to_sales NUMERIC(10, 4),
    ev_to_revenue NUMERIC(10, 4),
    ev_to_ebitda NUMERIC(10, 4),

    -- Profitability metrics
    revenue NUMERIC(20, 2),
    gross_profit NUMERIC(20, 2),
    operating_income NUMERIC(20, 2),
    net_income NUMERIC(20, 2),
    ebitda NUMERIC(20, 2),
    eps NUMERIC(10, 4),                    -- Earnings per share
    eps_diluted NUMERIC(10, 4),
    gross_margin NUMERIC(10, 4),           -- Percentage
    operating_margin NUMERIC(10, 4),
    profit_margin NUMERIC(10, 4),
    roe NUMERIC(10, 4),                    -- Return on equity
    roa NUMERIC(10, 4),                    -- Return on assets
    roic NUMERIC(10, 4),                   -- Return on invested capital

    -- Growth metrics
    revenue_growth NUMERIC(10, 4),         -- YoY growth %
    earnings_growth NUMERIC(10, 4),

    -- Balance sheet metrics
    total_assets NUMERIC(20, 2),
    total_liabilities NUMERIC(20, 2),
    total_equity NUMERIC(20, 2),
    total_debt NUMERIC(20, 2),
    cash_and_equivalents NUMERIC(20, 2),
    book_value_per_share NUMERIC(10, 4),

    -- Debt metrics
    debt_to_equity NUMERIC(10, 4),
    current_ratio NUMERIC(10, 4),
    quick_ratio NUMERIC(10, 4),

    -- Dividend metrics
    dividend_per_share NUMERIC(10, 4),
    dividend_yield NUMERIC(10, 6),         -- Percentage (e.g., 0.0234 = 2.34%)
    payout_ratio NUMERIC(10, 4),

    -- Cash flow metrics
    operating_cash_flow NUMERIC(20, 2),
    free_cash_flow NUMERIC(20, 2),
    capex NUMERIC(20, 2),

    -- Share metrics
    shares_outstanding BIGINT,
    float_shares BIGINT,

    -- Metadata
    data_source VARCHAR(50) DEFAULT 'EODHD',
    raw_data JSONB,                        -- Store full API response
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, date, period_type)
);

CREATE INDEX idx_fundamentals_company ON fundamentals(company_id, date DESC);
CREATE INDEX idx_fundamentals_date ON fundamentals(date DESC);
CREATE INDEX idx_fundamentals_period ON fundamentals(period_type);
CREATE INDEX idx_fundamentals_fiscal_year ON fundamentals(company_id, fiscal_year, fiscal_quarter);
CREATE INDEX idx_fundamentals_raw_data ON fundamentals USING GIN(raw_data);

-- ============================================================================
-- TABLE: news
-- Description: Financial news articles
-- ============================================================================
CREATE TABLE news (
    id SERIAL PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    content TEXT,
    summary TEXT,
    url VARCHAR(500),
    source VARCHAR(100),                   -- e.g., 'Reuters', 'Bloomberg'
    author VARCHAR(255),

    -- Sentiment analysis
    sentiment_score NUMERIC(5, 4),         -- -1.0 to 1.0
    sentiment_label VARCHAR(20),           -- 'positive', 'negative', 'neutral'
    sentiment_confidence NUMERIC(5, 4),    -- 0.0 to 1.0

    -- Metadata
    tags TEXT[],                           -- Keywords/tags
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_news_company ON news(company_id, published_at DESC);
CREATE INDEX idx_news_published ON news(published_at DESC);
CREATE INDEX idx_news_sentiment ON news(sentiment_score);
CREATE INDEX idx_news_source ON news(source);
CREATE INDEX idx_news_tags ON news USING GIN(tags);

-- ============================================================================
-- TABLE: analyst_ratings
-- Description: Analyst recommendations and price targets
-- ============================================================================
CREATE TABLE analyst_ratings (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    firm VARCHAR(255) NOT NULL,            -- Analyst firm name
    analyst_name VARCHAR(255),

    -- Rating
    rating VARCHAR(50),                    -- 'Buy', 'Hold', 'Sell', etc.
    rating_numeric INT,                    -- 1-5 scale (5=Strong Buy)
    previous_rating VARCHAR(50),

    -- Price targets
    price_target NUMERIC(10, 2),
    price_target_low NUMERIC(10, 2),
    price_target_high NUMERIC(10, 2),
    previous_price_target NUMERIC(10, 2),

    -- Metadata
    action VARCHAR(50),                    -- 'initiated', 'upgraded', 'downgraded', 'reiterated'
    url VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, date, firm)
);

CREATE INDEX idx_analyst_ratings_company ON analyst_ratings(company_id, date DESC);
CREATE INDEX idx_analyst_ratings_date ON analyst_ratings(date DESC);
CREATE INDEX idx_analyst_ratings_rating ON analyst_ratings(rating);

-- ============================================================================
-- TABLE: insider_transactions
-- Description: Insider buying/selling activity
-- ============================================================================
CREATE TABLE insider_transactions (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    filing_date DATE NOT NULL,
    transaction_date DATE NOT NULL,

    -- Insider information
    insider_name VARCHAR(255) NOT NULL,
    insider_title VARCHAR(255),
    is_director BOOLEAN DEFAULT FALSE,
    is_officer BOOLEAN DEFAULT FALSE,
    is_ten_percent_owner BOOLEAN DEFAULT FALSE,

    -- Transaction details
    transaction_type VARCHAR(50),          -- 'Purchase', 'Sale', 'Gift', 'Award', etc.
    transaction_code VARCHAR(10),          -- SEC form 4 transaction code
    shares BIGINT NOT NULL,
    price_per_share NUMERIC(10, 4),
    total_value NUMERIC(20, 2),
    shares_owned_after BIGINT,

    -- Metadata
    sec_link VARCHAR(500),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, transaction_date, insider_name, transaction_type, shares)
);

CREATE INDEX idx_insider_transactions_company ON insider_transactions(company_id, filing_date DESC);
CREATE INDEX idx_insider_transactions_date ON insider_transactions(transaction_date DESC);
CREATE INDEX idx_insider_transactions_type ON insider_transactions(transaction_type);
CREATE INDEX idx_insider_transactions_insider ON insider_transactions(insider_name);

-- ============================================================================
-- TABLE: dividends
-- Description: Dividend payment history
-- ============================================================================
CREATE TABLE dividends (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    ex_date DATE NOT NULL,                 -- Ex-dividend date
    payment_date DATE,
    record_date DATE,
    declaration_date DATE,
    amount NUMERIC(10, 6) NOT NULL,        -- Dividend amount per share
    currency VARCHAR(10) DEFAULT 'USD',
    dividend_type VARCHAR(50),             -- 'Regular', 'Special', 'Stock', etc.
    frequency VARCHAR(20),                 -- 'Quarterly', 'Monthly', 'Annual', etc.
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, ex_date, amount)
);

CREATE INDEX idx_dividends_company ON dividends(company_id, ex_date DESC);
CREATE INDEX idx_dividends_ex_date ON dividends(ex_date DESC);
CREATE INDEX idx_dividends_payment_date ON dividends(payment_date);

-- ============================================================================
-- TABLE: technical_indicators
-- Description: Pre-calculated technical indicators (cached)
-- ============================================================================
CREATE TABLE technical_indicators (
    id SERIAL PRIMARY KEY,
    company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date DATE NOT NULL,

    -- Moving averages
    sma_20 NUMERIC(12, 4),                 -- 20-day simple moving average
    sma_50 NUMERIC(12, 4),
    sma_200 NUMERIC(12, 4),
    ema_12 NUMERIC(12, 4),                 -- 12-day exponential moving average
    ema_26 NUMERIC(12, 4),

    -- MACD
    macd NUMERIC(12, 4),
    macd_signal NUMERIC(12, 4),
    macd_histogram NUMERIC(12, 4),

    -- RSI
    rsi_14 NUMERIC(10, 4),                 -- 14-day RSI

    -- Bollinger Bands
    bb_upper NUMERIC(12, 4),
    bb_middle NUMERIC(12, 4),
    bb_lower NUMERIC(12, 4),
    bb_bandwidth NUMERIC(10, 4),

    -- Volume indicators
    volume_sma_20 BIGINT,
    obv BIGINT,                            -- On-balance volume

    -- Volatility
    atr_14 NUMERIC(12, 4),                 -- Average true range (14-day)
    historical_volatility_30 NUMERIC(10, 4),

    -- Metadata
    calculated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(company_id, date)
);

CREATE INDEX idx_technical_indicators_company ON technical_indicators(company_id, date DESC);
CREATE INDEX idx_technical_indicators_date ON technical_indicators(date DESC);

-- ============================================================================
-- TABLE: data_ingestion_logs
-- Description: Track data ingestion jobs for monitoring
-- ============================================================================
CREATE TABLE data_ingestion_logs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,         -- 'ohlcv', 'fundamentals', 'news', etc.
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL,           -- 'running', 'success', 'failed'
    records_processed INT DEFAULT 0,
    records_inserted INT DEFAULT 0,
    records_updated INT DEFAULT 0,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_ingestion_logs_job_type ON data_ingestion_logs(job_type, start_time DESC);
CREATE INDEX idx_ingestion_logs_status ON data_ingestion_logs(status);
CREATE INDEX idx_ingestion_logs_company ON data_ingestion_logs(company_id);

-- ============================================================================
-- TABLE: api_rate_limits
-- Description: Track API usage for rate limiting
-- ============================================================================
CREATE TABLE api_rate_limits (
    id SERIAL PRIMARY KEY,
    api_name VARCHAR(50) NOT NULL,         -- 'EODHD', 'OpenAI', etc.
    endpoint VARCHAR(255),
    request_time TIMESTAMPTZ NOT NULL,
    response_time_ms INT,
    status_code INT,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_api_rate_limits_api ON api_rate_limits(api_name, request_time DESC);
CREATE INDEX idx_api_rate_limits_time ON api_rate_limits(request_time DESC);

-- ============================================================================
-- MATERIALIZED VIEWS
-- ============================================================================

-- Latest fundamentals for each company (for fast lookups)
CREATE MATERIALIZED VIEW latest_fundamentals AS
SELECT DISTINCT ON (company_id)
    company_id,
    date,
    period_type,
    market_cap,
    pe_ratio,
    eps,
    revenue,
    net_income,
    dividend_yield,
    updated_at
FROM fundamentals
ORDER BY company_id, date DESC;

CREATE UNIQUE INDEX idx_latest_fundamentals_company ON latest_fundamentals(company_id);

-- Refresh policy (can be automated with pg_cron or application)
-- REFRESH MATERIALIZED VIEW CONCURRENTLY latest_fundamentals;

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exchanges_updated_at BEFORE UPDATE ON exchanges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fundamentals_updated_at BEFORE UPDATE ON fundamentals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SEED DATA - Common exchanges and sectors
-- ============================================================================

INSERT INTO exchanges (code, name, country, timezone) VALUES
    ('US', 'New York Stock Exchange', 'United States', 'America/New_York'),
    ('NASDAQ', 'NASDAQ Stock Exchange', 'United States', 'America/New_York'),
    ('LSE', 'London Stock Exchange', 'United Kingdom', 'Europe/London'),
    ('JPX', 'Japan Exchange Group', 'Japan', 'Asia/Tokyo'),
    ('EURONEXT', 'Euronext', 'European Union', 'Europe/Paris')
ON CONFLICT (code) DO NOTHING;

INSERT INTO sectors (name, description) VALUES
    ('Technology', 'Information technology and software companies'),
    ('Healthcare', 'Healthcare and pharmaceutical companies'),
    ('Financials', 'Banks, insurance, and financial services'),
    ('Consumer Cyclical', 'Consumer discretionary goods and services'),
    ('Consumer Defensive', 'Consumer staples and non-cyclical goods'),
    ('Industrials', 'Industrial and manufacturing companies'),
    ('Energy', 'Energy production and services'),
    ('Utilities', 'Utility companies'),
    ('Real Estate', 'Real estate investment trusts and property'),
    ('Basic Materials', 'Mining, chemicals, and basic materials'),
    ('Communication Services', 'Telecommunications and media')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- GRANTS & PERMISSIONS (adjust user as needed)
-- ============================================================================

-- Example: GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- Example: GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
