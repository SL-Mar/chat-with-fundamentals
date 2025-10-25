"""
Test Suite for News Endpoints

Tests for /news/* endpoints:
- /news/latest - Latest news articles
- /news/sentiment - Sentiment analysis
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

TEST_TICKER = "AAPL"


class TestLatestNews:
    """Tests for /news/latest endpoint"""

    def test_news_success(self):
        """Test successful news retrieval"""
        response = client.get(
            "/news/latest",
            params={
                "ticker": TEST_TICKER,
                "limit": 10
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of news articles
        assert isinstance(data, list)
        assert len(data) > 0
        assert len(data) <= 10

        # Verify article structure
        first_article = data[0]
        assert "title" in first_article
        assert "date" in first_article or "published_at" in first_article
        assert "url" in first_article or "link" in first_article

    def test_news_default_limit(self):
        """Test news with default limit"""
        response = client.get(
            "/news/latest",
            params={"ticker": TEST_TICKER}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_news_large_limit(self):
        """Test news with large limit"""
        response = client.get(
            "/news/latest",
            params={
                "ticker": TEST_TICKER,
                "limit": 50
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 50

    def test_news_with_date_range(self):
        """Test news with date range filter"""
        response = client.get(
            "/news/latest",
            params={
                "ticker": TEST_TICKER,
                "from_date": "2024-01-01",
                "to_date": "2024-12-31",
                "limit": 20
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_news_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.get(
            "/news/latest",
            params={"ticker": "INVALID_TICKER_XYZ"}
        )

        # Should handle gracefully (empty list or error)
        assert response.status_code in [200, 404, 502]
        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_news_limit_validation(self):
        """Test limit parameter validation"""
        # Too large limit
        response = client.get(
            "/news/latest",
            params={
                "ticker": TEST_TICKER,
                "limit": 1001  # Assuming max is 1000
            }
        )

        # Should either cap at max or return validation error
        assert response.status_code in [200, 422]

    def test_news_article_fields(self):
        """Test that articles have expected fields"""
        response = client.get(
            "/news/latest",
            params={
                "ticker": TEST_TICKER,
                "limit": 5
            }
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            article = data[0]

            # Essential fields
            assert "title" in article
            assert len(article["title"]) > 0

            # Date field (various formats)
            date_fields = ["date", "published_at", "publishedDate", "datetime"]
            assert any(field in article for field in date_fields)

            # URL field (various names)
            url_fields = ["url", "link", "article_url"]
            assert any(field in article for field in url_fields)

            # Optional but common fields
            optional_fields = ["source", "sentiment", "image"]
            # At least some articles might have these


class TestNewsSentiment:
    """Tests for /news/sentiment endpoint"""

    def test_sentiment_success(self):
        """Test successful sentiment analysis"""
        response = client.get(
            "/news/sentiment",
            params={"ticker": TEST_TICKER}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return sentiment analysis
        assert isinstance(data, dict)

        # Common sentiment fields
        possible_fields = [
            "sentiment",
            "score",
            "positive",
            "negative",
            "neutral",
            "polarity",
            "overall_sentiment"
        ]

        # At least one sentiment field should be present
        assert any(field in data for field in possible_fields)

    def test_sentiment_with_period(self):
        """Test sentiment for specific period"""
        response = client.get(
            "/news/sentiment",
            params={
                "ticker": TEST_TICKER,
                "from_date": "2024-01-01",
                "to_date": "2024-12-31"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_sentiment_with_limit(self):
        """Test sentiment based on N articles"""
        response = client.get(
            "/news/sentiment",
            params={
                "ticker": TEST_TICKER,
                "limit": 20
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, dict)

    def test_sentiment_score_range(self):
        """Test that sentiment scores are in valid range"""
        response = client.get(
            "/news/sentiment",
            params={"ticker": TEST_TICKER}
        )

        assert response.status_code == 200
        data = response.json()

        # If score field exists, should be in reasonable range
        if "score" in data:
            score = data["score"]
            # Typical sentiment scores are -1 to +1 or 0 to 1
            assert -1.5 <= score <= 1.5

        # If polarity exists, check range
        if "polarity" in data:
            polarity = data["polarity"]
            assert -1.5 <= polarity <= 1.5

    def test_sentiment_with_details(self):
        """Test sentiment with detailed breakdown"""
        response = client.get(
            "/news/sentiment",
            params={
                "ticker": TEST_TICKER,
                "include_details": True
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Might include breakdown of positive/negative/neutral
        if "positive" in data:
            assert isinstance(data["positive"], (int, float))
            assert data["positive"] >= 0

        if "negative" in data:
            assert isinstance(data["negative"], (int, float))
            assert data["negative"] >= 0

    def test_sentiment_invalid_ticker(self):
        """Test sentiment with invalid ticker"""
        response = client.get(
            "/news/sentiment",
            params={"ticker": "INVALID_TICKER_XYZ"}
        )

        # Should handle gracefully
        assert response.status_code in [200, 404, 502]


@pytest.mark.integration
class TestNewsWorkflow:
    """Integration tests for news workflow"""

    def test_news_and_sentiment_combined(self):
        """Test combined news + sentiment analysis"""
        # Step 1: Get latest news
        news_response = client.get(
            "/news/latest",
            params={
                "ticker": TEST_TICKER,
                "limit": 20
            }
        )
        assert news_response.status_code == 200
        news_data = news_response.json()

        # Step 2: Get sentiment
        sentiment_response = client.get(
            "/news/sentiment",
            params={"ticker": TEST_TICKER}
        )
        assert sentiment_response.status_code == 200
        sentiment_data = sentiment_response.json()

        print(f"\nNews Analysis for {TEST_TICKER}:")
        print(f"  Articles found: {len(news_data)}")
        if len(news_data) > 0:
            print(f"  Latest: {news_data[0].get('title', 'N/A')}")

        print(f"  Sentiment: {sentiment_data}")

    def test_sentiment_over_time(self):
        """Test sentiment tracking over different periods"""
        periods = [
            ("2024-01-01", "2024-03-31", "Q1"),
            ("2024-04-01", "2024-06-30", "Q2"),
            ("2024-07-01", "2024-09-30", "Q3"),
        ]

        sentiments = []

        for from_date, to_date, label in periods:
            response = client.get(
                "/news/sentiment",
                params={
                    "ticker": TEST_TICKER,
                    "from_date": from_date,
                    "to_date": to_date
                }
            )

            if response.status_code == 200:
                data = response.json()
                sentiments.append((label, data))

        # Should get sentiment for at least some periods
        assert len(sentiments) > 0

        print(f"\nQuarterly Sentiment for {TEST_TICKER}:")
        for label, sentiment in sentiments:
            print(f"  {label}: {sentiment}")

    @pytest.mark.slow
    def test_news_pagination(self):
        """Test fetching large amounts of news"""
        all_news = []

        # Fetch multiple batches
        for offset in range(0, 100, 20):
            response = client.get(
                "/news/latest",
                params={
                    "ticker": TEST_TICKER,
                    "limit": 20,
                    "offset": offset
                }
            )

            if response.status_code == 200:
                data = response.json()
                if len(data) == 0:
                    break
                all_news.extend(data)
            else:
                break

        print(f"\nTotal news articles fetched: {len(all_news)}")
        assert len(all_news) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
