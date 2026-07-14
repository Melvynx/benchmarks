#!/usr/bin/env bash

generate_benchmark_id() {
  python3 - <<'PY'
from datetime import datetime, timezone
from uuid import uuid4

stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
print(f"benchmark-{stamp}-{uuid4().hex[:8]}")
PY
}

valid_benchmark_id() {
  [[ "$1" =~ ^benchmark-[0-9]{8}T[0-9]{6}Z-[a-f0-9]{8}$ ]]
}
