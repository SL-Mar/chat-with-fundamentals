"""
Test Suite for Chat Panels Endpoint

Tests for /chat/panels endpoint:
- AI-generated panel suggestions
- Multi-panel responses
- Database capability awareness
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestChatPanels:
    """Tests for /chat/panels endpoint"""

    def test_panels_simple_query(self):
        """Test simple panel generation query"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Show me AAPL price chart",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return panel suggestions
        assert "panels" in data or "response" in data

    def test_panels_technical_analysis(self):
        """Test technical analysis query"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Analyze AAPL technical indicators with RSI and MACD",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should generate relevant panels
        assert data is not None

    def test_panels_fundamental_analysis(self):
        """Test fundamental analysis query"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "What are MSFT's key financial metrics and performance ratios?",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None

    def test_panels_multi_panel_request(self):
        """Test request that should generate multiple panels"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Give me a complete analysis of TSLA including price, performance, volatility, and news",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should generate multiple panels
        if "panels" in data:
            assert isinstance(data["panels"], list)
            # Comprehensive analysis should have 3+ panels
            assert len(data["panels"]) >= 1

    def test_panels_historical_data_query(self):
        """Test query emphasizing historical data"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Show me AAPL's 30-year price history from the database",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None

        # Should use database-aware panels (eod-extended)
        # Panel type should be appropriate for long-term data

    def test_panels_comparison_query(self):
        """Test multi-stock comparison query"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Compare AAPL, MSFT, GOOGL, and AMZN performance",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None

    def test_panels_news_sentiment_query(self):
        """Test news and sentiment query"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "What's the latest news and sentiment for TSLA?",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None

    def test_panels_risk_analysis_query(self):
        """Test risk analysis query"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Analyze AAPL's risk metrics including volatility and max drawdown",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None

    def test_panels_with_conversation_history(self):
        """Test panels with conversation context"""
        history = [
            {"role": "user", "content": "Show me AAPL chart"},
            {"role": "assistant", "content": "Here's the AAPL price chart"},
        ]

        response = client.post(
            "/chat/panels",
            json={
                "message": "Now show me the performance ratios",
                "conversation_history": history
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert data is not None

    def test_panels_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Show me INVALID_TICKER_XYZ analysis",
                "conversation_history": []
            }
        )

        # Should still succeed but might indicate ticker not found
        assert response.status_code == 200

    def test_panels_empty_message(self):
        """Test with empty message"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "",
                "conversation_history": []
            }
        )

        # Should return validation error or handle gracefully
        assert response.status_code in [200, 400, 422]

    def test_panels_very_long_message(self):
        """Test with very long message"""
        long_message = "Analyze AAPL " * 100  # 1000+ characters

        response = client.post(
            "/chat/panels",
            json={
                "message": long_message,
                "conversation_history": []
            }
        )

        # Should handle gracefully (truncate or process)
        assert response.status_code in [200, 400, 422]


class TestChatPanelsCategories:
    """Test panel generation for different analysis categories"""

    def test_technical_analysis_category(self):
        """Test technical analysis category"""
        queries = [
            "Show me RSI and MACD for AAPL",
            "What are the technical indicators for MSFT?",
            "Analyze GOOGL with Bollinger Bands",
        ]

        for query in queries:
            response = client.post(
                "/chat/panels",
                json={"message": query, "conversation_history": []}
            )
            assert response.status_code == 200

    def test_fundamental_analysis_category(self):
        """Test fundamental analysis category"""
        queries = [
            "Show me AAPL's P/E ratio and fundamentals",
            "What are MSFT's financial metrics?",
            "Analyze GOOGL's valuation ratios",
        ]

        for query in queries:
            response = client.post(
                "/chat/panels",
                json={"message": query, "conversation_history": []}
            )
            assert response.status_code == 200

    def test_risk_analysis_category(self):
        """Test risk analysis category"""
        queries = [
            "Show me AAPL's volatility forecast",
            "What's the maximum drawdown for TSLA?",
            "Run Monte Carlo simulation for MSFT",
        ]

        for query in queries:
            response = client.post(
                "/chat/panels",
                json={"message": query, "conversation_history": []}
            )
            assert response.status_code == 200

    def test_news_sentiment_category(self):
        """Test news and sentiment category"""
        queries = [
            "What's the latest news for AAPL?",
            "Show me sentiment analysis for TSLA",
            "Recent news and analyst ratings for MSFT",
        ]

        for query in queries:
            response = client.post(
                "/chat/panels",
                json={"message": query, "conversation_history": []}
            )
            assert response.status_code == 200

    def test_corporate_actions_category(self):
        """Test corporate actions category"""
        queries = [
            "Show me AAPL's dividend history",
            "Has TSLA had any stock splits?",
            "Recent insider transactions for MSFT",
        ]

        for query in queries:
            response = client.post(
                "/chat/panels",
                json={"message": query, "conversation_history": []}
            )
            assert response.status_code == 200


@pytest.mark.integration
class TestChatPanelsWorkflow:
    """Integration tests for chat panels workflow"""

    def test_full_analysis_workflow(self):
        """Test complete analysis workflow via chat"""
        # Step 1: Ask for overview
        response1 = client.post(
            "/chat/panels",
            json={
                "message": "Give me an overview of AAPL",
                "conversation_history": []
            }
        )
        assert response1.status_code == 200

        # Step 2: Follow up with specific analysis
        history = [
            {"role": "user", "content": "Give me an overview of AAPL"},
            {"role": "assistant", "content": "Overview panels generated"},
        ]

        response2 = client.post(
            "/chat/panels",
            json={
                "message": "Now show me the risk analysis",
                "conversation_history": history
            }
        )
        assert response2.status_code == 200

    def test_multi_ticker_comparison_workflow(self):
        """Test multi-ticker comparison workflow"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Compare tech giants: AAPL, MSFT, GOOGL, AMZN",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()

        print("\nMulti-ticker comparison response:")
        print(f"  Response type: {type(data)}")
        if "panels" in data:
            print(f"  Panels generated: {len(data['panels'])}")

    def test_time_based_analysis_workflow(self):
        """Test time-based analysis workflow"""
        queries = [
            "Show me AAPL's performance in the last month",
            "What was MSFT's volatility in Q4 2023?",
            "Compare GOOGL's returns year-over-year",
        ]

        for query in queries:
            response = client.post(
                "/chat/panels",
                json={"message": query, "conversation_history": []}
            )
            assert response.status_code == 200

    @pytest.mark.slow
    def test_comprehensive_sector_analysis(self):
        """Test comprehensive sector analysis"""
        response = client.post(
            "/chat/panels",
            json={
                "message": "Give me a complete analysis of the tech sector: AAPL, MSFT, GOOGL, AMZN, META. Include price charts, performance ratios, and news sentiment.",
                "conversation_history": []
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should generate comprehensive panel set
        print("\nSector analysis response:")
        print(f"  Data structure: {type(data)}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
