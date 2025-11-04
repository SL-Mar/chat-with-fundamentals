"""
Unit Tests for OHLCV Ingestion with Mocks

Tests security and robustness features:
- Input validation
- Error handling
- Rate limiting
- Transaction management
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import date, datetime
from pydantic import ValidationError

from ingestion.ohlcv_ingestion import OHLCVIngestion, OHLCVRecord


class TestOHLCVRecord:
    """Test Pydantic validation"""

    def test_valid_record(self):
        """Test valid OHLCV record"""
        record = OHLCVRecord(
            date=date(2024, 1, 1),
            open=150.0,
            high=155.0,
            low=149.0,
            close=153.0,
            volume=1000000,
            adjusted_close=153.0
        )
        assert record.close == 153.0
        assert record.volume == 1000000

    def test_negative_price_rejected(self):
        """Test that negative prices are rejected"""
        with pytest.raises(ValidationError):
            OHLCVRecord(
                date=date(2024, 1, 1),
                close=-10.0  # Invalid
            )

    def test_negative_volume_rejected(self):
        """Test that negative volumes are rejected"""
        with pytest.raises(ValidationError):
            OHLCVRecord(
                date=date(2024, 1, 1),
                close=100.0,
                volume=-1000  # Invalid
            )

    def test_missing_close_rejected(self):
        """Test that close price is required"""
        with pytest.raises(ValidationError):
            OHLCVRecord(
                date=date(2024, 1, 1)
                # Missing close price
            )


class TestOHLCVIngestion:
    """Test OHLCV ingestion pipeline"""

    @pytest.fixture
    def ingestion(self):
        """Create ingestion instance"""
        return OHLCVIngestion(api_key='test_key_12345')

    def test_ticker_validation_uppercase(self, ingestion):
        """Test ticker is converted to uppercase"""
        ticker = ingestion._validate_ticker('aapl.us')
        assert ticker == 'AAPL.US'

    def test_ticker_validation_invalid_chars(self, ingestion):
        """Test invalid characters are rejected"""
        with pytest.raises(ValueError, match="Invalid ticker format"):
            ingestion._validate_ticker('AAPL;DROP TABLE')

    def test_ticker_validation_too_long(self, ingestion):
        """Test ticker length limit"""
        with pytest.raises(ValueError, match="Ticker too long"):
            ingestion._validate_ticker('A' * 25)

    def test_ticker_validation_empty(self, ingestion):
        """Test empty ticker is rejected"""
        with pytest.raises(ValueError, match="Ticker cannot be empty"):
            ingestion._validate_ticker('')

    @patch('ingestion.ohlcv_ingestion.OHLCVIngestion._make_request')
    def test_fetch_historical_data_success(self, mock_request, ingestion):
        """Test successful data fetch"""
        mock_response = Mock()
        mock_response.json.return_value = [
            {
                'date': '2024-01-01',
                'open': 150.0,
                'high': 155.0,
                'low': 149.0,
                'close': 153.0,
                'volume': 1000000
            }
        ]
        mock_request.return_value = mock_response

        data = ingestion.fetch_historical_data(
            ticker='AAPL.US',
            from_date='2024-01-01',
            to_date='2024-01-31'
        )

        assert len(data) == 1
        assert data[0]['close'] == 153.0

    def test_validate_records_valid(self, ingestion):
        """Test record validation with valid data"""
        raw_data = [
            {
                'date': '2024-01-01',
                'open': 150.0,
                'high': 155.0,
                'low': 149.0,
                'close': 153.0,
                'volume': 1000000
            }
        ]

        records = ingestion.validate_records(raw_data)
        assert len(records) == 1
        assert records[0].close == 153.0

    def test_validate_records_skip_invalid(self, ingestion):
        """Test that invalid records are skipped, not failed"""
        raw_data = [
            {
                'date': '2024-01-01',
                'close': 150.0
            },
            {
                'date': '2024-01-02',
                'close': -10.0  # Invalid - negative price
            },
            {
                'date': '2024-01-03',
                'close': 160.0
            }
        ]

        records = ingestion.validate_records(raw_data)
        # Should have 2 valid records (skip the invalid one)
        assert len(records) == 2
        assert records[0].close == 150.0
        assert records[1].close == 160.0

    @patch('ingestion.ohlcv_ingestion.SessionLocal')
    def test_bulk_insert_success(self, mock_session, ingestion):
        """Test bulk insert"""
        mock_db = MagicMock()
        mock_session.return_value = mock_db

        records = [
            OHLCVRecord(
                date=date(2024, 1, 1),
                close=150.0
            )
        ]

        result = ingestion.bulk_insert(
            db=mock_db,
            company_id=1,
            records=records
        )

        # Verify execute was called
        mock_db.execute.assert_called_once()
        mock_db.commit.assert_called_once()

    def test_date_validation_from_after_to(self, ingestion):
        """Test that from_date must be before to_date"""
        with pytest.raises(ValueError, match="from_date must be before to_date"):
            ingestion.fetch_historical_data(
                ticker='AAPL.US',
                from_date='2024-12-31',
                to_date='2024-01-01'  # Before from_date
            )

    def test_date_validation_invalid_format(self, ingestion):
        """Test invalid date format"""
        with pytest.raises(ValueError, match="Invalid date format"):
            ingestion.fetch_historical_data(
                ticker='AAPL.US',
                from_date='01/01/2024',  # Wrong format
                to_date='2024-12-31'
            )


class TestRateLimiting:
    """Test rate limiting"""

    @pytest.fixture
    def ingestion(self):
        return OHLCVIngestion(api_key='test_key_12345')

    def test_rate_limit_tracking(self, ingestion):
        """Test that rate limiting tracks requests"""
        import time

        # Simulate multiple requests
        for i in range(5):
            ingestion._check_rate_limit()
            time.sleep(0.01)

        # Should have 5 tracked requests
        assert len(ingestion.request_times) == 5

    def test_rate_limit_exceeded(self, ingestion):
        """Test rate limit exception"""
        from ingestion.base_ingestion import RateLimitExceeded

        # Set low limit for testing
        ingestion.rate_limit_per_minute = 2

        # First 2 requests should succeed
        ingestion._check_rate_limit()
        ingestion._check_rate_limit()

        # Third request should fail
        with pytest.raises(RateLimitExceeded):
            ingestion._check_rate_limit()


class TestSecurityFeatures:
    """Test security features"""

    def test_api_key_not_in_logs(self, ingestion, caplog):
        """Test that API key is never logged"""
        with patch('ingestion.ohlcv_ingestion.OHLCVIngestion._make_request'):
            try:
                ingestion.fetch_historical_data(
                    'AAPL.US', '2024-01-01', '2024-01-31'
                )
            except Exception:
                # Expected to fail in test environment, we just check logs
                pass

        # Check logs don't contain API key
        for record in caplog.records:
            assert 'test_key_12345' not in record.message

    def test_sql_injection_prevention(self, ingestion):
        """Test that SQL injection attempts are blocked"""
        with pytest.raises(ValueError, match="Invalid ticker format"):
            ingestion._validate_ticker("'; DROP TABLE companies; --")


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
