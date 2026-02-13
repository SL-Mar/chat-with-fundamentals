"""Retry logic for code agent — retries with error context."""

import logging

logger = logging.getLogger(__name__)

MAX_RETRIES = 4


def build_retry_message(original_message: str, code: str, error: str, attempt: int) -> str:
    """Build a retry prompt that includes the error context."""
    hint = ""
    if "SyntaxError" in error:
        hint = " IMPORTANT: Check all parentheses are balanced. Count opening and closing parens on each line."
    elif "KeyError" in error:
        hint = " IMPORTANT: Only use columns that exist in your SELECT query. Check the column name spelling."

    return (
        f"The previous code failed with this error:\n\n"
        f"```\n{error[:2000]}\n```\n\n"
        f"Previous code:\n```python\n{code}\n```\n\n"
        f"Original request: {original_message}\n\n"
        f"This is attempt {attempt}/{MAX_RETRIES}. Fix the code and try again.{hint} "
        f"Respond with the same JSON format: {{\"explanation\": \"...\", \"code\": \"...\"}}"
    )
