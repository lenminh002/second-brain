from __future__ import annotations

import json
from collections.abc import Callable, Generator
from typing import Any

from services.anthropic_client import (
    MODEL_NAME,
    _client,
    _message_content_to_params,
    _text_from_content,
)

MAX_AGENT_TURNS = 3
MAX_PROMPT_HISTORY_MESSAGES = 20
MAX_PROMPT_HISTORY_TEXT_LENGTH = 4000

CHAT_TOOLS = [
    {
        "name": "search_knowledge_base",
        "description": "Search the user's saved knowledge base for relevant notes and graph-connected context.",
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "The search query to run against saved knowledge.",
                }
            },
            "required": ["query"],
            "additionalProperties": False,
        },
    },
    {
        "name": "get_source_detail",
        "description": "Fetch the full content and enrichment fields for one saved source by source_id.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_id": {
                    "type": "string",
                    "description": "The exact source_id returned by search_knowledge_base.",
                }
            },
            "required": ["source_id"],
            "additionalProperties": False,
        },
    },
    {
        "name": "explore_graph_connections",
        "description": "Explore concepts and source-to-source connections in the user's knowledge graph.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Source IDs to anchor graph exploration around.",
                },
                "concept_query": {
                    "type": "string",
                    "description": "Optional concept or topic to search for in graph labels.",
                },
            },
            "additionalProperties": False,
        },
    },
    {
        "name": "compare_sources",
        "description": "Compare multiple saved sources by summary, concepts, claims, and overlap.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_ids": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Two to five source IDs returned by search_knowledge_base.",
                }
            },
            "required": ["source_ids"],
            "additionalProperties": False,
        },
    },
    {
        "name": "list_tags",
        "description": "List all tags currently used in the knowledge base graph to find ones to reuse.",
        "input_schema": {
            "type": "object",
            "properties": {},
            "additionalProperties": False,
        },
    },
    {
        "name": "add_tag",
        "description": "Add a new tag to a specific source in the knowledge base.",
        "input_schema": {
            "type": "object",
            "properties": {
                "source_id": {
                    "type": "string",
                    "description": "The ID of the source to tag."
                },
                "tag": {
                    "type": "string",
                    "description": "The tag string to add. Use lowercase kebab-case."
                }
            },
            "required": ["source_id", "tag"],
            "additionalProperties": False,
        },
    },
    {
        "name": "create_post",
        "description": "Publish a thought, summary, or insight directly to the user's home timeline.",
        "input_schema": {
            "type": "object",
            "properties": {
                "body": {
                    "type": "string",
                    "description": "The textual body of the post to publish."
                }
            },
            "required": ["body"],
            "additionalProperties": False,
        },
    },
]

CHAT_SYSTEM_PROMPT = """
You are a personal knowledge assistant. For simple greetings or conversational messages
(e.g. "hello", "thanks", "how are you"), respond naturally without searching.
For questions about specific topics, notes, or information, use the search_knowledge_base
tool to find relevant saved content and cite sources inline like [1]. When the question
asks for relationships, themes, contradictions, or synthesis across notes, also use
explore_graph_connections or compare_sources before answering.
If the saved context is insufficient, say what is missing.
""".strip()


def _format_chat_history(history: list[dict[str, str]] | None) -> str:
    lines: list[str] = []
    for item in (history or [])[-MAX_PROMPT_HISTORY_MESSAGES:]:
        role = item.get("role")
        text = str(item.get("text") or "").strip()
        if role not in {"user", "assistant"} or not text:
            continue
        label = "User" if role == "user" else "Assistant"
        lines.append(f"{label}: {text[:MAX_PROMPT_HISTORY_TEXT_LENGTH]}")
    return "\n".join(lines)


def _message_with_history(message: str, history: list[dict[str, str]] | None) -> str:
    history_text = _format_chat_history(history)
    if not history_text:
        return message
    return f"""
Conversation history:
{history_text}

Current user message:
{message}
""".strip()


def _tool_result(tool_use: Any, execute_tool: Callable[[str, dict[str, Any]], dict[str, Any]]) -> dict[str, Any]:
    """Build a tool_result block, handling errors gracefully."""
    tool_input = getattr(tool_use, "input", {}) or {}
    try:
        result = execute_tool(str(getattr(tool_use, "name", "")), dict(tool_input))
        return {
            "type": "tool_result",
            "tool_use_id": tool_use.id,
            "content": json.dumps(result),
        }
    except Exception as exc:
        return {
            "type": "tool_result",
            "tool_use_id": tool_use.id,
            "is_error": True,
            "content": str(exc),
        }


