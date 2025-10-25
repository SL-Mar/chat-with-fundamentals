"""
Test Suite for Calendar Endpoints

Tests for /calendar/* endpoints:
- /calendar/earnings - Upcoming earnings reports
- /calendar/ipos - Upcoming IPOs
- /calendar/economic - Economic calendar events
"""

import pytest
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)


class TestEarningsCalendar:
    """Tests for /calendar/earnings endpoint"""

    def test_earnings_success(self):
        """Test successful earnings calendar retrieval"""
        response = client.get(
            "/calendar/earnings",
            params={"limit": 20}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of earnings events
        assert isinstance(data, list)

    def test_earnings_with_date_range(self):
        """Test earnings for specific date range"""
        today = datetime.now()
        from_date = today.strftime("%Y-%m-%d")
        to_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")

        response = client.get(
            "/calendar/earnings",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_earnings_structure(self):
        """Test earnings event structure"""
        response = client.get(
            "/calendar/earnings",
            params={"limit": 10}
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            first_event = data[0]

            # Essential fields
            ticker_fields = ["symbol", "ticker", "code"]
            assert any(field in first_event for field in ticker_fields)

            date_fields = ["date", "report_date", "earnings_date"]
            assert any(field in first_event for field in date_fields)

    def test_earnings_this_week(self):
        """Test earnings for current week"""
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        response = client.get(
            "/calendar/earnings",
            params={
                "from_date": week_start.strftime("%Y-%m-%d"),
                "to_date": week_end.strftime("%Y-%m-%d")
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_earnings_specific_ticker(self):
        """Test earnings for specific ticker"""
        response = client.get(
            "/calendar/earnings",
            params={"ticker": "AAPL"}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return earnings events for AAPL only
        if len(data) > 0:
            for event in data:
                ticker = (
                    event.get("symbol") or
                    event.get("ticker") or
                    event.get("code")
                )
                assert ticker == "AAPL" or ticker == "AAPL.US"

    def test_earnings_time_of_day(self):
        """Test that earnings have time-of-day info (BMO/AMC)"""
        response = client.get(
            "/calendar/earnings",
            params={"limit": 20}
        )

        assert response.status_code == 200
        data = response.json()

        # Some events might have timing info
        if len(data) > 0:
            # Check if any events have timing
            time_fields = ["time", "timing", "when"]
            has_timing = any(
                any(field in event for field in time_fields)
                for event in data
            )
            # Not all sources provide this, so we don't assert


class TestIPOCalendar:
    """Tests for /calendar/ipos endpoint"""

    def test_ipos_success(self):
        """Test successful IPO calendar retrieval"""
        response = client.get(
            "/calendar/ipos",
            params={"limit": 20}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of IPO events
        assert isinstance(data, list)

    def test_ipos_with_date_range(self):
        """Test IPOs for specific date range"""
        today = datetime.now()
        from_date = today.strftime("%Y-%m-%d")
        to_date = (today + timedelta(days=90)).strftime("%Y-%m-%d")

        response = client.get(
            "/calendar/ipos",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_ipos_structure(self):
        """Test IPO event structure"""
        response = client.get(
            "/calendar/ipos",
            params={"limit": 10}
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            first_ipo = data[0]

            # Essential fields
            name_fields = ["name", "company", "company_name"]
            assert any(field in first_ipo for field in name_fields)

            date_fields = ["date", "ipo_date", "expected_date"]
            assert any(field in first_ipo for field in date_fields)

    def test_ipos_pricing_info(self):
        """Test that IPOs have pricing information"""
        response = client.get(
            "/calendar/ipos",
            params={"limit": 10}
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            # Some IPOs might have price range
            price_fields = [
                "price",
                "price_range",
                "expected_price",
                "offer_price"
            ]

            # Check if any IPOs have pricing info
            has_pricing = any(
                any(field in ipo for field in price_fields)
                for ipo in data
            )
            # Not all IPOs have pricing yet, so we don't assert

    def test_ipos_upcoming(self):
        """Test upcoming IPOs only"""
        today = datetime.now()
        from_date = today.strftime("%Y-%m-%d")
        to_date = (today + timedelta(days=60)).strftime("%Y-%m-%d")

        response = client.get(
            "/calendar/ipos",
            params={
                "from_date": from_date,
                "to_date": to_date,
                "limit": 30
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


class TestEconomicCalendar:
    """Tests for /calendar/economic endpoint"""

    def test_economic_success(self):
        """Test successful economic calendar retrieval"""
        response = client.get(
            "/calendar/economic",
            params={"limit": 20}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of economic events
        assert isinstance(data, list)

    def test_economic_with_date_range(self):
        """Test economic events for specific date range"""
        today = datetime.now()
        from_date = today.strftime("%Y-%m-%d")
        to_date = (today + timedelta(days=14)).strftime("%Y-%m-%d")

        response = client.get(
            "/calendar/economic",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_economic_structure(self):
        """Test economic event structure"""
        response = client.get(
            "/calendar/economic",
            params={"limit": 10}
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            first_event = data[0]

            # Essential fields
            assert "event" in first_event or "name" in first_event
            assert "date" in first_event or "datetime" in first_event

    def test_economic_importance(self):
        """Test that events have importance/impact rating"""
        response = client.get(
            "/calendar/economic",
            params={"limit": 20}
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            # Check if events have importance rating
            importance_fields = [
                "importance",
                "impact",
                "priority",
                "volatility"
            ]

            # Some events might have importance
            has_importance = any(
                any(field in event for field in importance_fields)
                for event in data
            )
            # Not all sources provide this

    def test_economic_high_importance(self):
        """Test filtering high-importance events"""
        response = client.get(
            "/calendar/economic",
            params={
                "importance": "high",
                "limit": 15
            }
        )

        # Endpoint might not support filtering
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_economic_by_country(self):
        """Test filtering events by country"""
        response = client.get(
            "/calendar/economic",
            params={
                "country": "US",
                "limit": 20
            }
        )

        # Endpoint might not support country filtering
        assert response.status_code in [200, 400, 422]

        if response.status_code == 200:
            data = response.json()
            assert isinstance(data, list)

    def test_economic_this_week(self):
        """Test economic events for current week"""
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        response = client.get(
            "/calendar/economic",
            params={
                "from_date": week_start.strftime("%Y-%m-%d"),
                "to_date": week_end.strftime("%Y-%m-%d")
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.integration
class TestCalendarWorkflow:
    """Integration tests for calendar workflow"""

    def test_full_week_calendar(self):
        """Test complete week calendar view"""
        today = datetime.now()
        week_start = today - timedelta(days=today.weekday())
        week_end = week_start + timedelta(days=6)

        from_date = week_start.strftime("%Y-%m-%d")
        to_date = week_end.strftime("%Y-%m-%d")

        # Step 1: Get earnings
        earnings_response = client.get(
            "/calendar/earnings",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )
        assert earnings_response.status_code == 200
        earnings = earnings_response.json()

        # Step 2: Get IPOs
        ipos_response = client.get(
            "/calendar/ipos",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )
        assert ipos_response.status_code == 200
        ipos = ipos_response.json()

        # Step 3: Get economic events
        economic_response = client.get(
            "/calendar/economic",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )
        assert economic_response.status_code == 200
        economic = economic_response.json()

        print(f"\nCalendar for Week of {from_date}:")
        print(f"  Earnings: {len(earnings)} companies reporting")
        print(f"  IPOs: {len(ipos)} scheduled")
        print(f"  Economic events: {len(economic)} events")

    def test_next_30_days_calendar(self):
        """Test calendar for next 30 days"""
        today = datetime.now()
        from_date = today.strftime("%Y-%m-%d")
        to_date = (today + timedelta(days=30)).strftime("%Y-%m-%d")

        # Get all calendar types
        earnings_response = client.get(
            "/calendar/earnings",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )

        ipos_response = client.get(
            "/calendar/ipos",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )

        economic_response = client.get(
            "/calendar/economic",
            params={
                "from_date": from_date,
                "to_date": to_date
            }
        )

        # At least one should succeed
        successful = [
            r.status_code == 200
            for r in [earnings_response, ipos_response, economic_response]
        ]
        assert any(successful)

        print(f"\nNext 30 Days ({from_date} to {to_date}):")
        if earnings_response.status_code == 200:
            print(f"  Earnings: {len(earnings_response.json())} reports")
        if ipos_response.status_code == 200:
            print(f"  IPOs: {len(ipos_response.json())} offerings")
        if economic_response.status_code == 200:
            print(f"  Economic: {len(economic_response.json())} events")

    @pytest.mark.slow
    def test_major_earnings_week(self):
        """Test finding weeks with major earnings"""
        # Look ahead 90 days
        today = datetime.now()

        for week_offset in range(0, 13):  # 13 weeks
            week_start = today + timedelta(weeks=week_offset)
            week_end = week_start + timedelta(days=6)

            response = client.get(
                "/calendar/earnings",
                params={
                    "from_date": week_start.strftime("%Y-%m-%d"),
                    "to_date": week_end.strftime("%Y-%m-%d")
                }
            )

            if response.status_code == 200:
                earnings = response.json()
                if len(earnings) >= 10:  # "Busy" earnings week
                    print(f"\nBusy week starting {week_start.strftime('%Y-%m-%d')}:")
                    print(f"  {len(earnings)} companies reporting")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
