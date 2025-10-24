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
