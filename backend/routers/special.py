# File: routers/special.py
# Special data endpoints: logos, analyst ratings, ESG, shareholders, market cap history

from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from datetime import datetime, timedelta
import logging
import json
import re
import statistics
import numpy as np
import urllib.request
import urllib.parse
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


@router.get("/{ticker}/peers")
async def get_peers(
    ticker: str,
    limit: int = Query(default=10, ge=1, le=50)
):
    """Get peer companies in the same sector, ranked by market cap.
    
    Returns:
    - List of peer companies with ticker, name, sector, market_cap, exchange
    
    Example: /special/AAPL.US/peers?limit=10
    """
    try:
        client = EODHDClient()

        # First get the sector using urllib
        api_key = client.fundamental.api_key  # Get from sub-client that has EODHDBaseClient
        params = urllib.parse.urlencode({
            "fmt": "json",
            "api_token": api_key
        })
        url = f"https://eodhd.com/api/fundamentals/{ticker}?{params}"

        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read())

        sector = data.get("General", {}).get("Sector", "")
        
        if not sector or sector == "Unknown":
            raise HTTPException(status_code=404, detail="Sector not found for this ticker")
        
        # Get stocks in the same sector using screener
        filters = json.dumps([
            ["sector", "=", sector],
            ["market_capitalization", ">", "100000000"],  # Min $100M market cap
            ["exchange", "=", "us"]  # Only US exchanges
        ])

        params = urllib.parse.urlencode({
            "filters": filters,
            "sort": "market_capitalization.desc",
            "limit": str(limit * 3),
            "api_token": api_key,
            "fmt": "json"
        })

        url = f"https://eodhd.com/api/screener?{params}"
        with urllib.request.urlopen(url) as response:
            data = json.loads(response.read())
        
        if not data or "data" not in data:
            return []
        
        # Extract base ticker (without exchange suffix)
        ticker_base = ticker.split('.')[0].upper()
        
        # Track seen companies to avoid duplicates
        seen_companies = {}
        peers = []
        
        for stock in data["data"]:
            code = stock.get("code", "")
            name = stock.get("name", "")
            exchange = stock.get("exchange", "")
            market_cap = stock.get("market_capitalization", 0)
            
            if not code or not name:
                continue
            
            # Skip the ticker itself
            code_base = code.split('.')[0].upper()
            if code_base == ticker_base:
                continue
            
            # Skip non-US exchanges
            if exchange.upper() != "US":
                continue
            
            # Normalize company name for deduplication
            normalized_name = name.upper()
            
            # Remove suffixes
            suffixes_pattern = r'\s+(INC\.?|CORP\.?|CORPORATION|LTD\.?|LIMITED|CO\.?|ADR|PLC|COMPANY|NV|SA|SE|LLC|LP|LLP)$'
            prev_name = None
            while prev_name != normalized_name:
                prev_name = normalized_name
                normalized_name = re.sub(suffixes_pattern, '', normalized_name)
            
            # Remove class designations
            normalized_name = re.sub(r'\s+(CLASS [A-Z]|COMMON STOCK)\s*', ' ', normalized_name)
            normalized_name = normalized_name.strip()
            
            # Take first 2 words to catch variations
            words = normalized_name.split()
            if len(words) > 2:
                normalized_name = " ".join(words[:2])
            
            # If we've seen this company, keep the one with higher market cap
            if normalized_name in seen_companies:
                existing_ticker, existing_cap = seen_companies[normalized_name]
                if market_cap > existing_cap:
                    seen_companies[normalized_name] = (code, market_cap)
                    # Update in list
                    for i, peer in enumerate(peers):
                        if peer["ticker"] == existing_ticker:
                            peers[i] = {
                                "ticker": code,
                                "name": name,
                                "sector": stock.get("sector", ""),
                                "market_cap": market_cap,
                                "exchange": exchange
                            }
                            break
            else:
                seen_companies[normalized_name] = (code, market_cap)
                peers.append({
                    "ticker": code,
                    "name": name,
                    "sector": stock.get("sector", ""),
                    "market_cap": market_cap,
                    "exchange": exchange
                })
            
            if len(peers) >= limit:
                break
        
        logger.info(f"[PEERS] Fetched {len(peers)} peers for {ticker}")
        return peers
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PEERS] Failed to fetch peers for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch peers: {str(e)}")


class PeerComparisonRequest(BaseModel):
    peer_tickers: List[str]
    period: str = "1y"
    use_adjusted: bool = True


