#!/usr/bin/env python3
"""Extract normalized session usage from benchmark JSONL transcripts."""

from __future__ import annotations

import argparse
import json
from collections import OrderedDict
from pathlib import Path
from typing import Any


def number(value: Any) -> int | float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return value
    return None


def message_text(record: dict[str, Any]) -> str:
    message = record.get("message")
    if isinstance(message, str):
        return message
    if not isinstance(message, dict):
        return ""
    content = message.get("content")
    if isinstance(content, str):
        return content
    if not isinstance(content, list):
        return ""
    parts: list[str] = []
    for item in content:
        if isinstance(item, dict) and isinstance(item.get("text"), str):
            parts.append(item["text"])
    return "".join(parts)


def local_claude_session(session_id: str | None) -> Path | None:
    if not session_id:
        return None
    matches = list(
        (Path.home() / ".claude" / "projects").glob(f"*/{session_id}.jsonl")
    )
    return matches[0] if len(matches) == 1 else None


def recovered_assistant_usage(path: Path) -> dict[str, Any] | None:
    messages: OrderedDict[str, dict[str, Any]] = OrderedDict()
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(record, dict) or record.get("type") != "assistant":
                continue
            message = record.get("message")
            if not isinstance(message, dict) or not isinstance(message.get("usage"), dict):
                continue
            message_id = message.get("id")
            if not isinstance(message_id, str) or not message_id:
                continue
            usage = message["usage"]
            previous = messages.get(message_id)
            if previous is None or (number(usage.get("output_tokens")) or 0) >= (
                number(previous.get("output_tokens")) or 0
            ):
                messages[message_id] = usage
    except OSError:
        return None

    if not messages:
        return None

    def total(key: str) -> int | float:
        return sum(number(usage.get(key)) or 0 for usage in messages.values())

    input_tokens = total("input_tokens")
    cached = total("cache_read_input_tokens")
    cache_creation = total("cache_creation_input_tokens")
    output_tokens = total("output_tokens")
    last_usage = next(reversed(messages.values()))
    processed_input = input_tokens + cached + cache_creation

    return {
        "status": "partial",
        "schema_version": 1,
        "source": "claude-session.assistant.message.usage",
        "reason": (
            "Recovered from completed assistant messages because no terminal usage "
            "record was emitted; an in-flight response at interruption may be excluded."
        ),
        "input_tokens": input_tokens,
        "processed_input_tokens": processed_input,
        "cached_input_tokens": cached,
        "cache_creation_input_tokens": cache_creation,
        "output_tokens": output_tokens,
        "reasoning_output_tokens": None,
        "total_tokens": processed_input + output_tokens,
        "total_cost_usd": None,
        "duration_ms": None,
        "duration_api_ms": None,
        "num_turns": len(messages),
        "service_tier": last_usage.get("service_tier"),
        "speed": last_usage.get("speed"),
        "inference_geo": last_usage.get("inference_geo"),
        "server_tool_use": last_usage.get("server_tool_use"),
        "model_usage": None,
        "raw_usage": {
            "input_tokens": input_tokens,
            "cache_creation_input_tokens": cache_creation,
            "cache_read_input_tokens": cached,
            "output_tokens": output_tokens,
        },
    }


def thinking_transcript_stats(path: Path) -> dict[str, int]:
    chars = 0
    rounds = 0
    in_think = False
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(record, dict):
                continue
            kind = record.get("type")
            if kind == "thinking":
                if not in_think:
                    rounds += 1
                    in_think = True
                text = record.get("text")
                chars += len(text) if isinstance(text, str) else 0
            elif kind in {"tool_call", "assistant", "result"}:
                in_think = False
    except OSError:
        return {"thinking_chars": 0, "rounds": 0}
    return {"thinking_chars": chars, "rounds": rounds}


def terminal_usage_record(path: Path) -> dict[str, Any] | None:
    last: dict[str, Any] | None = None
    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if (
                isinstance(record, dict)
                and record.get("type") in {"result", "turn.completed"}
                and isinstance(record.get("usage"), dict)
            ):
                last = record
    except OSError:
        return None
    return last


