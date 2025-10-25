"""
Test Suite for Equity Analysis Endpoints

Tests for /equity/* endpoints:
- /equity/simulate - Monte Carlo simulation
- /equity/returns - Returns distribution and beta
- /equity/cumret - Cumulative returns vs benchmark
- /equity/vol - Volatility forecast (EWMA)
- /equity/perf - Performance ratios (Sharpe, Sortino, Calmar)
"""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

# Test tickers
TEST_TICKER = "AAPL"
TEST_BENCHMARK = "SPY"


class TestMonteCarloSimulation:
    """Tests for /equity/simulate endpoint"""

    def test_simulate_success(self):
        """Test successful Monte Carlo simulation"""
        response = client.get(
            f"/equity/simulate",
            params={"ticker": TEST_TICKER, "horizon": 20}
        )

        assert response.status_code == 200
        data = response.json()

        # Check response structure
        assert "ticker" in data
        assert "var_95" in data
        assert "equity_curve" in data
        assert "monte_carlo" in data

        # Check Monte Carlo results
        mc = data["monte_carlo"]
        assert "paths" in mc
        assert "percentiles" in mc

        # Verify path count (1000 paths)
        assert len(mc["paths"]) == 1000

        # Verify percentiles
        assert "p5" in mc["percentiles"]
        assert "p50" in mc["percentiles"]
        assert "p95" in mc["percentiles"]

    def test_simulate_invalid_ticker(self):
        """Test with invalid ticker"""
        response = client.get(
            "/equity/simulate",
            params={"ticker": "INVALID_TICKER_XYZ", "horizon": 20}
        )

        assert response.status_code == 502  # Data provider error

    def test_simulate_horizon_validation(self):
        """Test horizon parameter validation"""
        # Too small
        response = client.get(
            "/equity/simulate",
            params={"ticker": TEST_TICKER, "horizon": 4}
        )
        assert response.status_code == 422  # Validation error

        # Too large
        response = client.get(
            "/equity/simulate",
            params={"ticker": TEST_TICKER, "horizon": 61}
        )
        assert response.status_code == 422

    def test_simulate_with_exchange_suffix(self):
        """Test ticker with exchange suffix"""
        response = client.get(
            "/equity/simulate",
            params={"ticker": "AAPL.US", "horizon": 20}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["ticker"] == "AAPL"


class TestReturnsAnalysis:
    """Tests for /equity/returns endpoint"""

    def test_returns_success(self):
        """Test successful returns analysis"""
        response = client.get(
            "/equity/returns",
            params={
                "ticker": TEST_TICKER,
                "years": 3,
                "benchmark": TEST_BENCHMARK
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "ticker" in data
        assert "benchmark" in data
        assert "years" in data
        assert "returns" in data
        assert "scatter" in data

        # Check returns data
        returns = data["returns"]
        assert "list" in returns
        assert "mean" in returns
        assert "std" in returns

        # Check scatter plot data (beta, alpha, R²)
        scatter = data["scatter"]
        assert "x" in scatter  # Benchmark returns
        assert "y" in scatter  # Stock returns
        assert "beta" in scatter
        assert "alpha" in scatter
        assert "r2" in scatter

        # Beta should be reasonable (typically 0.5 to 2.0 for stocks)
        assert -0.5 <= scatter["beta"] <= 3.0

        # R² should be between 0 and 1
        assert 0.0 <= scatter["r2"] <= 1.0

    def test_returns_years_validation(self):
        """Test years parameter validation"""
        # Too small
        response = client.get(
            "/equity/returns",
            params={"ticker": TEST_TICKER, "years": 0}
        )
        assert response.status_code == 422

        # Too large
        response = client.get(
            "/equity/returns",
            params={"ticker": TEST_TICKER, "years": 11}
        )
        assert response.status_code == 422


class TestCumulativeReturns:
    """Tests for /equity/cumret endpoint"""

    def test_cumret_success(self):
        """Test successful cumulative returns"""
        response = client.get(
            "/equity/cumret",
            params={
                "ticker": TEST_TICKER,
                "years": 3,
                "benchmark": TEST_BENCHMARK
            }
        )

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "ticker" in data
        assert "benchmark" in data
        assert "years" in data
        assert "cumret" in data

        # Check cumulative returns data
        cumret = data["cumret"]
        assert len(cumret) > 0

        # Each item should have date, tic, bmk
        first_item = cumret[0]
        assert "date" in first_item
        assert "tic" in first_item
        assert "bmk" in first_item

        # Cumulative returns should start near 1.0
        assert 0.5 <= first_item["tic"] <= 1.5
        assert 0.5 <= first_item["bmk"] <= 1.5


class TestVolatilityForecast:
    """Tests for /equity/vol endpoint"""

    def test_vol_success(self):
        """Test successful volatility forecast"""
        response = client.get(
            "/equity/vol",
            params={"ticker": TEST_TICKER, "lookback": 250}
        )

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "ticker" in data
        assert "sigma_t1" in data  # Latest volatility
        assert "ewma_vol" in data  # EWMA series
        assert "evt_cvar_99" in data  # CVaR 99%

        # Latest volatility should be positive
        assert data["sigma_t1"] > 0

        # EWMA series should match lookback period
        assert len(data["ewma_vol"]) == 250

        # CVaR should be positive
        assert data["evt_cvar_99"] > 0

    def test_vol_lookback_validation(self):
        """Test lookback parameter validation"""
        # Too small
        response = client.get(
            "/equity/vol",
            params={"ticker": TEST_TICKER, "lookback": 29}
        )
        assert response.status_code == 422

        # Too large
        response = client.get(
            "/equity/vol",
            params={"ticker": TEST_TICKER, "lookback": 501}
        )
        assert response.status_code == 422


class TestPerformanceRatios:
    """Tests for /equity/perf endpoint"""

    def test_perf_success(self):
        """Test successful performance ratios"""
        response = client.get(
            "/equity/perf",
            params={"ticker": TEST_TICKER, "years": 3}
        )

        assert response.status_code == 200
        data = response.json()

        # Check structure
        assert "ticker" in data
        assert "years" in data
        assert "sharpe" in data
        assert "sortino" in data
        assert "max_dd" in data
        assert "calmar" in data

        # Sharpe ratio typically -2 to +4 for stocks
        assert -3.0 <= data["sharpe"] <= 5.0

        # Sortino should be close to Sharpe
        assert -3.0 <= data["sortino"] <= 5.0

        # Max drawdown should be negative
        assert data["max_dd"] <= 0

        # Calmar ratio can be positive or negative
        assert -10.0 <= data["calmar"] <= 10.0

    def test_perf_years_validation(self):
        """Test years parameter validation"""
        # Too small
        response = client.get(
            "/equity/perf",
            params={"ticker": TEST_TICKER, "years": 0}
        )
        assert response.status_code == 422

        # Too large
        response = client.get(
            "/equity/perf",
            params={"ticker": TEST_TICKER, "years": 11}
        )
        assert response.status_code == 422


@pytest.mark.integration
class TestEquityEndpointsIntegration:
    """Integration tests combining multiple equity endpoints"""

    def test_full_equity_analysis_workflow(self):
        """Test complete workflow: simulate, analyze, forecast"""
        # Step 1: Monte Carlo simulation
        sim_response = client.get(
            "/equity/simulate",
            params={"ticker": TEST_TICKER, "horizon": 20}
        )
        assert sim_response.status_code == 200
        sim_data = sim_response.json()
        var_95 = sim_data["var_95"]

        # Step 2: Returns analysis
        ret_response = client.get(
            "/equity/returns",
            params={
                "ticker": TEST_TICKER,
                "years": 3,
                "benchmark": TEST_BENCHMARK
            }
        )
        assert ret_response.status_code == 200
        ret_data = ret_response.json()
        beta = ret_data["scatter"]["beta"]

        # Step 3: Volatility forecast
        vol_response = client.get(
            "/equity/vol",
            params={"ticker": TEST_TICKER, "lookback": 250}
        )
        assert vol_response.status_code == 200
        vol_data = vol_response.json()
        volatility = vol_data["sigma_t1"]

        # Step 4: Performance ratios
        perf_response = client.get(
            "/equity/perf",
            params={"ticker": TEST_TICKER, "years": 3}
        )
        assert perf_response.status_code == 200
        perf_data = perf_response.json()
        sharpe = perf_data["sharpe"]

        # Verify consistency across endpoints
        # VaR should be related to volatility
        assert abs(var_95) <= volatility * 5  # Rough check

        print(f"\nIntegration Test Results for {TEST_TICKER}:")
        print(f"  Beta: {beta:.2f}")
        print(f"  Volatility (EWMA): {volatility:.4f}")
        print(f"  VaR 95%: {var_95:.4f}")
        print(f"  Sharpe Ratio: {sharpe:.2f}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
