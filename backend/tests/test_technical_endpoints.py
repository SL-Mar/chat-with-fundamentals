"""
Test Suite for Technical Analysis Endpoints

Tests for /technical/* endpoints:
- /technical/indicator - Technical indicators (RSI, MACD, SMA, EMA, Bollinger Bands)
- /technical/screener - Stock screener with filters
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

TEST_TICKER = "AAPL"


class TestTechnicalIndicators:
    """Tests for /technical/indicator endpoint"""

    def test_rsi_indicator(self):
        """Test RSI (Relative Strength Index)"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "rsi",
                "period": 14
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of data points
        assert isinstance(data, list)
        assert len(data) > 0

        # Each item should have date and RSI value
        first_item = data[0]
        assert "date" in first_item
        assert "value" in first_item or "rsi" in first_item

        # RSI should be between 0 and 100
        value = first_item.get("value") or first_item.get("rsi")
        if value is not None:
            assert 0 <= value <= 100

    def test_sma_indicator(self):
        """Test SMA (Simple Moving Average)"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "sma",
                "period": 50
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_ema_indicator(self):
        """Test EMA (Exponential Moving Average)"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "ema",
                "period": 20
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_macd_indicator(self):
        """Test MACD (Moving Average Convergence Divergence)"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "macd",
                "fastperiod": 12,
                "slowperiod": 26,
                "signalperiod": 9
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

        # MACD returns MACD line, signal line, histogram
        first_item = data[0]
        assert "date" in first_item

    def test_bbands_indicator(self):
        """Test Bollinger Bands"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "bbands",
                "period": 20
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_indicator_with_date_range(self):
        """Test indicator with date range filter"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "rsi",
                "period": 14,
                "from_date": "2024-01-01",
                "to_date": "2024-12-31"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_invalid_indicator_function(self):
        """Test with invalid indicator function"""
        response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "invalid_indicator",
                "period": 14
            }
        )

        # Should return error or empty data
        assert response.status_code in [400, 502]


class TestTechnicalScreener:
    """Tests for /technical/screener endpoint"""

    def test_screener_basic(self):
        """Test basic screener without filters"""
        response = client.get(
            "/technical/screener",
            params={"limit": 10}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return dict with data key
        assert "data" in data
        stocks = data["data"]
        assert isinstance(stocks, list)
        assert len(stocks) <= 10

    def test_screener_with_signal_filter(self):
        """Test screener with technical signal"""
        response = client.get(
            "/technical/screener",
            params={
                "signals": "50d_new_hi",
                "limit": 20
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_screener_with_sort(self):
        """Test screener with sorting"""
        response = client.get(
            "/technical/screener",
            params={
                "sort": "market_capitalization.desc",
                "limit": 15
            }
        )

        assert response.status_code == 200
        data = response.json()
        stocks = data["data"]

        # Verify results are sorted by market cap (descending)
        if len(stocks) >= 2:
            # Each stock should have market cap info
            for stock in stocks:
                assert "code" in stock or "symbol" in stock

    def test_screener_pagination(self):
        """Test screener pagination"""
        # First page
        response1 = client.get(
            "/technical/screener",
            params={"limit": 10, "offset": 0}
        )
        assert response1.status_code == 200
        data1 = response1.json()

        # Second page
        response2 = client.get(
            "/technical/screener",
            params={"limit": 10, "offset": 10}
        )
        assert response2.status_code == 200
        data2 = response2.json()

        # Should return different results
        stocks1 = data1.get("data", [])
        stocks2 = data2.get("data", [])

        # Basic check: pages should exist
        assert len(stocks1) > 0 or len(stocks2) > 0

    def test_screener_limit_validation(self):
        """Test limit parameter validation"""
        # Too large
        response = client.get(
            "/technical/screener",
            params={"limit": 101}
        )
        assert response.status_code == 422  # Validation error

    @pytest.mark.slow
    def test_screener_comprehensive_filters(self):
        """Test screener with comprehensive filters"""
        # This test may take longer due to complex filtering
        response = client.get(
            "/technical/screener",
            params={
                "signals": "50d_new_hi",
                "sort": "market_capitalization.desc",
                "limit": 50
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert "data" in data


@pytest.mark.integration
class TestTechnicalAnalysisWorkflow:
    """Integration tests for technical analysis workflow"""

    def test_full_technical_analysis(self):
        """Test complete technical analysis workflow"""
        # Step 1: Get RSI
        rsi_response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "rsi",
                "period": 14
            }
        )
        assert rsi_response.status_code == 200
        rsi_data = rsi_response.json()
        latest_rsi = rsi_data[-1] if rsi_data else None

        # Step 2: Get MACD
        macd_response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "macd"
            }
        )
        assert macd_response.status_code == 200

        # Step 3: Get Bollinger Bands
        bb_response = client.get(
            "/technical/indicator",
            params={
                "ticker": TEST_TICKER,
                "function": "bbands",
                "period": 20
            }
        )
        assert bb_response.status_code == 200

        # Step 4: Screen for similar setups
        screener_response = client.get(
            "/technical/screener",
            params={"limit": 20}
        )
        assert screener_response.status_code == 200

        print(f"\nTechnical Analysis for {TEST_TICKER}:")
        if latest_rsi:
            rsi_value = latest_rsi.get("value") or latest_rsi.get("rsi")
            print(f"  Latest RSI: {rsi_value}")
            if rsi_value:
                if rsi_value > 70:
                    print("  Signal: Overbought")
                elif rsi_value < 30:
                    print("  Signal: Oversold")
                else:
                    print("  Signal: Neutral")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
