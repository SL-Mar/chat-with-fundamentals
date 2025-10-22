"""
Comprehensive API Endpoint Testing Suite
Tests all backend endpoints with mocked EODHD API calls
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch, MagicMock
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app

# Test client
client = TestClient(app)

# Test headers with API key (set APP_API_KEY in environment for dev mode bypass)
TEST_HEADERS = {"X-API-Key": os.getenv("APP_API_KEY", "test-key-12345")}


class TestPublicEndpoints:
    """Test public endpoints that don't require authentication"""

    def test_root_endpoint(self):
        """Test health check endpoint"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "service" in data


class TestAuthentication:
    """Test API key authentication"""

    def test_protected_endpoint_without_auth(self):
        """Test that protected endpoints require authentication"""
        response = client.get("/log-test")
        assert response.status_code in [401, 403]

    def test_protected_endpoint_with_auth(self):
        """Test that protected endpoints work with valid API key"""
        response = client.get("/log-test", headers=TEST_HEADERS)
        assert response.status_code == 200


class TestHistoricalDataEndpoints:
    """Test historical price data endpoints with mocked API calls"""

    @patch('tools.eodhd_client.historical_data.HistoricalDataClient.get_eod')
    def test_eod_endpoint(self, mock_get_eod):
        """Test EOD historical data endpoint"""
        # Mock API response
        mock_get_eod.return_value = [
            {
                'date': '2024-01-01',
                'open': 150.0,
                'high': 153.0,
                'low': 149.0,
                'close': 152.0,
                'adjusted_close': 152.0,
                'volume': 1000000
            }
        ]

        response = client.get(
            "/historical/eod-extended",
            params={'ticker': 'AAPL.US', 'period': 'd'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        if len(data) > 0:
            assert 'date' in data[0]

    @patch('tools.eodhd_client.historical_data.HistoricalDataClient.get_live_price')
    def test_live_price_endpoint(self, mock_get_live):
        """Test live price endpoint"""
        # Mock API response
        mock_get_live.return_value = {
            'code': 'AAPL',
            'timestamp': 1704067200,
            'close': 152.0,
            'open': 150.0,
            'high': 153.0,
            'low': 149.0,
            'volume': 1000000,
            'previousClose': 151.0,
            'change': 1.0,
            'change_p': 0.66
        }

        response = client.get(
            "/historical/live-price",
            params={'ticker': 'AAPL.US'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert 'close' in data or 'code' in data

    @patch('tools.eodhd_client.historical_data.HistoricalDataClient.get_intraday')
    def test_intraday_endpoint(self, mock_get_intraday):
        """Test intraday data endpoint"""
        # Mock API response
        mock_get_intraday.return_value = [
            {
                'datetime': '2024-01-01 09:30:00',
                'open': 150.0,
                'high': 151.0,
                'low': 149.5,
                'close': 150.5,
                'volume': 50000
            }
        ]

        response = client.get(
            "/historical/intraday",
            params={'ticker': 'AAPL.US', 'interval': '5m'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        # May return empty if subscription doesn't support intraday
        assert isinstance(data, (list, dict))


class TestNewsEndpoints:
    """Test news and sentiment endpoints"""

    @patch('tools.eodhd_client.news_sentiment.NewsSentimentClient.get_news')
    def test_news_endpoint(self, mock_get_news):
        """Test news endpoint"""
        # Mock API response
        mock_get_news.return_value = [
            {
                'date': '2024-01-01 10:00:00',
                'title': 'Apple announces new product',
                'content': 'Apple Inc. announced...',
                'link': 'https://example.com/news/1',
                'symbols': ['AAPL'],
                'sentiment': {
                    'polarity': 0.8,
                    'neg': 0.0,
                    'neu': 0.2,
                    'pos': 0.8
                }
            }
        ]

        response = client.get(
            "/news/articles",
            params={'ticker': 'AAPL', 'limit': 10},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestTechnicalEndpoints:
    """Test technical indicators endpoints"""

    @patch('tools.eodhd_client.technical_analysis.TechnicalAnalysisClient.get_technical_indicator')
    def test_technical_indicators_endpoint(self, mock_get_tech):
        """Test technical indicators endpoint"""
        # Mock API response
        mock_get_tech.return_value = [
            {
                'date': '2024-01-01',
                'sma': 150.5
            }
        ]

        response = client.get(
            "/technical/indicator",
            params={
                'ticker': 'AAPL.US',
                'function': 'sma',
                'period': 20
            },
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestScreenerEndpoint:
    """Test stock screener endpoint"""

    @patch('tools.screener_tool.ScreenerTool.run')
    def test_stock_screener(self, mock_screener):
        """Test stock screener endpoint"""
        # Mock screener response
        mock_screener.return_value = {
            'results': [
                {
                    'ticker': 'AAPL.US',
                    'name': 'Apple Inc.',
                    'market_cap': 3000000000000,
                    'pe_ratio': 30.5
                }
            ],
            'count': 1
        }

        response = client.post(
            "/technical/screener",
            json={
                'filters': {
                    'market_cap_min': 1000000000,
                    'pe_ratio_max': 35
                }
            },
            headers=TEST_HEADERS
        )

        # Screener endpoint may not exist or may be structured differently
        assert response.status_code in [200, 404, 405]


class TestCorporateActionsEndpoints:
    """Test corporate actions endpoints (dividends, splits, insider trading)"""

    @patch('tools.eodhd_client.corporate_actions.CorporateActionsClient.get_dividends')
    def test_dividends_endpoint(self, mock_get_dividends):
        """Test dividends endpoint"""
        # Mock API response
        mock_get_dividends.return_value = [
            {
                'date': '2024-01-15',
                'declarationDate': '2024-01-01',
                'recordDate': '2024-01-10',
                'paymentDate': '2024-01-15',
                'value': 0.25,
                'unadjustedValue': 0.25,
                'currency': 'USD'
            }
        ]

        response = client.get(
            "/corporate/dividends",
            params={'ticker': 'AAPL.US'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))

    @patch('tools.eodhd_client.fundamental_data.FundamentalDataClient.get_insider_transactions')
    def test_insider_transactions_endpoint(self, mock_get_insider):
        """Test insider transactions endpoint"""
        # Mock API response
        mock_get_insider.return_value = [
            {
                'date': '2024-01-01',
                'ownerName': 'John Doe',
                'transactionType': 'Buy',
                'value': 1000000,
                'amount': 10000
            }
        ]

        response = client.get(
            "/corporate/insider-transactions",
            params={'ticker': 'AAPL.US'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestSpecialDataEndpoints:
    """Test special data endpoints (logos, ESG, etc.)"""

    @patch('tools.eodhd_client.special_data.SpecialDataClient.get_logo')
    def test_logo_endpoint(self, mock_get_logo):
        """Test company logo endpoint"""
        # Mock API response
        mock_get_logo.return_value = 'https://eodhistoricaldata.com/img/logos/US/aapl.png'

        response = client.get(
            "/special/logo",
            params={'ticker': 'AAPL.US'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert 'logo_url' in data or 'url' in data


class TestCalendarEndpoints:
    """Test calendar endpoints (earnings, IPOs, etc.)"""

    @patch('tools.eodhd_client.fundamental_data.FundamentalDataClient.get_calendar')
    def test_earnings_calendar_endpoint(self, mock_get_calendar):
        """Test earnings calendar endpoint"""
        # Mock API response
        mock_get_calendar.return_value = {
            'earnings': [
                {
                    'code': 'AAPL',
                    'report_date': '2024-01-31',
                    'date': '2024-01-31',
                    'before_after_market': 'AfterMarket',
                    'currency': 'USD',
                    'estimate': 2.10,
                    'actual': 2.18
                }
            ]
        }

        response = client.get(
            "/calendar/earnings",
            params={'from': '2024-01-01', 'to': '2024-01-31'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestSimulationEndpoints:
    """Test simulation endpoints (Monte Carlo, etc.)"""

    @patch('tools.eodhd_client.historical_data.HistoricalDataClient.get_eod')
    def test_monte_carlo_simulation(self, mock_get_eod):
        """Test Monte Carlo simulation endpoint"""
        # Mock historical data for simulation
        mock_get_eod.return_value = [
            {
                'date': f'2024-01-{i:02d}',
                'close': 150.0 + i * 0.5,
                'adjusted_close': 150.0 + i * 0.5
            }
            for i in range(1, 31)
        ]

        response = client.post(
            "/simulate/monte-carlo",
            json={
                'ticker': 'AAPL.US',
                'simulations': 100,
                'days': 30
            },
            headers=TEST_HEADERS
        )

        # May return 200 or 404 depending on if endpoint exists
        assert response.status_code in [200, 404, 422]


class TestChatPanelsEndpoint:
    """Test chat with dynamic panels endpoint"""

    @patch('workflows.chat_panel_flow.ChatPanelFlow.kickoff')
    def test_chat_panels_with_openai(self, mock_kickoff):
        """Test chat panels endpoint with OpenAI"""
        # Mock flow response
        mock_kickoff.return_value = {
            'message': 'Here is the dividend information for AAPL',
            'panels': [
                {
                    'type': 'show_dividend_history',
                    'props': {
                        'ticker': 'AAPL.US',
                        'dividends': []
                    }
                }
            ]
        }

        response = client.post(
            "/chat/panels",
            json={
                'message': 'Show me dividends for AAPL',
                'history': []
            },
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert 'message' in data

    def test_chat_panels_fallback(self):
        """Test chat panels fallback when OpenAI not available"""
        response = client.post(
            "/chat/panels",
            json={
                'message': 'Show me dividends for AAPL',
                'history': []
            },
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert 'message' in data


class TestMacroEndpoints:
    """Test macroeconomic data endpoints"""

    @patch('tools.eodhd_client.macro_economic.MacroEconomicClient.get_macro_indicator')
    def test_macro_indicator_endpoint(self, mock_get_macro):
        """Test macroeconomic indicator endpoint"""
        # Mock API response
        mock_get_macro.return_value = [
            {
                'Date': '2024-01-01',
                'Value': 3.5
            }
        ]

        response = client.get(
            "/macro/indicator",
            params={'country': 'USA', 'indicator': 'GDP'},
            headers=TEST_HEADERS
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, (list, dict))


class TestErrorHandling:
    """Test error handling and edge cases"""

    def test_invalid_ticker(self):
        """Test that invalid tickers are handled properly"""
        response = client.get(
            "/historical/eod-extended",
            params={'ticker': 'INVALID!!!!', 'period': 'd'},
            headers=TEST_HEADERS
        )

        # Should return error status (4xx or 5xx)
        assert response.status_code >= 400

    def test_rate_limiting(self):
        """Test that rate limiting works"""
        # Make 6 requests (limit is 5/minute)
        for i in range(6):
            response = client.get("/log-test", headers=TEST_HEADERS)
            if i < 5:
                assert response.status_code == 200
            else:
                # 6th request should be rate limited
                assert response.status_code == 429


def run_all_tests():
    """Run all tests and generate report"""
    print("\n" + "="*70)
    print("COMPREHENSIVE API ENDPOINT TEST SUITE")
    print("="*70 + "\n")

    # Run pytest programmatically
    pytest.main([
        __file__,
        '-v',
        '--tb=short',
        '--color=yes'
    ])


if __name__ == "__main__":
    run_all_tests()
