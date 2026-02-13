"""Code agent pipeline — intent → code → sandbox → result."""

import json
import logging
import re
from typing import Optional

from agents.llm.router import llm_router
from agents.llm.types import ChatResult
from agents.prompts.intent_classifier import INTENT_CLASSIFIER_PROMPT
from agents.prompts.ml_training import ML_TRAINING_PROMPT
from agents.prompts.factor_library import FACTOR_LIBRARY_PROMPT
from agents.prompts.fundamentals_query import FUNDAMENTALS_QUERY_PROMPT
from agents.validation import validate_code
from agents.retry import build_retry_message, MAX_RETRIES
from sandbox.executor import execute_code
from sandbox.models import ExecutionResult

logger = logging.getLogger(__name__)

AGENT_PROMPTS = {
    "ml_training": ML_TRAINING_PROMPT,
    "factor_library": FACTOR_LIBRARY_PROMPT,
    "fundamentals_query": FUNDAMENTALS_QUERY_PROMPT,
}


async def classify_intent(message: str) -> str:
    """Classify user message into an agent type."""
    result = await llm_router.chat(
        system_prompt=INTENT_CLASSIFIER_PROMPT,
        user_message=message,
        temperature=0.0,
        max_tokens=50,
    )
    intent = result.content.strip().lower().replace('"', "").replace("'", "")

    # Fuzzy match
    for key in AGENT_PROMPTS:
        if key in intent:
            return key

    return "fundamentals_query"  # Default


def _fix_string_literals(code: str) -> str:
    """Fix broken string literals caused by JSON parsing converting \\n to newlines.

    When JSON parses {"code": "print('\\nHello')"}, the \\n becomes a real newline,
    producing print('\\nHello') which is a SyntaxError. We detect this and fix it.
    """
    try:
        compile(code, "<string>", "exec")
        return code  # Code compiles fine
    except SyntaxError:
        pass

    # Strategy: scan each line. If a line has an unclosed string literal
    # (odd number of unescaped quotes), merge it with the next line using \\n.
    lines = code.split("\n")
    fixed = []
    buffer = ""
    in_merge = False

    for line in lines:
        if in_merge:
            buffer += "\\n" + line
            # Check if the string is now closed
            try:
                compile(buffer + "\n", "<string>", "exec")
                fixed.append(buffer)
                buffer = ""
                in_merge = False
            except SyntaxError:
                continue
        else:
            try:
                compile(line + "\n", "<string>", "exec")
                fixed.append(line)
            except SyntaxError:
                buffer = line
                in_merge = True

    if buffer:
        fixed.append(buffer)

    result = "\n".join(fixed)
    try:
        compile(result, "<string>", "exec")
        return result
    except SyntaxError:
        return code  # Return original if fix didn't help


def _fix_unmatched_parens(code: str) -> str:
    """Fix lines with unmatched parentheses by balancing them."""
    try:
        compile(code, "<string>", "exec")
        return code
    except SyntaxError:
        pass

    lines = code.split("\n")
    fixed = []
    for line in lines:
        # Count parens outside of strings
        opens = 0
        in_str = None
        for i, c in enumerate(line):
            if in_str:
                if c == in_str and (i == 0 or line[i - 1] != "\\"):
                    in_str = None
                continue
            if c in ('"', "'"):
                in_str = c
                continue
            if c == "(":
                opens += 1
            elif c == ")":
                opens -= 1

        if opens < 0:
            # More closing than opening — add opening parens after '= '
            eq_pos = line.find("= ")
            if eq_pos != -1:
                insert_pos = eq_pos + 2
                line = line[:insert_pos] + "(" * abs(opens) + line[insert_pos:]
            else:
                line = "(" * abs(opens) + line
        elif opens > 0:
            # More opening than closing — add closing parens at end
            line = line + ")" * opens

        fixed.append(line)

    result = "\n".join(fixed)
    try:
        compile(result, "<string>", "exec")
        return result
    except SyntaxError:
        return code  # Return original if fix didn't help


def _extract_json(text: str) -> Optional[dict]:
    """Extract JSON from LLM response, handling markdown code blocks."""
    # Strip markdown code fences wrapping the entire response
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.split("\n")
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        stripped = "\n".join(lines).strip()

    # Try direct parse
    for candidate in [stripped, text]:
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            pass

    # Fix LLM triple-quote escaping: LLMs write \"\"\\" instead of \"\"\"
    # for Python triple-quoted strings inside JSON code values.
    fixed = stripped.replace('\\"\\"\\\\"', '\\"\\"\\"')
    if fixed != stripped:
        try:
            return json.loads(fixed)
        except json.JSONDecodeError:
            pass

    return None


OUTPUT_FORMAT_PROMPT = """You format raw code execution output into clean, readable markdown.

Rules:
- Convert tabular data into a markdown table with aligned columns
- Use short, readable column headers (e.g. "ROA+" instead of "signal_roa_positive")
- Add a brief 1-2 sentence summary above the table highlighting key findings
- If there are boolean columns (True/False or 1/0), keep them as checkmarks or X marks
- Keep it concise — no filler text
- Return ONLY the formatted markdown, nothing else"""


