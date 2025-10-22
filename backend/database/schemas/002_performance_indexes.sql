-- ============================================================================
-- Performance Optimization Indexes
-- ============================================================================
-- Version: 1.1
-- Description: Additional composite indexes for common query patterns
-- Fixes: N+1 query performance issues
-- ============================================================================

-- ============================================================================
-- COMPOSITE INDEXES FOR COMMON QUERY PATTERNS
-- ============================================================================

-- Fundamentals: Common query pattern (company + period + date range)
-- Supports: WHERE company_id = ? AND period_type = ? AND date >= ?
CREATE INDEX IF NOT EXISTS idx_fundamentals_company_period_date
ON fundamentals(company_id, period_type, date DESC);

-- News: Common query pattern (company + published date range + sentiment)
-- Supports: WHERE company_id = ? AND published_at >= ? AND sentiment_score >= ?
CREATE INDEX IF NOT EXISTS idx_news_company_published_sentiment
ON news(company_id, published_at DESC, sentiment_score);

-- Analyst Ratings: Common query pattern (company + date range)
-- Supports: WHERE company_id = ? AND date >= ?
CREATE INDEX IF NOT EXISTS idx_analyst_ratings_company_date_desc
ON analyst_ratings(company_id, date DESC);

-- Insider Transactions: Common query pattern (company + transaction date)
-- Supports: WHERE company_id = ? AND transaction_date >= ?
CREATE INDEX IF NOT EXISTS idx_insider_transactions_company_tx_date
ON insider_transactions(company_id, transaction_date DESC);

-- Dividends: Common query pattern (company + ex_date range)
-- Supports: WHERE company_id = ? AND ex_date >= ?
CREATE INDEX IF NOT EXISTS idx_dividends_company_ex_date_desc
ON dividends(company_id, ex_date DESC);

-- Technical Indicators: Common query pattern (company + date range)
-- Supports: WHERE company_id = ? AND date >= ?
CREATE INDEX IF NOT EXISTS idx_technical_indicators_company_date_desc
ON technical_indicators(company_id, date DESC);

-- ============================================================================
-- COVERING INDEXES FOR FREQUENTLY SELECTED COLUMNS
-- ============================================================================

-- OHLCV: Include adjusted_close in index for faster queries
-- Supports: SELECT close, adjusted_close FROM ohlcv WHERE company_id = ? AND date >= ?
CREATE INDEX IF NOT EXISTS idx_ohlcv_company_date_close
ON ohlcv(company_id, date DESC) INCLUDE (close, adjusted_close, volume);

-- Fundamentals: Include key metrics in index
-- Supports: SELECT pe_ratio, eps, revenue FROM fundamentals WHERE ...
CREATE INDEX IF NOT EXISTS idx_fundamentals_key_metrics
ON fundamentals(company_id, date DESC)
INCLUDE (pe_ratio, eps, revenue, net_income, market_cap);

-- ============================================================================
-- PARTIAL INDEXES FOR FILTERED QUERIES
-- ============================================================================

-- Active companies only (most queries filter on this)
CREATE INDEX IF NOT EXISTS idx_companies_active
ON companies(ticker) WHERE is_active = true;

-- Positive sentiment news only
CREATE INDEX IF NOT EXISTS idx_news_positive_sentiment
ON news(company_id, published_at DESC)
WHERE sentiment_score > 0;

-- ============================================================================
-- INDEX STATISTICS AND MONITORING
-- ============================================================================

-- View to monitor index usage
CREATE OR REPLACE VIEW index_usage_stats AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    idx_tup_read as tuples_read,
    idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- View to find unused indexes
CREATE OR REPLACE VIEW unused_indexes AS
SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan as scans,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelid NOT IN (
    SELECT indexrelid FROM pg_index WHERE indisprimary OR indisunique
)
ORDER BY pg_relation_size(indexrelid) DESC;

-- View to monitor table and index sizes
CREATE OR REPLACE VIEW table_sizes AS
SELECT
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) as indexes_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================================================
-- ANALYZE TABLES FOR QUERY PLANNER
-- ============================================================================

-- Update statistics for query planner
ANALYZE companies;
ANALYZE ohlcv;
ANALYZE fundamentals;
ANALYZE news;
ANALYZE analyst_ratings;
ANALYZE insider_transactions;
ANALYZE dividends;
ANALYZE technical_indicators;

-- ============================================================================
-- VACUUM SETTINGS FOR TIMESCALEDB
-- ============================================================================

-- Configure autovacuum for better performance
ALTER TABLE companies SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE fundamentals SET (
    autovacuum_vacuum_scale_factor = 0.1,
    autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE news SET (
    autovacuum_vacuum_scale_factor = 0.2,
    autovacuum_analyze_scale_factor = 0.1
);

-- ============================================================================
-- END OF PERFORMANCE INDEXES
-- ============================================================================

-- To check index usage after deployment:
-- SELECT * FROM index_usage_stats;
-- SELECT * FROM unused_indexes;
-- SELECT * FROM table_sizes;
