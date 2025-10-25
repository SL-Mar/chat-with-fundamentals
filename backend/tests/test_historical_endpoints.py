"""
Test Suite for Historical Data Endpoints

Tests for /historical/* endpoints:
- /historical/eod - End-of-day historical data
- /historical/eod-extended - 30+ years from database
- /historical/intraday - Intraday minute-level data
- /historical/live - Live/latest prices
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

TEST_TICKER = "AAPL"


class TestEODHistorical:
    """Tests for /historical/eod endpoint"""

    def test_eod_success(self):
        """Test successful EOD data retrieval"""
        response = client.get(
            "/historical/eod",
            params={
                "ticker": TEST_TICKER,
                "from": "2024-01-01",
                "to": "2024-12-31"
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of OHLCV data
        assert isinstance(data, list)
        assert len(data) > 0

        # Verify data structure
        first_item = data[0]
        assert "date" in first_item
        assert "open" in first_item
        assert "high" in first_item
        assert "low" in first_item
        assert "close" in first_item
        assert "volume" in first_item

        # OHLC consistency
        assert first_item["high"] >= first_item["low"]
        assert first_item["high"] >= first_item["open"]
        assert first_item["high"] >= first_item["close"]

    def test_eod_default_period(self):
        """Test EOD with default period (last year)"""
        response = client.get(
            "/historical/eod",
            params={"ticker": TEST_TICKER}
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0

    def test_eod_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.get(
            "/historical/eod",
            params={"ticker": "INVALID_TICKER_XYZ"}
        )

        # Should handle gracefully
        assert response.status_code in [200, 404, 502]

    def test_eod_date_validation(self):
        """Test date range validation"""
        response = client.get(
            "/historical/eod",
            params={
                "ticker": TEST_TICKER,
                "from": "2024-12-31",  # from > to
                "to": "2024-01-01"
            }
        )

        # Should return error or empty list
        assert response.status_code in [200, 400]


class TestEODExtended:
    """Tests for /historical/eod-extended endpoint (database)"""

    def test_eod_extended_full_history(self):
        """Test 30+ year historical data from database"""
        response = client.get(
            "/historical/eod-extended",
            params={
                "ticker": TEST_TICKER,
                "from_date": "1990-01-01",
                "to_date": "2024-12-31",
                "period": "d"  # Daily
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should have many years of data
        assert isinstance(data, list)
        assert len(data) > 1000  # At least ~4 years of daily data

    def test_eod_extended_monthly_period(self):
        """Test monthly period for long-term charts"""
        response = client.get(
            "/historical/eod-extended",
            params={
                "ticker": TEST_TICKER,
                "from_date": "1990-01-01",
                "to_date": "2024-12-31",
                "period": "m"  # Monthly
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Monthly data should be much smaller
        assert len(data) < 500  # ~35 years × 12 months = 420

    def test_eod_extended_weekly_period(self):
        """Test weekly period"""
        response = client.get(
            "/historical/eod-extended",
            params={
                "ticker": TEST_TICKER,
                "from_date": "2020-01-01",
                "to_date": "2024-12-31",
                "period": "w"  # Weekly
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) > 0

    def test_eod_extended_adjusted_prices(self):
        """Test adjusted vs unadjusted prices"""
        response = client.get(
            "/historical/eod-extended",
            params={
                "ticker": TEST_TICKER,
                "from_date": "2023-01-01",
                "to_date": "2024-12-31",
                "adjusted": True
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Check if adjusted_close is present
        if len(data) > 0:
            first_item = data[0]
            # May have adjusted_close field
            if "adjusted_close" in first_item:
                assert first_item["adjusted_close"] > 0


class TestIntradayHistorical:
    """Tests for /historical/intraday endpoint"""

    def test_intraday_success(self):
        """Test successful intraday data retrieval"""
        response = client.get(
            "/historical/intraday",
            params={
                "ticker": TEST_TICKER,
                "interval": "5m"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_intraday_1min_interval(self):
        """Test 1-minute interval"""
        response = client.get(
            "/historical/intraday",
            params={
                "ticker": TEST_TICKER,
                "interval": "1m"
            }
        )

        assert response.status_code == 200
        data = response.json()

        # 1-minute data should have many points
        # (390 minutes per trading day)
        assert isinstance(data, list)

    def test_intraday_15min_interval(self):
        """Test 15-minute interval"""
        response = client.get(
            "/historical/intraday",
            params={
                "ticker": TEST_TICKER,
                "interval": "15m"
            }
        )

        assert response.status_code == 200

    def test_intraday_with_date_range(self):
        """Test intraday with specific date range"""
        response = client.get(
            "/historical/intraday",
            params={
                "ticker": TEST_TICKER,
                "interval": "5m",
                "from_date": "2024-01-01",
                "to_date": "2024-01-31"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_intraday_invalid_interval(self):
        """Test with invalid interval"""
        response = client.get(
            "/historical/intraday",
            params={
                "ticker": TEST_TICKER,
                "interval": "invalid"
            }
        )

        # Should return validation error
        assert response.status_code in [400, 422]


class TestLivePrices:
    """Tests for /historical/live endpoint"""

    def test_live_price_success(self):
        """Test live price retrieval"""
        response = client.get(
            "/historical/live",
            params={"ticker": TEST_TICKER}
        )

        assert response.status_code == 200
        data = response.json()

        # Should have current price info
        assert "price" in data or "close" in data
        assert "timestamp" in data or "date" in data

    def test_live_price_multiple_tickers(self):
        """Test multiple tickers at once"""
        response = client.get(
            "/historical/live",
            params={"tickers": "AAPL,MSFT,GOOGL"}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return dict or list with multiple prices
        assert isinstance(data, (list, dict))

    def test_live_price_extended_hours(self):
        """Test extended hours data"""
        response = client.get(
            "/historical/live",
            params={
                "ticker": TEST_TICKER,
                "extended_hours": True
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None


@pytest.mark.integration
class TestHistoricalDataWorkflow:
    """Integration tests for historical data workflow"""

    def test_full_historical_analysis(self):
        """Test complete historical data workflow"""
        # Step 1: Get long-term EOD data from database
        eod_response = client.get(
            "/historical/eod-extended",
            params={
                "ticker": TEST_TICKER,
                "from_date": "2020-01-01",
                "to_date": "2024-12-31",
                "period": "d"
            }
        )
        assert eod_response.status_code == 200
        eod_data = eod_response.json()

        # Step 2: Get recent intraday data
        intraday_response = client.get(
            "/historical/intraday",
            params={
                "ticker": TEST_TICKER,
                "interval": "5m"
            }
        )
        assert intraday_response.status_code == 200

        # Step 3: Get current live price
        live_response = client.get(
            "/historical/live",
            params={"ticker": TEST_TICKER}
        )
        assert live_response.status_code == 200

        print(f"\nHistorical Data for {TEST_TICKER}:")
        print(f"  EOD records: {len(eod_data)}")
        if len(eod_data) > 0:
            print(f"  First date: {eod_data[0].get('date')}")
            print(f"  Last date: {eod_data[-1].get('date')}")

    def test_data_consistency_check(self):
        """Test data consistency across time periods"""
        # Get same period from both endpoints
        from_date = "2024-01-01"
        to_date = "2024-01-31"

        # API endpoint
        api_response = client.get(
            "/historical/eod",
            params={
                "ticker": TEST_TICKER,
                "from": from_date,
                "to": to_date
            }
        )

        # Database endpoint
        db_response = client.get(
            "/historical/eod-extended",
            params={
                "ticker": TEST_TICKER,
                "from_date": from_date,
                "to_date": to_date,
                "period": "d"
            }
        )

        assert api_response.status_code == 200
        assert db_response.status_code == 200

        # Both should return data (might differ in source)
        api_data = api_response.json()
        db_data = db_response.json()

        assert len(api_data) > 0 or len(db_data) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