async def _format_output(
    user_question: str,
    raw_stdout: str,
    explanation: str,
    on_log: callable = None,
) -> Optional[str]:
    """Ask the LLM to format raw stdout into clean markdown."""
    try:
        if on_log:
            await on_log("Formatting output...")

        user_msg = (
            f"User question: {user_question}\n\n"
            f"Explanation: {explanation}\n\n"
            f"Raw output:\n```\n{raw_stdout[:4000]}\n```"
        )

        result = await llm_router.chat(
            system_prompt=OUTPUT_FORMAT_PROMPT,
            user_message=user_msg,
            temperature=0.0,
            max_tokens=4096,
        )

        if result.error:
            logger.warning(f"Output formatting failed: {result.error}")
            return None

        return result.content.strip()
    except Exception as e:
        logger.warning(f"Output formatting error: {e}")
        return None


async def run_agent_pipeline(
    message: str,
    db_connection_string: str,
    session_id: str = None,
    on_log: callable = None,
) -> dict:
    """Full pipeline: classify → generate code → validate → execute → return."""

    async def log(msg: str):
        logger.info(msg)
        if on_log:
            await on_log(msg)

    await log("Classifying intent...")
    intent = await classify_intent(message)
    await log(f"Intent: {intent}")

    system_prompt = AGENT_PROMPTS[intent]
    current_message = message

    for attempt in range(1, MAX_RETRIES + 1):
        await log(f"Generating code (attempt {attempt}/{MAX_RETRIES})...")

        # On last attempt, escalate to Anthropic
        provider = "anthropic" if attempt == MAX_RETRIES else None
        result = await llm_router.chat(
            system_prompt=system_prompt,
            user_message=current_message,
            temperature=0.1,
            max_tokens=16384,
            provider=provider,
        )

        if result.error:
            await log(f"LLM error: {result.error}")
            return {
                "error": f"LLM error: {result.error}",
                "intent": intent,
                "llm_provider": result.provider,
                "llm_model": result.model,
            }

        # Parse response
        parsed = _extract_json(result.content)
        if not parsed:
            await log("Failed to parse LLM response as JSON")
            if attempt < MAX_RETRIES:
                current_message = build_retry_message(
                    message, "", "Response was not valid JSON. Return {\"explanation\": \"...\", \"code\": \"...\"}",
                    attempt + 1,
                )
                continue
            return {
                "error": "Failed to parse LLM response",
                "raw_response": result.content[:2000],
                "intent": intent,
                "llm_provider": result.provider,
                "llm_model": result.model,
            }

        explanation = parsed.get("explanation", "")
        code = parsed.get("code", "")

        # Strip markdown code fences if present (e.g. ```python ... ```)
        if code.startswith("```"):
            lines = code.split("\n")
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].strip() == "```":
                lines = lines[:-1]
            code = "\n".join(lines)

        # Fix double-escaped newlines from LLM output
        if "\\n" in code and "\n" not in code:
            code = code.replace("\\n", "\n").replace("\\t", "\t")

        # Fix broken string literals: when JSON parsing converts \n inside
        # Python string literals to actual newlines, causing SyntaxError.
        # Compile-check the code and attempt auto-fix if it fails.
        code = _fix_string_literals(code)

        # Fix unmatched parentheses — a common LLM code generation error
        code = _fix_unmatched_parens(code)

        # Inject pandas display options so output is never truncated
        if "import pandas" in code and "display.max_columns" not in code:
            code = code.replace(
                "import pandas as pd",
                "import pandas as pd\npd.set_option('display.max_columns', None)\npd.set_option('display.width', None)",
                1,
            )

        if not code:
            await log("No code generated")
            return {"error": "No code generated", "explanation": explanation, "intent": intent}

        # Validate
        is_safe, safety_error = validate_code(code)
        if not is_safe:
            await log(f"Code validation failed: {safety_error}")
            if attempt < MAX_RETRIES:
                current_message = build_retry_message(
                    message, code, f"Safety validation failed: {safety_error}", attempt + 1,
                )
                continue
            return {"error": f"Code safety check failed: {safety_error}", "intent": intent}

        # Execute
        await log("Executing code in sandbox...")
        exec_result: ExecutionResult = await execute_code(code, db_connection_string)

        if exec_result.success:
            await log(f"Execution succeeded ({exec_result.execution_time_ms}ms)")

            # Format the raw output into a readable summary
            formatted = None
            if exec_result.stdout and len(exec_result.stdout.strip()) > 20:
                formatted = await _format_output(
                    message, exec_result.stdout, explanation, on_log=log,
                )

            return {
                "intent": intent,
                "explanation": explanation,
                "code": code,
                "stdout": exec_result.stdout,
                "stderr": exec_result.stderr,
                "artifacts": exec_result.artifacts,
                "execution_time_ms": exec_result.execution_time_ms,
                "llm_provider": result.provider,
                "llm_model": result.model,
                "formatted_output": formatted,
            }

        # Execution failed — retry
        await log(f"Execution failed (attempt {attempt}): {exec_result.error}")
        if attempt < MAX_RETRIES:
            current_message = build_retry_message(
                message, code, exec_result.error or exec_result.stderr, attempt + 1,
            )
        else:
            return {
                "error": f"Execution failed after {MAX_RETRIES} attempts",
                "last_error": exec_result.error,
                "code": code,
                "stdout": exec_result.stdout,
                "stderr": exec_result.stderr,
                "intent": intent,
                "execution_time_ms": exec_result.execution_time_ms,
                "llm_provider": result.provider,
                "llm_model": result.model,
            }
