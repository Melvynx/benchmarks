#!/usr/bin/env python3
"""Extract normalized session usage from benchmark JSONL transcripts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


def number(value: Any) -> int | float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    return None


def analyze(path: Path) -> dict[str, Any]:
    last_result: dict[str, Any] | None = None
    last_completed: dict[str, Any] | None = None

    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(record, dict) or not isinstance(record.get("usage"), dict):
                continue
            if record.get("type") == "result":
                last_result = record
            elif record.get("type") == "turn.completed":
                last_completed = record
    except OSError as error:
        return {"status": "unavailable", "schema_version": 1, "reason": str(error)}

    record = last_result or last_completed
    if not record:
        return {
            "status": "unavailable",
            "schema_version": 1,
            "reason": "no terminal usage record found",
        }

    usage = record["usage"]
    codex = record.get("type") == "turn.completed"
    input_tokens = number(usage.get("input_tokens" if codex else "inputTokens"))
    if input_tokens is None:
        input_tokens = number(usage.get("input_tokens"))
    output_tokens = number(usage.get("output_tokens" if codex else "outputTokens"))
    if output_tokens is None:
        output_tokens = number(usage.get("output_tokens"))
    cached = number(usage.get("cached_input_tokens"))
    if cached is None:
        cached = number(usage.get("cache_read_input_tokens"))
    if cached is None:
        cached = number(usage.get("cacheReadTokens"))
    cache_creation = number(usage.get("cache_creation_input_tokens"))
    if cache_creation is None:
        cache_creation = number(usage.get("cacheWriteTokens"))
    reasoning = number(usage.get("reasoning_output_tokens"))

    input_value = input_tokens or 0
    output_value = output_tokens or 0
    cached_value = cached or 0
    cache_creation_value = cache_creation or 0
    processed_input = input_value if codex else input_value + cached_value + cache_creation_value

    return {
        "status": "complete",
        "schema_version": 1,
        "source": f"{record['type']}.usage",
        "input_tokens": input_tokens,
        "processed_input_tokens": processed_input,
        "cached_input_tokens": cached,
        "cache_creation_input_tokens": cache_creation,
        "output_tokens": output_tokens,
        "reasoning_output_tokens": reasoning,
        "total_tokens": processed_input + output_value,
        "total_cost_usd": number(record.get("total_cost_usd")),
        "duration_ms": number(record.get("duration_ms")),
        "duration_api_ms": number(record.get("duration_api_ms")),
        "num_turns": number(record.get("num_turns")),
        "service_tier": usage.get("service_tier") if isinstance(usage.get("service_tier"), str) else None,
        "speed": usage.get("speed") if isinstance(usage.get("speed"), str) else None,
        "inference_geo": usage.get("inference_geo") if isinstance(usage.get("inference_geo"), str) else None,
        "server_tool_use": usage.get("server_tool_use"),
        "model_usage": record.get("modelUsage"),
        "raw_usage": usage,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("transcript", type=Path)
    parser.add_argument("--compact", action="store_true")
    args = parser.parse_args()
    result = analyze(args.transcript)
    print(json.dumps(result, separators=(",", ":") if args.compact else None, indent=None if args.compact else 2))


if __name__ == "__main__":
    main()