@router.post("/{ticker}/peer-comparison")
async def get_peer_comparison(
    ticker: str,
    req: PeerComparisonRequest
):
    """Get peer comparison data with price history and calculated metrics.
    
    Returns:
    - price_data: Dictionary of ticker -> list of {date, close, normalized_close}
    - metrics: Dictionary of ticker -> {return_1y, beta, correlation, volatility}
    - sector_avg: Average metrics across all peers
    
    Example: /special/AAPL.US/peer-comparison
    """
    try:
        client = EODHDClient()
        api_key = client.fundamental.api_key  # Get from sub-client that has EODHDBaseClient

        # Calculate date range
        end_date = datetime.now()
        period_map = {
            "1m": 30,
            "3m": 90,
            "6m": 180,
            "1y": 365,
            "3y": 1095,
            "5y": 1825
        }
        days = period_map.get(req.period, 365)
        start_date = end_date - timedelta(days=days)

        # Fetch price data for all tickers
        all_tickers = [ticker] + req.peer_tickers
        price_data = {}

        for t in all_tickers:
            try:
                params = urllib.parse.urlencode({
                    "from": start_date.strftime("%Y-%m-%d"),
                    "to": end_date.strftime("%Y-%m-%d"),
                    "period": "d",
                    "fmt": "json",
                    "api_token": api_key
                })

                url = f"https://eodhd.com/api/eod/{t}?{params}"
                with urllib.request.urlopen(url) as response:
                    eod_data = json.loads(response.read())
                
                if eod_data:
                    # Use adjusted_close or close
                    price_field = 'adjusted_close' if req.use_adjusted else 'close'
                    closes = [float(d[price_field]) for d in eod_data]
                    dates = [d["date"] for d in eod_data]
                    
                    if closes:
                        start_price = closes[0]
                        normalized = [(c / start_price) * 100 for c in closes]
                        
                        price_data[t] = [
                            {
                                "date": dates[i],
                                "close": closes[i],
                                "normalized_close": normalized[i]
                            }
                            for i in range(len(dates))
                        ]
            except Exception as e:
                logger.warning(f"[PEER_COMPARISON] Failed to fetch price data for {t}: {e}")
                continue
        
        # Calculate metrics
        metrics = {}
        returns_list = []
        
        for t, data in price_data.items():
            if len(data) < 2:
                continue
            
            closes = [d["close"] for d in data]
            
            # Calculate returns
            returns = [(closes[i] - closes[i-1]) / closes[i-1] for i in range(1, len(closes))]
            total_return = (closes[-1] - closes[0]) / closes[0]
            
            # Calculate volatility
            if len(returns) > 1:
                volatility = statistics.stdev(returns) * (252 ** 0.5)
            else:
                volatility = 0
            
            metrics[t] = {
                "return_1y": round(total_return * 100, 2),
                "volatility": round(volatility * 100, 2),
                "returns": returns
            }
            
            if t != ticker:
                returns_list.append(total_return)
        
        # Calculate beta and correlation
        if ticker in metrics and metrics[ticker].get("returns"):
            main_returns = metrics[ticker]["returns"]
            
            for t in req.peer_tickers:
                if t in metrics and metrics[t].get("returns"):
                    peer_returns = metrics[t]["returns"]
                    
                    min_len = min(len(main_returns), len(peer_returns))
                    main_r = main_returns[:min_len]
                    peer_r = peer_returns[:min_len]
                    
                    if min_len > 1:
                        try:
                            correlation = np.corrcoef(main_r, peer_r)[0, 1]
                            metrics[t]["correlation"] = round(float(correlation), 3)
                        except (ValueError, IndexError, FloatingPointError) as e:
                            logger.warning(f"Correlation calculation failed for {t}: {e}")
                            metrics[t]["correlation"] = 0.0

                        try:
                            covariance = np.cov(peer_r, main_r)[0, 1]
                            variance = np.var(main_r)
                            if variance > 0:
                                beta = covariance / variance
                                metrics[t]["beta"] = round(float(beta), 3)
                            else:
                                metrics[t]["beta"] = 1.0
                        except (ValueError, IndexError, FloatingPointError) as e:
                            logger.warning(f"Beta calculation failed for {t}: {e}")
                            metrics[t]["beta"] = 1.0
        
        # Calculate sector averages
        sector_avg = {}
        if returns_list:
            sector_avg["return_1y"] = round(statistics.mean(returns_list) * 100, 2)
        
        # Remove temporary returns
        for t in metrics:
            if "returns" in metrics[t]:
                del metrics[t]["returns"]
        
        logger.info(f"[PEER_COMPARISON] Compared {ticker} with {len(req.peer_tickers)} peers")
        return {
            "price_data": price_data,
            "metrics": metrics,
            "sector_avg": sector_avg
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PEER_COMPARISON] Failed for {ticker}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get peer comparison: {str(e)}")
