#!/usr/bin/env python3
"""Write Cursor billing-ledger token usage next to each cursor-agent transcript.

Cursor's final `result.usage` restarts after a mid-turn reconnect, so it misses
every request billed before the resume. The account usage ledger
(DashboardService/GetFilteredUsageEvents) records each billed request with its
conversation id, which equals the cursor-agent session id.
"""

import argparse
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ENDPOINT = "https://api2.cursor.sh/aiserver.v1.DashboardService/GetFilteredUsageEvents"
SOURCE = "cursor-dashboard.usage-events"
BEFORE_MS = 60_000
AFTER_MS = 180_000


def access_token():
    # Linux cursor-agent stores its login in a file instead of the macOS keychain.
    auth_file = Path.home() / ".config" / "cursor" / "auth.json"
    if sys.platform != "darwin" and auth_file.is_file():
        token = (json.loads(auth_file.read_text()).get("accessToken") or "").strip()
        if token:
            return token
    result = subprocess.run(
        ["security", "find-generic-password", "-s", "cursor-access-token", "-a", "cursor-user", "-w"],
        capture_output=True, text=True,
    )
    if result.returncode != 0 or not result.stdout.strip():
        sys.exit("Cursor CLI access token not found in the login keychain; run `cursor-agent login`.")
    return result.stdout.strip()


def fetch_events(token, start_ms, end_ms):
    events, page = [], 1
    while True:
        body = json.dumps({"startDate": str(start_ms), "endDate": str(end_ms), "page": page, "pageSize": 500}).encode()
        request = urllib.request.Request(ENDPOINT, data=body, method="POST", headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Connect-Protocol-Version": "1",
        })
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                payload = json.loads(response.read())
        except urllib.error.HTTPError as error:
            sys.exit(f"Cursor usage ledger returned HTTP {error.code}")
        batch = payload.get("usageEventsDisplay", [])
        events.extend(batch)
        if not batch or len(events) >= int(payload.get("totalUsageEventsCount", 0)):
            return events
        page += 1


def epoch_ms(value):
    return int(datetime.fromisoformat(value.replace("Z", "+00:00")).timestamp() * 1000)


def attempts(run_dirs):
    for run_dir in run_dirs:
        for session_file in sorted(Path(run_dir).glob("data/*/session-id.txt")) + sorted(
            Path(run_dir).glob("data/*/iterations/*/session-id.txt")
        ):
            directory = session_file.parent
            transcript = directory / "transcript.jsonl"
            meta_file = directory / "metadata.json"
            if not transcript.is_file() or not meta_file.is_file():
                continue
            meta = json.loads(meta_file.read_text())
            task_meta = directory.parent.parent / "metadata.json" if directory.parent.name == "iterations" else meta_file
            if json.loads(task_meta.read_text()).get("harness") != "cursor-agent":
                continue
            timing = meta.get("model_timing") or {}
            if not timing.get("started_at") or not timing.get("completed_at"):
                print(f"skip {directory}: model_timing is incomplete", file=sys.stderr)
                continue
            yield {
                "dir": directory,
                "session": session_file.read_text().strip(),
                "start": epoch_ms(timing["started_at"]),
                "end": epoch_ms(timing["completed_at"]),
            }


def token_count(event, key):
    return int((event.get("tokenUsage") or {}).get(key) or 0)


def evidence(attempt, events):
    input_tokens = sum(token_count(e, "inputTokens") for e in events)
    output_tokens = sum(token_count(e, "outputTokens") for e in events)
    cache_read = sum(token_count(e, "cacheReadTokens") for e in events)
    cache_write = sum(token_count(e, "cacheWriteTokens") for e in events)
    cents = sum(float((e.get("tokenUsage") or {}).get("totalCents") or 0) for e in events)
    processed = input_tokens + cache_read + cache_write
    models = sorted({e.get("model") for e in events if e.get("model")})
    return {
        "source": SOURCE,
        "conversation_id": attempt["session"],
        "fetched_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "note": "Sum of every request Cursor billed to this conversation during the invocation window, including requests before a reconnect resume. total_cost_usd is Cursor's API-rate token cost; charged_usd is what the account was actually charged.",
        "charged_usd": round(sum(float(e.get("chargedCents") or 0) for e in events) / 100, 6),
        "session_usage": {
            "schema_version": 1,
            "status": "complete",
            "source": SOURCE,
            "input_tokens": input_tokens,
            "processed_input_tokens": processed,
            "cached_input_tokens": cache_read,
            "cache_creation_input_tokens": cache_write,
            "output_tokens": output_tokens,
            "reasoning_output_tokens": None,
            "total_tokens": processed + output_tokens,
            "total_cost_usd": round(cents / 100, 6),
            "num_turns": len(events),
            "model_usage": None,
            "raw_usage": {"models": models, "billed_requests": len(events)},
        },
        "events": [
            {
                "timestamp": datetime.fromtimestamp(int(e["timestamp"]) / 1000, timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
                "model": e.get("model"),
                "kind": e.get("kind"),
                "max_mode": e.get("maxMode"),
                "token_usage": e.get("tokenUsage"),
                "charged_cents": e.get("chargedCents"),
            }
            for e in sorted(events, key=lambda item: int(item["timestamp"]))
        ],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("run_dirs", nargs="+")
    parser.add_argument("--wait", type=int, default=0, help="seconds to keep polling for ledger events that have not landed yet")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    pending = list(attempts(args.run_dirs))
    if not pending:
        sys.exit("No cursor-agent attempts with session-id.txt, transcript.jsonl, and model_timing found.")
    token = access_token()
    start = min(a["start"] for a in pending) - BEFORE_MS
    end = max(a["end"] for a in pending) + AFTER_MS
    deadline = time.time() + args.wait
    missing = []
    while True:
        by_conversation = defaultdict(list)
        for event in fetch_events(token, start, end):
            by_conversation[event.get("conversationId")].append(event)
        missing = []
        for attempt in pending:
            window = [
                e for e in by_conversation.get(attempt["session"], [])
                if attempt["start"] - BEFORE_MS <= int(e["timestamp"]) <= attempt["end"] + AFTER_MS
            ]
            if not window:
                missing.append(attempt)
                continue
            record = evidence(attempt, window)
            usage = record["session_usage"]
            print(f"{attempt['dir']}: {usage['num_turns']} billed requests, {usage['total_tokens']} tokens, ${usage['total_cost_usd']:.4f}")
            if not args.dry_run:
                (attempt["dir"] / "usage-evidence.json").write_text(json.dumps(record, indent=2) + "\n")
        pending = missing
        if not pending or time.time() >= deadline:
            break
        time.sleep(15)
    for attempt in missing:
        print(f"{attempt['dir']}: no billed requests for conversation {attempt['session']}", file=sys.stderr)
    sys.exit(1 if missing else 0)


if __name__ == "__main__":
    main()
