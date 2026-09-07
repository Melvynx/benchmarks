#!/usr/bin/env python3
"""Classify substantive benchmark transcript activity into four lifecycle phases."""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

PHASES = ("context_gathering", "planning", "implementation", "verification")
SYMBOLS = {
    "context_gathering": "C",
    "planning": "P",
    "implementation": "I",
    "verification": "V",
}

CONTEXT_PATTERN = re.compile(
    r"\b(inspect|explor|research|discover|read|search|find|list|existing|context|"
    r"repository|codebase|files?|dependencies|documentation|skill)\b|"
    r"(^|[;&|]\s*|\s)(pwd|ls|find|rg|grep|sed|cat|head|tail|which|"
    r"command\s+-v|git\s+(status|diff|log))\b",
    re.IGNORECASE,
)
PLANNING_PATTERN = re.compile(
    r"\b(plan|planning|strategy|approach|architecture|design direction|decid|"
    r"roadmap|todo|taskcreate|sequence|scope|structure|foundation|contract)\b",
    re.IGNORECASE,
)
IMPLEMENTATION_PATTERN = re.compile(
    r"\b(implement|build|creat|scaffold|edit|write|patch|refactor|install|"
    r"add|update|wire|integrat|style|component|feature|fix|code|markup)\b|"
    r"\b(pnpm\s+(add|install)|mkdir|cp\s|mv\s|apply_patch)\b",
    re.IGNORECASE,
)
VERIFICATION_PATTERN = re.compile(
    r"\b(verif|validate|test|check|audit|lint|typecheck|build check|runtime|"
    r"browser|screenshot|viewport|responsive|probe|assert|quality gate|"
    r"playwright|vitest|eslint|tsc|curl|lsof|http|harness_ok|benchmark_complete)\b|"
    r"\bpnpm\s+(test|build|lint|typecheck|ts|check|dev|start)\b",
    re.IGNORECASE,
)


def compact_json(value: Any) -> str:
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def extract_codex(record: dict[str, Any]) -> Iterable[tuple[str, str, str]]:
    if record.get("type") != "item.completed":
        return []
    item = record.get("item") or {}
    item_type = item.get("type", "")
    if item_type in {"agent_message", "reasoning"}:
        return [(item_type, "", str(item.get("text") or item.get("summary") or ""))]
    if item_type == "command_execution":
        return [("tool", "bash", str(item.get("command") or ""))]
    if item_type == "file_change":
        return [("tool", "file_change", compact_json(item.get("changes") or []))]
    if item_type == "todo_list":
        return [("tool", "todo_list", compact_json(item))]
    if item_type in {"web_search", "mcp_tool_call"}:
        return [("tool", item_type, compact_json(item))]
    return []


def extract_message(record: dict[str, Any]) -> Iterable[tuple[str, str, str]]:
    if record.get("type") != "assistant":
        return []
    message = record.get("message") or {}
    content = message.get("content") or []
    if isinstance(content, str):
        return [("text", "", content)]
    extracted = []
    for block in content:
        if not isinstance(block, dict):
            continue
        block_type = block.get("type")
        if block_type == "thinking":
            extracted.append(("thinking", "", str(block.get("thinking") or "")))
        elif block_type == "text":
            extracted.append(("text", "", str(block.get("text") or "")))
        elif block_type == "tool_use":
            extracted.append(("tool", str(block.get("name") or ""), compact_json(block.get("input") or {})))
    return extracted


def extract_opencode(record: dict[str, Any]) -> Iterable[tuple[str, str, str]]:
    event_type = record.get("type")
    part = record.get("part") or {}
    if not isinstance(part, dict):
        part = {}
    if event_type == "text":
        return [("text", "", str(part.get("text") or ""))]
    if event_type == "tool_use":
        state = part.get("state") if isinstance(part.get("state"), dict) else {}
        return [
            (
                "tool",
                str(part.get("tool") or ""),
                compact_json(state.get("input") or {}),
            )
        ]
    return []


CURSOR_TOOL_ALIASES = {
    "shellToolCall": "bash",
    "readToolCall": "read",
    "editToolCall": "edit",
    "writeToolCall": "write",
    "globToolCall": "glob",
    "grepToolCall": "grep",
    "deleteToolCall": "delete",
    "updateTodosToolCall": "todowrite",
    "webSearchToolCall": "web_search",
    "webFetchToolCall": "web_fetch",
    "lsToolCall": "glob",
}


def cursor_tool_name(kind: str) -> str:
    if kind in CURSOR_TOOL_ALIASES:
        return CURSOR_TOOL_ALIASES[kind]
    base = kind.removesuffix("ToolCall") if kind.endswith("ToolCall") else kind
    return re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", base).lower()


def cursor_tool_text(payload: Any) -> str:
    if not isinstance(payload, dict):
        return compact_json(payload)
    args = payload["args"] if isinstance(payload.get("args"), dict) else payload
    parts: list[str] = []
    for key in (
        "command",
        "path",
        "globPattern",
        "pattern",
        "query",
        "url",
        "targetDirectory",
    ):
        value = args.get(key)
        if value:
            parts.append(str(value))
    if args.get("todos"):
        parts.append(compact_json(args["todos"]))
    if parts:
        return " ".join(parts)
    skipped = {
        "parsingResult",
        "streamContent",
        "toolCallId",
        "simpleCommands",
        "fileOutputThreshold",
    }
    return compact_json({key: value for key, value in args.items() if key not in skipped})


