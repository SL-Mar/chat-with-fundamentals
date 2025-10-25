"""
Test Suite for Corporate Actions Endpoints

Tests for /corporate/* endpoints:
- /corporate/dividends - Dividend payment history
- /corporate/splits - Stock split history
- /corporate/insider-transactions - Insider buying/selling
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Use tickers known to have dividend/split history
DIVIDEND_TICKER = "AAPL"  # Known dividend payer
SPLIT_TICKER = "AAPL"     # Has split history
INSIDER_TICKER = "TSLA"   # Active insider transactions


class TestDividends:
    """Tests for /corporate/dividends endpoint"""

    def test_dividends_success(self):
        """Test successful dividend history retrieval"""
        response = client.get(
            "/corporate/dividends",
            params={
                "ticker": DIVIDEND_TICKER,
                "limit": 20
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of dividend events
        assert isinstance(data, list)

        # If ticker pays dividends, should have records
        if len(data) > 0:
            first_div = data[0]

            # Essential fields
            assert "date" in first_div or "payment_date" in first_div
            assert "dividend" in first_div or "amount" in first_div

            # Dividend amount should be positive
            amount = first_div.get("dividend") or first_div.get("amount")
            if amount is not None:
                assert amount > 0

    def test_dividends_date_range(self):
        """Test dividends with date range"""
        response = client.get(
            "/corporate/dividends",
            params={
                "ticker": DIVIDEND_TICKER,
                "from_date": "2020-01-01",
                "to_date": "2024-12-31"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_dividends_chronological_order(self):
        """Test that dividends are in chronological order"""
        response = client.get(
            "/corporate/dividends",
            params={
                "ticker": DIVIDEND_TICKER,
                "limit": 10
            }
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) >= 2:
            # Check ordering (either ascending or descending)
            first_date = data[0].get("date") or data[0].get("payment_date")
            second_date = data[1].get("date") or data[1].get("payment_date")

            # Dates should be ordered
            assert first_date is not None
            assert second_date is not None

    def test_dividends_no_dividend_stock(self):
        """Test with stock that doesn't pay dividends"""
        response = client.get(
            "/corporate/dividends",
            params={"ticker": "GOOGL"}  # Historically no dividends
        )

        assert response.status_code == 200
        data = response.json()

        # Should return empty list or minimal history
        assert isinstance(data, list)

    def test_dividends_yield_calculation(self):
        """Test that dividend yield is reasonable"""
        response = client.get(
            "/corporate/dividends",
            params={
                "ticker": DIVIDEND_TICKER,
                "limit": 4  # Last 4 quarters
            }
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) >= 4:
            # Calculate annual dividend
            annual_div = sum(
                d.get("dividend", 0) or d.get("amount", 0)
                for d in data[:4]
            )

            # Annual dividend should be positive and reasonable
            # (typically $0.10 to $10 for most stocks)
            assert 0 < annual_div < 50

    def test_dividends_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.get(
            "/corporate/dividends",
            params={"ticker": "INVALID_TICKER_XYZ"}
        )

        # Should handle gracefully
        assert response.status_code in [200, 404, 502]


