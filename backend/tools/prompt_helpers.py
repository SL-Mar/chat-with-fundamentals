# tools/prompt_helpers.py

def build_financial_research_prompt(query: str) -> str:
    return f"""
Write a financial research report based on the following query:

**"{query}"**

Structure the report as follows:

1. **Executive Summary** – Key findings in under 200 words.
2. **Macroeconomic & Sector Trends** – Relevant economic data or industry dynamics.
3. **Valuation & Market Signals** – Use P/E, P/B, momentum, volatility, or market sentiment if applicable.
4. **Risks & Uncertainties** – Regulatory, geopolitical, competitive, or valuation risks.
5. **Conclusion / Investment Takeaways** – Provide a clear investment thesis or forecast.

Use Markdown formatting with clear **bolded headers** and **bullet points** where appropriate.

Avoid citations or bibliographic lists. Do not refer to yourself. Focus on providing useful, concise insights for financial analysts or investors.
"""

def build_strategy_research_prompt(query: str) -> str:
    return f"""
Write a strategy research report based on the following query:

**"{query}"**

Structure the report with these sections:

1. **Strategy Overview** – Describe the trading strategy, style, or signal logic.
2. **Data & Indicators** – Detail technical or quantitative indicators used (e.g., SMA, RSI, z-score).
3. **Backtest Insights** – Discuss performance metrics (Sharpe, drawdown, CAGR) if available or expected.
4. **Market Suitability** – Which markets or regimes does this strategy work best in?
5. **Risks & Limitations** – Highlight overfitting, false signals, or slippage concerns.
6. **Conclusion** – Recommend whether and how to implement it in practice.

Use Markdown, bolded headers, and avoid footnotes or excessive references. Prioritize clarity and signal design insights.
"""
