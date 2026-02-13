"""Pre-execution code safety checks."""

import re

FORBIDDEN_PATTERNS = [
    r"\bos\.system\b",
    r"\bsubprocess\b",
    r"\bshutil\b",
    r"\b__import__\b",
    r"\beval\s*\(",
    r"\bexec\s*\(",
    r"\bopen\s*\([^)]*['\"]\/(?!workspace)",  # open() outside /workspace
    r"\brequests\b",
    r"\burllib\b",
    r"\bhttpx\b",
    r"\bsocket\b",
    r"\bparamiko\b",
    r"\bftplib\b",
    r"\bsmtplib\b",
]

ALLOWED_IMPORTS = {
    "pandas", "numpy", "sklearn", "scikit-learn", "xgboost", "lightgbm",
    "matplotlib", "seaborn", "statsmodels", "scipy", "psycopg2", "os",
    "json", "datetime", "math", "collections", "itertools", "functools",
    "typing", "io", "csv", "warnings",
}


def validate_code(code: str) -> tuple[bool, str]:
    """Validate code for safety before sandbox execution.

    Returns (is_safe, error_message).
    """
    for pattern in FORBIDDEN_PATTERNS:
        if re.search(pattern, code):
            return False, f"Forbidden pattern detected: {pattern}"

    # Check for network access attempts
    if "connect(" in code and "psycopg2" not in code:
        if "socket" in code or "http" in code.lower():
            return False, "Network access not allowed (except database)"

    return True, ""
