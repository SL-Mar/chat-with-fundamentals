from dataclasses import dataclass, field
from typing import Optional


@dataclass
class TokenUsage:
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


@dataclass
class ChatResult:
    content: str = ""
    provider: str = ""
    model: str = ""
    usage: TokenUsage = field(default_factory=TokenUsage)
    error: Optional[str] = None