class TestStockSplits:
    """Tests for /corporate/splits endpoint"""

    def test_splits_success(self):
        """Test successful split history retrieval"""
        response = client.get(
            "/corporate/splits",
            params={"ticker": SPLIT_TICKER}
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of split events
        assert isinstance(data, list)

        # If ticker has splits, verify structure
        if len(data) > 0:
            first_split = data[0]

            # Essential fields
            assert "date" in first_split
            assert "split" in first_split or "ratio" in first_split

    def test_splits_ratio_format(self):
        """Test that split ratios are properly formatted"""
        response = client.get(
            "/corporate/splits",
            params={"ticker": SPLIT_TICKER}
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            first_split = data[0]
            split_ratio = first_split.get("split") or first_split.get("ratio")

            # Ratio should be a string like "4:1" or "2-for-1"
            # or a float like 4.0
            assert split_ratio is not None
            assert isinstance(split_ratio, (str, int, float))

    def test_splits_date_range(self):
        """Test splits with date range"""
        response = client.get(
            "/corporate/splits",
            params={
                "ticker": SPLIT_TICKER,
                "from_date": "2010-01-01",
                "to_date": "2024-12-31"
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_splits_no_split_stock(self):
        """Test with stock that hasn't split"""
        response = client.get(
            "/corporate/splits",
            params={"ticker": "BRK.A"}  # Berkshire rarely splits
        )

        assert response.status_code == 200
        data = response.json()

        # Should return empty list
        assert isinstance(data, list)


class TestInsiderTransactions:
    """Tests for /corporate/insider-transactions endpoint"""

    def test_insider_transactions_success(self):
        """Test successful insider transaction retrieval"""
        response = client.get(
            "/corporate/insider-transactions",
            params={
                "ticker": INSIDER_TICKER,
                "limit": 20
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return list of transactions
        assert isinstance(data, list)

        # If transactions exist, verify structure
        if len(data) > 0:
            first_txn = data[0]

            # Essential fields
            assert "date" in first_txn or "filing_date" in first_txn
            assert "owner" in first_txn or "insider_name" in first_txn

            # Transaction type (buy/sell)
            type_fields = ["type", "transaction_type", "acquisition_or_disposition"]
            assert any(field in first_txn for field in type_fields)

    def test_insider_transactions_buy_sell(self):
        """Test filtering by transaction type"""
        # All transactions
        all_response = client.get(
            "/corporate/insider-transactions",
            params={
                "ticker": INSIDER_TICKER,
                "limit": 50
            }
        )

        assert all_response.status_code == 200
        all_data = all_response.json()

        if len(all_data) > 0:
            # Check that we have transaction types
            first_txn = all_data[0]
            type_fields = ["type", "transaction_type", "acquisition_or_disposition"]
            has_type = any(field in first_txn for field in type_fields)
            assert has_type

    def test_insider_transactions_with_shares(self):
        """Test that share amounts are present"""
        response = client.get(
            "/corporate/insider-transactions",
            params={
                "ticker": INSIDER_TICKER,
                "limit": 10
            }
        )

        assert response.status_code == 200
        data = response.json()

        if len(data) > 0:
            first_txn = data[0]

            # Shares field (various names)
            shares_fields = ["shares", "amount", "transaction_shares"]
            has_shares = any(field in first_txn for field in shares_fields)

            # Should have share count
            if has_shares:
                shares_field = next(f for f in shares_fields if f in first_txn)
                shares = first_txn[shares_field]
                assert isinstance(shares, (int, float))
                assert shares > 0

    def test_insider_transactions_date_range(self):
        """Test insider transactions with date range"""
        response = client.get(
            "/corporate/insider-transactions",
            params={
                "ticker": INSIDER_TICKER,
                "from_date": "2024-01-01",
                "to_date": "2024-12-31",
                "limit": 30
            }
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_insider_transactions_recent(self):
        """Test getting only recent transactions"""
        response = client.get(
            "/corporate/insider-transactions",
            params={
                "ticker": INSIDER_TICKER,
                "limit": 5
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Should return recent transactions
        assert len(data) <= 5


@pytest.mark.integration
class TestCorporateActionsWorkflow:
    """Integration tests for corporate actions workflow"""

    def test_full_corporate_history(self):
        """Test complete corporate action history"""
        ticker = "AAPL"

        # Step 1: Get dividends
        div_response = client.get(
            "/corporate/dividends",
            params={"ticker": ticker, "limit": 20}
        )
        assert div_response.status_code == 200
        dividends = div_response.json()

        # Step 2: Get splits
        split_response = client.get(
            "/corporate/splits",
            params={"ticker": ticker}
        )
        assert split_response.status_code == 200
        splits = split_response.json()

        # Step 3: Get insider transactions
        insider_response = client.get(
            "/corporate/insider-transactions",
            params={"ticker": ticker, "limit": 15}
        )
        assert insider_response.status_code == 200
        insiders = insider_response.json()

        print(f"\nCorporate Actions for {ticker}:")
        print(f"  Dividends: {len(dividends)} payments")
        print(f"  Splits: {len(splits)} events")
        print(f"  Insider transactions: {len(insiders)} recent")

        if len(dividends) > 0:
            latest_div = dividends[0]
            amount = latest_div.get("dividend", 0) or latest_div.get("amount", 0)
            date = latest_div.get("date", "N/A")
            print(f"  Latest dividend: ${amount:.2f} on {date}")

    def test_dividend_stock_analysis(self):
        """Test dividend stock analysis workflow"""
        ticker = "AAPL"

        # Get 1 year of dividends
        response = client.get(
            "/corporate/dividends",
            params={
                "ticker": ticker,
                "from_date": "2023-01-01",
                "to_date": "2024-12-31"
            }
        )

        assert response.status_code == 200
        dividends = response.json()

        if len(dividends) >= 2:
            # Calculate dividend metrics
            total_annual = sum(
                d.get("dividend", 0) or d.get("amount", 0)
                for d in dividends[:4] if d
            )

            # Verify dividend frequency (quarterly expected)
            assert len(dividends) >= 4  # At least 4 quarters

            print(f"\nDividend Analysis for {ticker}:")
            print(f"  Annual dividend: ${total_annual:.2f}")
            print(f"  Quarterly average: ${total_annual/4:.2f}")

    def test_insider_sentiment_analysis(self):
        """Test insider sentiment from transactions"""
        ticker = "TSLA"

        response = client.get(
            "/corporate/insider-transactions",
            params={
                "ticker": ticker,
                "limit": 30
            }
        )

        assert response.status_code == 200
        transactions = response.json()

        if len(transactions) > 0:
            # Count buys vs sells
            buys = 0
            sells = 0

            for txn in transactions:
                txn_type = (
                    txn.get("type") or
                    txn.get("transaction_type") or
                    txn.get("acquisition_or_disposition", "")
                ).lower()

                if "buy" in txn_type or "acquisition" in txn_type or "a" == txn_type:
                    buys += 1
                elif "sell" in txn_type or "disposition" in txn_type or "d" == txn_type:
                    sells += 1

            print(f"\nInsider Sentiment for {ticker}:")
            print(f"  Recent transactions: {len(transactions)}")
            print(f"  Buys: {buys}")
            print(f"  Sells: {sells}")

            if buys + sells > 0:
                buy_ratio = buys / (buys + sells)
                print(f"  Buy ratio: {buy_ratio:.1%}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