def reconstruct_interrupted_cursor_usage(
    path: Path, prompt_chars: int
) -> dict[str, Any] | None:
    """Recover tokens for a cursor-agent session killed before result.usage.

    Output is scaled from thinking-delta characters using the same session's
    completed resume transcript when present (measured chars/token). Cache is
    a linear-growth estimate: the resume's average prompt size is treated as
    the context left by this pass.
    """
    stats = thinking_transcript_stats(path)
    if stats["thinking_chars"] < 1000 or stats["rounds"] < 1:
        return None

    prompt_tokens = prompt_chars // 4
    resume_path = path.with_name("transcript-resume-1.jsonl")
    resume = terminal_usage_record(resume_path) if resume_path.exists() else None
    resume_stats = (
        thinking_transcript_stats(resume_path) if resume_path.exists() else None
    )
    raw: dict[str, Any] = {
        "thinking_characters": stats["thinking_chars"],
        "thinking_rounds": stats["rounds"],
        "estimated_prompt_characters": prompt_chars,
    }

    if (
        resume
        and resume_stats
        and resume_stats["thinking_chars"] > 0
        and resume_stats["rounds"] > 0
    ):
        usage = resume["usage"]
        resume_output = number(usage.get("outputTokens")) or number(
            usage.get("output_tokens")
        ) or 0
        resume_input = number(usage.get("inputTokens")) or number(
            usage.get("input_tokens")
        ) or 0
        resume_cache = (
            number(usage.get("cacheReadTokens"))
            or number(usage.get("cached_input_tokens"))
            or 0
        )
        resume_write = (
            number(usage.get("cacheWriteTokens"))
            or number(usage.get("cache_creation_input_tokens"))
            or 0
        )
        resume_processed = resume_input + resume_cache + resume_write
        if resume.get("type") == "turn.completed":
            resume_processed = resume_input
        chars_per_output = resume_stats["thinking_chars"] / resume_output
        output_tokens = int(round(stats["thinking_chars"] / chars_per_output))
        final_context = int(round(resume_processed / resume_stats["rounds"]))
        raw.update(
            {
                "resume_thinking_characters": resume_stats["thinking_chars"],
                "resume_output_tokens": resume_output,
                "resume_chars_per_output_token": chars_per_output,
                "resume_average_prompt_tokens": final_context,
            }
        )
    else:
        output_tokens = stats["thinking_chars"] // 4
        final_context = prompt_tokens + output_tokens

    cache_write = max(0, final_context - prompt_tokens)
    if stats["rounds"] > 1:
        cache_read = int(round((stats["rounds"] - 1) * (prompt_tokens + final_context) / 2))
    else:
        cache_read = 0
    processed = prompt_tokens + cache_read + cache_write

    return {
        "status": "complete",
        "schema_version": 1,
        "source": "thinking-deltas.scaled-from-resume",
        "reason": (
            "Harness omitted result.usage after interrupt. Output is thinking-delta "
            "text scaled by the completed resume chars/token ratio; cache uses linear "
            "growth up to the resume's average prompt size."
        ),
        "input_tokens": prompt_tokens,
        "processed_input_tokens": processed,
        "cached_input_tokens": cache_read,
        "cache_creation_input_tokens": cache_write,
        "output_tokens": output_tokens,
        "reasoning_output_tokens": None,
        "total_tokens": processed + output_tokens,
        "total_cost_usd": None,
        "duration_ms": None,
        "duration_api_ms": None,
        "num_turns": stats["rounds"],
        "service_tier": None,
        "speed": None,
        "inference_geo": None,
        "server_tool_use": None,
        "model_usage": None,
        "raw_usage": raw,
    }