def answer_with_context(
    message: str,
    chunks: list[dict[str, Any]],
    graph_context: list[dict[str, Any]] | None = None,
    history: list[dict[str, str]] | None = None,
) -> str:
    context = "\n\n".join(
        f"[{index + 1}] {chunk.get('source_title', 'Untitled')} / {chunk.get('section', 'Notes')}\n{chunk.get('text', '')}"
        for index, chunk in enumerate(chunks)
    )
    graph_lines = "\n".join(
        f"- {item.get('concept_label')}: connects {', '.join(item.get('source_titles', []))}"
        for item in (graph_context or [])
    )
    client = _client()
    if client is None:
        if not chunks:
            return "I do not have enough knowledge-base context to answer that yet."
        return (
            "Based on the most relevant saved notes, here is the closest match:\n\n"
            f"{chunks[0].get('text', '').strip()[:900]}"
        )

    prompt = f"""
You are a personal assistant that answers only from the user's saved knowledge base.
If the context is insufficient, say what is missing. Cite sources inline like [1].

Conversation history:
{_format_chat_history(history) or "No prior conversation."}

User question:
{message}

Retrieved context:
{context or "No relevant context found."}

Graph context:
{graph_lines or "No graph-neighbor context found."}
""".strip()
    response = client.messages.create(
        model=MODEL_NAME,
        max_tokens=1200,
        temperature=0.1,
        messages=[{"role": "user", "content": prompt}],
    )
    return _text_from_content(response.content)


def answer_with_tools(
    message: str,
    execute_tool: Callable[[str, dict[str, Any]], dict[str, Any]],
    history: list[dict[str, str]] | None = None,
) -> tuple[str, list[str]]:
    client = _client()
    if client is None:
        raise ValueError("ANTHROPIC_API_KEY is required for tool-based answers.")
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": _message_with_history(message, history)}
    ]
    used_tools: list[str] = []

    for turn_index in range(MAX_AGENT_TURNS):
        response = client.messages.create(
            model=MODEL_NAME,
            max_tokens=1200,
            temperature=0.1,
            system=CHAT_SYSTEM_PROMPT,
            tools=CHAT_TOOLS,
            tool_choice={"type": "auto"},
            messages=messages,
        )
        messages.append(
            {"role": "assistant", "content": _message_content_to_params(response.content)}
        )
        tool_uses = [
            block for block in response.content if getattr(block, "type", None) == "tool_use"
        ]
        if not tool_uses:
            return _text_from_content(response.content), used_tools

        tool_results: list[dict[str, Any]] = []
        for tool_use in tool_uses:
            tool_name = str(getattr(tool_use, "name", ""))
            if tool_name:
                used_tools.append(tool_name)
            tool_results.append(_tool_result(tool_use, execute_tool))
        messages.append({"role": "user", "content": tool_results})

    final_response = client.messages.create(
        model=MODEL_NAME,
        max_tokens=800,
        temperature=0.1,
        system=CHAT_SYSTEM_PROMPT,
        messages=messages
        + [
            {
                "role": "user",
                "content": (
                    "Answer now using the tool results already provided. If they are "
                    "insufficient, say what saved context is missing."
                ),
            }
        ],
    )
    return _text_from_content(final_response.content), used_tools


def stream_with_tools(
    message: str,
    execute_tool: Callable[[str, dict[str, Any]], dict[str, Any]],
    history: list[dict[str, str]] | None = None,
) -> Generator[dict[str, Any], None, None]:
    """Stream the AI response token-by-token via a generator of SSE-compatible dicts.

    Yields:
        {"type": "tool_call", "name": "<tool_name>"}  – when a tool fires
        {"type": "text",      "text": "<chunk>"}       – streamed text tokens
        {"type": "done"}                               – end-of-stream sentinel
    """
    client = _client()
    if client is None:
        raise ValueError("ANTHROPIC_API_KEY is required for streaming.")

    messages: list[dict[str, Any]] = [
        {"role": "user", "content": _message_with_history(message, history)}
    ]

    for _turn in range(MAX_AGENT_TURNS):
        with client.messages.stream(
            model=MODEL_NAME,
            max_tokens=1200,
            temperature=0.1,
            system=CHAT_SYSTEM_PROMPT,
            tools=CHAT_TOOLS,
            tool_choice={"type": "auto"},
            messages=messages,
        ) as stream:
            for text_chunk in stream.text_stream:
                yield {"type": "text", "text": text_chunk}
            final_msg = stream.get_final_message()

        messages.append(
            {"role": "assistant", "content": _message_content_to_params(final_msg.content)}
        )

        tool_uses = [
            block for block in final_msg.content if getattr(block, "type", None) == "tool_use"
        ]
        if not tool_uses:
            # Text was already streamed above; we're done.
            break

        # Execute each tool and feed results back.
        tool_results: list[dict[str, Any]] = []
        for tool_use in tool_uses:
            tool_name = str(getattr(tool_use, "name", ""))
            yield {"type": "tool_call", "name": tool_name}
            tool_results.append(_tool_result(tool_use, execute_tool))
        messages.append({"role": "user", "content": tool_results})

    yield {"type": "done"}
