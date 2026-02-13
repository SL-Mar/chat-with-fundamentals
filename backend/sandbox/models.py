from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ExecutionResult:
    success: bool = False
    stdout: str = ""
    stderr: str = ""
    artifacts: list[dict] = field(default_factory=list)  # [{name, base64, mime_type}]
    execution_time_ms: int = 0
    error: Optional[str] = None
