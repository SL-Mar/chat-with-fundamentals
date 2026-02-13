"""Factor computation service — pre-built factor calculations."""

import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Available factor definitions
FACTOR_CATALOG = [
    {
        "name": "momentum_1m",
        "display_name": "Momentum (1M)",
        "category": "Momentum",
        "description": "1-month price return",
    },
    {
        "name": "momentum_3m",
        "display_name": "Momentum (3M)",
        "category": "Momentum",
        "description": "3-month price return",
    },
    {
        "name": "momentum_6m",
        "display_name": "Momentum (6M)",
        "category": "Momentum",
        "description": "6-month price return",
    },
    {
        "name": "value_pe",
        "display_name": "Value (1/PE)",
        "category": "Value",
        "description": "Earnings yield (inverse P/E ratio)",
    },
    {
        "name": "value_pb",
        "display_name": "Value (1/PB)",
        "category": "Value",
        "description": "Book yield (inverse P/B ratio)",
    },
    {
        "name": "quality_roe",
        "display_name": "Quality (ROE)",
        "category": "Quality",
        "description": "Return on equity",
    },
    {
        "name": "quality_margin",
        "display_name": "Quality (Margin)",
        "category": "Quality",
        "description": "Gross profit margin",
    },
    {
        "name": "size",
        "display_name": "Size",
        "category": "Size",
        "description": "Log market capitalization (negative = small cap premium)",
    },
    {
        "name": "volatility",
        "display_name": "Low Volatility",
        "category": "Volatility",
        "description": "Negative 30-day return volatility",
    },
    {
        "name": "volume_relative",
        "display_name": "Relative Volume",
        "category": "Volume",
        "description": "Current volume vs 20-day average",
    },
]


def get_factor_catalog() -> list[dict]:
    return FACTOR_CATALOG
