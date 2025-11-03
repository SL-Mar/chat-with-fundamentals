# File: routers/special.py
# Special data endpoints: logos, analyst ratings, ESG, shareholders, market cap history

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
import logging
from tools.eodhd_client import EODHDClient

router = APIRouter(prefix="/special", tags=["Special Data"])
logger = logging.getLogger("special")


@router.get("/logo")
async def get_company_logo(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get company logo URL.

    Returns the URL to the company's logo image.

    Example: /special/logo?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        logo_path = client.special.get_logo(ticker)

        # Convert relative path to full EODHD URL
        if logo_path and logo_path.startswith("/"):
            logo_url = f"https://eodhd.com{logo_path}"
        else:
            logo_url = logo_path

        logger.info(f"[LOGO] Fetched logo for {ticker}")
        return {"ticker": ticker, "logo_url": logo_url}

    except Exception as e:
        logger.error(f"[LOGO] Failed to fetch logo for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch logo: {str(e)}")


@router.get("/analyst-ratings")
async def get_analyst_ratings(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get analyst ratings and price targets.

    Returns:
    - Buy/Hold/Sell ratings count
    - Price targets (low, average, high)
    - Recent upgrades/downgrades

    Example: /special/analyst-ratings?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        ratings = client.special.get_analyst_ratings(ticker)

        logger.info(f"[ANALYST] Fetched ratings for {ticker}")
        return ratings

    except Exception as e:
        # Analyst ratings may not be available for all stocks or from certain IPs
        # Return empty result instead of error to allow page to load gracefully
        logger.warning(f"[ANALYST] Analyst ratings not available for {ticker}: {e}")
        return {"ticker": ticker, "AnalystRatings": None, "note": "Analyst ratings not available for this stock or current API subscription"}


@router.get("/esg")
async def get_esg_scores(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get ESG (Environmental, Social, Governance) scores.

    Returns ESG ratings and scores for the company.

    Example: /special/esg?ticker=AAPL.US
    """
    try:
        client = EODHDClient()
        esg = client.special.get_esg_scores(ticker)

        logger.info(f"[ESG] Fetched ESG scores for {ticker}")
        return esg

    except Exception as e:
        logger.error(f"[ESG] Failed to fetch ESG scores for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch ESG scores: {str(e)}")


@router.get("/shareholders")
async def get_shareholders(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    holder_type: str = Query("institutions", description="Type: 'institutions' or 'funds'")
):
    """Get major shareholders (institutional or fund holders).

    Args:
        ticker: Stock symbol
        holder_type: 'institutions' or 'funds'

    Returns list of major shareholders with holdings data.

    Example: /special/shareholders?ticker=AAPL.US&holder_type=institutions
    """
    try:
        client = EODHDClient()

        if holder_type not in ["institutions", "funds"]:
            raise HTTPException(status_code=400, detail="holder_type must be 'institutions' or 'funds'")

        shareholders = client.special.get_shareholders(ticker, holder_type)

        logger.info(f"[SHAREHOLDERS] Fetched {holder_type} for {ticker}")
        return shareholders

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[SHAREHOLDERS] Failed to fetch {holder_type} for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch shareholders: {str(e)}")


@router.get("/market-cap-history")
async def get_market_cap_history(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    from_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get historical market capitalization data.

    Returns market cap over time for valuation trend analysis.

    Example: /special/market-cap-history?ticker=AAPL.US&from_date=2020-01-01
    """
    try:
        client = EODHDClient()
        market_cap = client.special.get_market_cap_history(
            ticker,
            from_date=from_date,
            to_date=to_date
        )

        logger.info(f"[MARKET_CAP] Fetched market cap history for {ticker}")
        return market_cap

    except Exception as e:
        # Market cap history endpoint not available in all EODHD subscriptions
        # Return empty result instead of error to allow page to load
        logger.warning(f"[MARKET_CAP] Market cap endpoint not available for {ticker}: {e}")
        return {"ticker": ticker, "data": [], "note": "Market cap history not available in current API subscription"}


@router.get("/etf-holdings")
async def get_etf_holdings(symbol: str = Query(..., description="ETF symbol (e.g., SPY, SPY.US)")):
    """Get ETF holdings breakdown.

    Returns list of holdings with weights for an ETF.

    Example: /special/etf-holdings?symbol=SPY.US
    """
    try:
        # Ensure symbol has exchange suffix
        if '.' not in symbol:
            symbol = f"{symbol}.US"

        client = EODHDClient()
        raw_data = client.special.get_etf_holdings(symbol)

        # Extract and format holdings data
        etf_data = raw_data.get("ETF_Data", {})
        general_data = raw_data.get("General", {})

        # Holdings is a dict with ticker as key, convert to list
        holdings_dict = etf_data.get("Holdings", {})
        holdings_list = []

        if isinstance(holdings_dict, dict):
            for ticker, info in holdings_dict.items():
                holdings_list.append({
                    "code": info.get("Code", ticker),
                    "exchange": info.get("Exchange", ""),
                    "name": info.get("Name", ""),
                    "sector": info.get("Sector", ""),
                    "industry": info.get("Industry", ""),
                    "country": info.get("Country", ""),
                    "region": info.get("Region", ""),
                    "assets_pct": info.get("Assets_%", 0),
                    "weight": info.get("Assets_%", 0)  # Alias for compatibility
                })
        elif isinstance(holdings_dict, list):
            # Handle if API returns list format
            holdings_list = holdings_dict

        # Extract and format sector weights
        sector_weights_raw = etf_data.get("Sector_Weights", {})
        sector_weights = {}
        for sector, data in sector_weights_raw.items():
            if isinstance(data, dict):
                # Extract Equity_% field
                sector_weights[sector] = data.get("Equity_%", 0)
            else:
                sector_weights[sector] = data

        # Extract and format top 10 holdings
        top_10_dict = etf_data.get("Top_10_Holdings", {})
        top_10_list = []
        for ticker, info in top_10_dict.items():
            top_10_list.append({
                "code": info.get("Code", ticker),
                "exchange": info.get("Exchange", ""),
                "name": info.get("Name", ""),
                "sector": info.get("Sector", ""),
                "industry": info.get("Industry", ""),
                "country": info.get("Country", ""),
                "region": info.get("Region", ""),
                "assets_pct": info.get("Assets_%", 0),
                "weight": info.get("Assets_%", 0)
            })

        # Format response
        response = {
            "symbol": symbol,
            "etf_info": {
                "name": general_data.get("Name", ""),
                "isin": general_data.get("ISIN", ""),
                "total_assets": etf_data.get("Net_Assets", None),
                "expense_ratio": etf_data.get("Expense_Ratio", None),
                "category": etf_data.get("Category", None),
                "inception_date": general_data.get("IPODate", None),
                "holdings_count": len(holdings_list)
            },
            "holdings": holdings_list,
            "sector_weights": sector_weights,
            "top_10_holdings": top_10_list
        }

        logger.info(f"[ETF] Fetched {len(holdings_list)} holdings for {symbol}")
        return response

    except Exception as e:
        logger.error(f"[ETF] Failed to fetch holdings for {symbol}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch ETF holdings: {str(e)}")


@router.get("/index-constituents")
async def get_index_constituents(
    index: str = Query(..., description="Index symbol (e.g., GSPC, GSPC.INDX for S&P 500)")
):
    """Get index constituents (member companies).

    Common indices:
    - GSPC or GSPC.INDX: S&P 500
    - DJI or DJI.INDX: Dow Jones
    - IXIC or IXIC.INDX: Nasdaq Composite

    Example: /special/index-constituents?index=GSPC
    """
    try:
        # Ensure index has .INDX suffix
        if not index.endswith('.INDX'):
            index = f"{index}.INDX"

        client = EODHDClient()
        raw_data = client.special.get_index_constituents(index)

        # Extract constituents list
        constituents_data = raw_data.get("Components", {})

        # Convert dict to list format for easier frontend consumption
        constituents_list = []
        for ticker, info in constituents_data.items():
            # Weight comes as decimal (0.0784), multiply by 100 to get percentage (7.84)
            weight = info.get("Weight", None)
            if weight is not None:
                weight = float(weight) * 100

            constituents_list.append({
                "code": ticker,
                "name": info.get("Name", ""),
                "sector": info.get("Sector", ""),
                "industry": info.get("Industry", ""),
                "country": info.get("Country", ""),
                "weight": weight
            })

        response = {
            "index": index,
            "constituents": constituents_list,
            "count": len(constituents_list)
        }

        logger.info(f"[INDEX] Fetched {len(constituents_list)} constituents for {index}")
        return response

    except Exception as e:
        logger.error(f"[INDEX] Failed to fetch constituents for {index}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch index constituents: {str(e)}")


@router.get("/company-highlights")
async def get_company_highlights(ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)")):
    """Get company key metrics and highlights.

    Returns:
    - Market Capitalization
    - P/E Ratio
    - EPS (Earnings Per Share)
    - Dividend Yield

    Example: /special/company-highlights?ticker=AAPL.US
    """
    try:
        client = EODHDClient()

        # Fetch specific fundamental metrics using filter (including General info)
        fundamentals = client.fundamental.get_fundamentals(
            ticker,
            filter_param="General::Name,General::Exchange,General::Sector,Highlights::MarketCapitalization,Highlights::PERatio,Highlights::DividendYield,Highlights::EarningsShare"
        )

        # Extract values and handle NA
        highlights = {
            "ticker": ticker,
            "name": fundamentals.get("General::Name", ticker),
            "exchange": fundamentals.get("General::Exchange", "N/A"),
            "sector": fundamentals.get("General::Sector", "N/A"),
            "marketCap": fundamentals.get("Highlights::MarketCapitalization"),
            "peRatio": fundamentals.get("Highlights::PERatio"),
            "divYield": fundamentals.get("Highlights::DividendYield"),
            "eps": fundamentals.get("Highlights::EarningsShare")
        }

        logger.info(f"[HIGHLIGHTS] Fetched highlights for {ticker}")
        return highlights

    except Exception as e:
        logger.error(f"[HIGHLIGHTS] Failed to fetch highlights for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch company highlights: {str(e)}")


@router.get("/index-historical-constituents")
async def get_index_historical_constituents(
    index: str = Query(..., description="Index symbol (e.g., GSPC.INDX)"),
    date: str = Query(..., description="Historical date (YYYY-MM-DD)")
):
    """Get historical index constituents for a specific date.

    Useful for tracking which companies were in the index at a past date.

    Example: /special/index-historical-constituents?index=GSPC.INDX&date=2020-01-01
    """
    try:
        client = EODHDClient()
        constituents = client.special.get_index_historical_constituents(index, date)

        logger.info(f"[INDEX_HIST] Fetched historical constituents for {index} on {date}")
        return constituents

    except Exception as e:
        logger.error(f"[INDEX_HIST] Failed to fetch historical constituents for {index}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch historical constituents: {str(e)}")


@router.get("/financials")
async def get_financial_statements(
    ticker: str = Query(..., description="Stock symbol (e.g., AAPL.US)"),
    statement: str = Query("balance_sheet", description="Statement type: balance_sheet, income_statement, cash_flow"),
    period: str = Query("yearly", description="Period: yearly or quarterly")
):
    """Get financial statements (Balance Sheet, Income Statement, Cash Flow).

    Statement Types:
    - balance_sheet: Assets, Liabilities, Equity
    - income_statement: Revenue, Expenses, Net Income
    - cash_flow: Operating, Investing, Financing activities

    Periods:
    - yearly: Annual statements
    - quarterly: Quarterly statements

    Returns up to 10 years of historical data.

    Example: /special/financials?ticker=AAPL.US&statement=balance_sheet&period=yearly
    """
    try:
        client = EODHDClient()

        # Map statement types to EODHD filter format
        statement_filters = {
            "balance_sheet": f"Financials::Balance_Sheet::{period}",
            "income_statement": f"Financials::Income_Statement::{period}",
            "cash_flow": f"Financials::Cash_Flow::{period}"
        }

        if statement not in statement_filters:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid statement type. Must be one of: {', '.join(statement_filters.keys())}"
            )

        if period not in ["yearly", "quarterly"]:
            raise HTTPException(
                status_code=400,
                detail="Invalid period. Must be 'yearly' or 'quarterly'"
            )

        # Fetch fundamentals with filter
        filter_param = statement_filters[statement]
        fundamentals = client.fundamental.get_fundamentals(ticker, filter_param=filter_param)

        # When using a filter, EODHD returns the data directly with years as keys
        # Check if we got year-based data (dates as keys like "2024-09-30")
        if fundamentals and isinstance(fundamentals, dict):
            # Check if this looks like filtered data (has date-like keys)
            first_key = next(iter(fundamentals.keys()), None) if fundamentals else None
            if first_key and (first_key.count('-') == 2 or first_key.isdigit()):
                # This is already the filtered data we want
                data = fundamentals
                logger.info(f"[FINANCIALS] Fetched {statement} ({period}) for {ticker} - {len(data)} periods")
                return {
                    "ticker": ticker,
                    "statement": statement,
                    "period": period,
                    "data": data
                }
            # Otherwise, try the nested structure (old API response format)
            elif "Financials" in fundamentals:
                financials = fundamentals["Financials"]

                # Navigate to the specific statement
                if statement == "balance_sheet" and "Balance_Sheet" in financials:
                    data = financials["Balance_Sheet"].get(period, {})
                elif statement == "income_statement" and "Income_Statement" in financials:
                    data = financials["Income_Statement"].get(period, {})
                elif statement == "cash_flow" and "Cash_Flow" in financials:
                    data = financials["Cash_Flow"].get(period, {})
                else:
                    data = {}

                logger.info(f"[FINANCIALS] Fetched {statement} ({period}) for {ticker}")
                return {
                    "ticker": ticker,
                    "statement": statement,
                    "period": period,
                    "data": data
                }

        # No data available
        logger.warning(f"[FINANCIALS] No financial data available for {ticker}")
        return {
            "ticker": ticker,
            "statement": statement,
            "period": period,
            "data": {}
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[FINANCIALS] Failed to fetch {statement} for {ticker}: {e}")
        raise HTTPException(status_code=502, detail=f"Failed to fetch financial statements: {str(e)}")
