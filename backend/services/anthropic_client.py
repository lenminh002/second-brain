from __future__ import annotations

import os
from typing import Any

from anthropic import Anthropic

MODEL_NAME = os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6")


def _client() -> Anthropic | None:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    return Anthropic(api_key=api_key) if api_key else None


def _text_from_content(content: Any) -> str:
    return "".join(
        block.text for block in content if getattr(block, "type", None) == "text"
    ).strip()


def _message_content_to_params(content: Any) -> list[dict[str, Any]]:
    params: list[dict[str, Any]] = []
    for block in content:
        if hasattr(block, "model_dump"):
            params.append(block.model_dump(exclude_none=True))
        else:
            params.append(dict(block))
    return params