def extract_cursor_agent(record: dict[str, Any]) -> Iterable[tuple[str, str, str]]:
    record_type = record.get("type")
    if record_type == "thinking":
        text = str(record.get("text") or "")
        return [("thinking", "", text)] if text else []
    if record_type != "tool_call" or record.get("subtype") != "started":
        return []
    tool_call = record.get("tool_call")
    if not isinstance(tool_call, dict):
        return []
    kind = next((key for key in tool_call if str(key).endswith("ToolCall")), "")
    if not kind:
        return []
    return [("tool", cursor_tool_name(kind), cursor_tool_text(tool_call.get(kind)))]


def extract_segments(record: dict[str, Any]) -> Iterable[tuple[str, str, str]]:
    cursor = list(extract_cursor_agent(record))
    if cursor:
        return cursor
    codex = list(extract_codex(record))
    if codex:
        return codex
    opencode = list(extract_opencode(record))
    if opencode:
        return opencode
    return extract_message(record)


def score_text(text: str) -> dict[str, int]:
    return {
        "context_gathering": len(CONTEXT_PATTERN.findall(text)),
        "planning": len(PLANNING_PATTERN.findall(text)),
        "implementation": len(IMPLEMENTATION_PATTERN.findall(text)),
        "verification": len(VERIFICATION_PATTERN.findall(text)),
    }


def classify(kind: str, tool_name: str, text: str, current_phase: str) -> str:
    name = tool_name.lower()
    combined = f"{tool_name} {text}".strip()
    if name in {"file_change", "edit", "write", "notebookedit", "delete"}:
        return "implementation"
    if name in {"taskcreate", "todowrite", "todo_list", "update_plan"}:
        return "planning"
    if name in {"read", "glob", "grep", "web_search", "skill"}:
        return "context_gathering"
    if name == "taskupdate":
        scores = score_text(combined)
        if scores["verification"]:
            return "verification"
        if scores["implementation"]:
            return "implementation"
        return "planning"
    if name in {"browser", "playwright", "screenshot", "view_image"}:
        return "verification"

    scores = score_text(combined)
    if kind == "thinking" and re.search(r"\b(plan|planning|strategy|approach)\b", text, re.I):
        scores["planning"] += 2
    if kind in {"agent_message", "text", "thinking"} and re.search(
        r"\b(i(?:'|’)ll|i will|we(?:'|’)ll|we will)\b.*\b(first|then|next|before|starting|begin)",
        text,
        re.I | re.S,
    ):
        scores["planning"] += 3
    if kind == "tool" and name == "bash":
        if VERIFICATION_PATTERN.search(text):
            scores["verification"] += 2
        elif CONTEXT_PATTERN.search(text):
            scores["context_gathering"] += 2
        elif IMPLEMENTATION_PATTERN.search(text):
            scores["implementation"] += 2
    best = max(PHASES, key=lambda phase: (scores[phase], -PHASES.index(phase)))
    return best if scores[best] > 0 else current_phase


def allocate(total_slots: int, weights: dict[str, int]) -> dict[str, int]:
    total = sum(weights.values())
    if total == 0:
        return {phase: 0 for phase in PHASES}
    raw = {phase: weights[phase] * total_slots / total for phase in PHASES}
    allocated = {phase: int(raw[phase]) for phase in PHASES}
    remaining = total_slots - sum(allocated.values())
    order = sorted(
        PHASES,
        key=lambda phase: (raw[phase] - allocated[phase], -PHASES.index(phase)),
        reverse=True,
    )
    for phase in order[:remaining]:
        allocated[phase] += 1
    return allocated


def analyze(transcript_path: Path) -> dict[str, Any]:
    weights = Counter({phase: 0 for phase in PHASES})
    segments = Counter({phase: 0 for phase in PHASES})
    current_phase = "context_gathering"
    with transcript_path.open(encoding="utf-8") as transcript:
        for line_number, line in enumerate(transcript, 1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSONL at line {line_number}: {error}") from error
            for kind, tool_name, text in extract_segments(record):
                text = text.strip()
                if not text:
                    continue
                phase = classify(kind, tool_name, text, current_phase)
                current_phase = phase
                weight = min(max(len(text), 24), 800)
                weights[phase] += weight
                segments[phase] += 1

    total_weight = sum(weights.values())
    percentage_tenths = allocate(1000, weights)
    bar_cells = allocate(40, weights)
    progress_bar = "[" + "".join(SYMBOLS[phase] * bar_cells[phase] for phase in PHASES) + "]"
    if total_weight == 0:
        progress_bar = "[" + "-" * 40 + "]"

    categories = {}
    for phase in PHASES:
        filled = round(percentage_tenths[phase] / 50)
        categories[phase] = {
            "percentage": percentage_tenths[phase] / 10,
            "activity_characters": weights[phase],
            "segments": segments[phase],
            "bar": "[" + "#" * filled + "-" * (20 - filled) + "]",
        }
    return {
        "status": "complete" if total_weight else "empty",
        "schema_version": 1,
        "method": "heuristic-v1",
        "basis": "classified agent messages and tool-call activity characters; transport noise, signatures, and duplicated tool results excluded",
        "classified_activity_characters": total_weight,
        "classified_segments": sum(segments.values()),
        "progress_bar": progress_bar,
        "legend": SYMBOLS,
        "categories": categories,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()
    result = analyze(args.transcript)
    print(
        json.dumps(
            result,
            ensure_ascii=False,
            separators=(",", ":") if args.compact else None,
            indent=None if args.compact else 2,
        )
    )


if __name__ == "__main__":
    main()
