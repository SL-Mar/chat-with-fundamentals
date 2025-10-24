# tools/panel_tools.py
# LLM function calling tools for dynamic panel rendering

PANEL_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "show_dividend_history",
            "description": "Display dividend payment history for a stock with payment dates, amounts, and yield trends",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol (e.g., AAPL, MSFT, JPM)"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_price_chart",
            "description": "Display intraday or historical price chart with candlesticks",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "interval": {
                        "type": "string",
                        "enum": ["1m", "5m", "15m", "1h"],
                        "description": "Chart interval"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_analyst_ratings",
            "description": "Display analyst ratings, recommendations, and price targets",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_insider_transactions",
            "description": "Display insider buying and selling activity",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of transactions to show",
                        "default": 20
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_etf_holdings",
            "description": "Display ETF holdings breakdown showing top components with their weights and allocations",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "ETF ticker symbol (e.g., SPY, QQQ, IWM)"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_news",
            "description": "Display recent news articles and headlines for a stock",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of articles to show",
                        "default": 10
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_live_price",
            "description": "Display real-time price and quote data for a stock",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_earnings_calendar",
            "description": "Display upcoming earnings announcements",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {
                        "type": "string",
                        "description": "Start date (YYYY-MM-DD)"
                    },
                    "to_date": {
                        "type": "string",
                        "description": "End date (YYYY-MM-DD)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_esg",
            "description": "Display ESG (Environmental, Social, Governance) scores and ratings",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_shareholders",
            "description": "Display major shareholders and institutional ownership",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_sentiment",
            "description": "Display news sentiment analysis and market mood",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_stock_splits",
            "description": "Display historical stock split events with dates, ratios, and impact on shares",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_technical_screener",
            "description": "Display technical screening results with signals and indicators",
            "parameters": {
                "type": "object",
                "properties": {
                    "signal": {
                        "type": "string",
                        "description": "Signal type (buy, sell, neutral)",
                        "enum": ["buy", "sell", "neutral"]
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of results to show",
                        "default": 50
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_returns_distribution",
            "description": "Display statistical distribution of returns with histogram and metrics",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "period": {
                        "type": "string",
                        "description": "Analysis period (1y, 3y, 5y)",
                        "enum": ["1y", "3y", "5y"]
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_cumulative_returns",
            "description": "Display cumulative returns chart over time",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "period": {
                        "type": "string",
                        "description": "Time period (1y, 3y, 5y)",
                        "enum": ["1y", "3y", "5y"]
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_market_cap_history",
            "description": "Display historical market capitalization chart",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_twitter_mentions",
            "description": "Display Twitter/social media mentions and sentiment",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Number of mentions to show",
                        "default": 20
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_ipo_calendar",
            "description": "Display upcoming IPO events and offerings",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {
                        "type": "string",
                        "description": "Start date (YYYY-MM-DD)"
                    },
                    "to_date": {
                        "type": "string",
                        "description": "End date (YYYY-MM-DD)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_monte_carlo",
            "description": "Display Monte Carlo simulation for price projections",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "days": {
                        "type": "integer",
                        "description": "Number of days to simulate",
                        "default": 30
                    },
                    "simulations": {
                        "type": "integer",
                        "description": "Number of simulations to run",
                        "default": 1000
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_volatility_forecast",
            "description": "Display volatility forecast and historical volatility",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "lookback": {
                        "type": "integer",
                        "description": "Lookback period in days",
                        "default": 250
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_performance_ratios",
            "description": "Display performance ratios (Sharpe, Sortino, Calmar, etc.)",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "years": {
                        "type": "integer",
                        "description": "Number of years for analysis",
                        "default": 3
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_economic_events",
            "description": "Display upcoming economic events calendar",
            "parameters": {
                "type": "object",
                "properties": {
                    "from_date": {
                        "type": "string",
                        "description": "Start date (YYYY-MM-DD)"
                    },
                    "to_date": {
                        "type": "string",
                        "description": "End date (YYYY-MM-DD)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_index_constituents",
            "description": "Display constituents (holdings) of a stock index",
            "parameters": {
                "type": "object",
                "properties": {
                    "index": {
                        "type": "string",
                        "description": "Index symbol (e.g., GSPC, DJI, IXIC)"
                    }
                },
                "required": ["index"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_logo",
            "description": "Display company logo",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_historical_constituents",
            "description": "Display historical index constituents",
            "parameters": {
                "type": "object",
                "properties": {
                    "index": {
                        "type": "string",
                        "description": "Index symbol"
                    },
                    "date": {
                        "type": "string",
                        "description": "Historical date (YYYY-MM-DD)"
                    }
                },
                "required": ["index"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_eod_extended",
            "description": "Display extended EOD data with additional metrics",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_technical_indicators",
            "description": "Display multiple technical indicators",
            "parameters": {
                "type": "object",
                "properties": {
                    "ticker": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "indicators": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of indicators (RSI, MACD, SMA, etc.)"
                    }
                },
                "required": ["ticker"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "show_macro_indicators",
            "description": "Display macro economic indicators (bond yields, rates, inflation)",
            "parameters": {
                "type": "object",
                "properties": {
                    "indicators": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of macro indicators"
                    }
                },
                "required": []
            }
        }
    }
]


def extract_panel_commands(tool_calls):
    """
    Extract panel rendering commands from LLM tool calls

    Returns: List of panel commands with type and props
    """
    if not tool_calls:
        return []

    panels = []
    for tool_call in tool_calls:
        import json
        function_name = tool_call.function.name
        arguments = json.loads(tool_call.function.arguments)

        panels.append({
            "type": function_name,
            "props": arguments
        })

    return panels