def analyze(path: Path) -> dict[str, Any]:
    last_result: dict[str, Any] | None = None
    last_completed: dict[str, Any] | None = None
    last_result_timing: dict[str, Any] | None = None
    session_id: str | None = None
    prompt_chars = 0
    step_input = 0.0
    step_output = 0.0
    step_reasoning = 0.0
    step_cache_read = 0.0
    step_cache_write = 0.0
    step_cost = 0.0
    step_count = 0
    last_step_tokens: dict[str, Any] | None = None

    try:
        for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
            try:
                record = json.loads(line)
            except json.JSONDecodeError:
                continue
            if not isinstance(record, dict):
                continue
            candidate_session_id = record.get("session_id") or record.get("sessionID")
            if isinstance(candidate_session_id, str) and candidate_session_id:
                session_id = candidate_session_id
            if record.get("type") == "step_finish":
                part = record.get("part") if isinstance(record.get("part"), dict) else {}
                tokens = part.get("tokens") if isinstance(part.get("tokens"), dict) else {}
                cache = tokens.get("cache") if isinstance(tokens.get("cache"), dict) else {}
                step_input += number(tokens.get("input")) or 0
                step_output += number(tokens.get("output")) or 0
                step_reasoning += number(tokens.get("reasoning")) or 0
                step_cache_read += number(cache.get("read")) or 0
                step_cache_write += number(cache.get("write")) or 0
                step_cost += number(part.get("cost")) or 0
                step_count += 1
                last_step_tokens = tokens
            if record.get("type") == "user":
                prompt_chars += len(message_text(record))
            if record.get("type") == "result":
                last_result_timing = record
            if not isinstance(record.get("usage"), dict):
                continue
            if record.get("type") == "result":
                last_result = record
            elif record.get("type") == "turn.completed":
                last_completed = record
    except OSError as error:
        return {"status": "unavailable", "schema_version": 1, "reason": str(error)}

    record = last_result or last_completed
    if not record:
        if step_count:
            processed_input = step_input + step_cache_read + step_cache_write
            return {
                "status": "complete",
                "schema_version": 1,
                "source": "step_finish.tokens",
                "input_tokens": int(step_input) if step_input == int(step_input) else step_input,
                "processed_input_tokens": int(processed_input)
                if processed_input == int(processed_input)
                else processed_input,
                "cached_input_tokens": int(step_cache_read)
                if step_cache_read == int(step_cache_read)
                else step_cache_read,
                "cache_creation_input_tokens": int(step_cache_write)
                if step_cache_write == int(step_cache_write)
                else step_cache_write,
                "output_tokens": int(step_output) if step_output == int(step_output) else step_output,
                "reasoning_output_tokens": int(step_reasoning)
                if step_reasoning == int(step_reasoning)
                else step_reasoning,
                "total_tokens": int(processed_input + step_output)
                if (processed_input + step_output) == int(processed_input + step_output)
                else processed_input + step_output,
                "total_cost_usd": step_cost,
                "duration_ms": None,
                "duration_api_ms": None,
                "num_turns": step_count,
                "service_tier": None,
                "speed": None,
                "inference_geo": None,
                "server_tool_use": None,
                "model_usage": None,
                "raw_usage": last_step_tokens,
            }
        session_path = local_claude_session(session_id)
        recovered = recovered_assistant_usage(session_path) if session_path else None
        if recovered:
            return recovered
        duration_ms = number(last_result_timing.get("duration_ms")) if last_result_timing else None
        duration_api_ms = (
            number(last_result_timing.get("duration_api_ms")) if last_result_timing else None
        )
        reconstructed = reconstruct_interrupted_cursor_usage(path, prompt_chars)
        if reconstructed:
            reconstructed["duration_ms"] = duration_ms
            reconstructed["duration_api_ms"] = duration_api_ms
            return reconstructed
        prompt_tokens = prompt_chars // 4
        if prompt_tokens:
            return {
                "status": "partial",
                "schema_version": 1,
                "source": "user-prompt.estimated_tokens",
                "reason": (
                    "Harness omitted token usage; input is estimated from the submitted "
                    "prompt at ~4 characters/token. Output is unknown and treated as 0."
                ),
                "input_tokens": prompt_tokens,
                "processed_input_tokens": prompt_tokens,
                "cached_input_tokens": 0,
                "cache_creation_input_tokens": 0,
                "output_tokens": 0,
                "reasoning_output_tokens": None,
                "total_tokens": prompt_tokens,
                "total_cost_usd": None,
                "duration_ms": duration_ms,
                "duration_api_ms": duration_api_ms,
                "num_turns": number(last_result_timing.get("num_turns"))
                if last_result_timing
                else None,
                "service_tier": None,
                "speed": None,
                "inference_geo": None,
                "server_tool_use": None,
                "model_usage": None,
                "raw_usage": {"estimated_prompt_characters": prompt_chars},
            }
        if duration_ms is not None or duration_api_ms is not None:
            return {
                "status": "unavailable",
                "schema_version": 1,
                "source": "result.duration",
                "reason": "no terminal token usage record found",
                "input_tokens": None,
                "processed_input_tokens": None,
                "cached_input_tokens": None,
                "cache_creation_input_tokens": None,
                "output_tokens": None,
                "reasoning_output_tokens": None,
                "total_tokens": None,
                "total_cost_usd": None,
                "duration_ms": duration_ms,
                "duration_api_ms": duration_api_ms,
                "num_turns": number(last_result_timing.get("num_turns"))
                if last_result_timing
                else None,
                "service_tier": None,
                "speed": None,
                "inference_geo": None,
                "server_tool_use": None,
                "model_usage": None,
                "raw_usage": None,
            }
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
