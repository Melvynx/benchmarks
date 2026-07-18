#!/usr/bin/env python3
"""Dependency-free structural checks for the static living-garden app."""

from __future__ import annotations

import json
import pathlib
import re
import sys
from html.parser import HTMLParser


ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED_TITLE = "Codex GPT-5.6 Sol"


class DocumentParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.title_depth = 0
        self.heading_depth = 0
        self.title_parts: list[str] = []
        self.heading_parts: list[str] = []
        self.local_assets: list[str] = []
        self.ids: set[str] = set()

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        if tag == "title":
            self.title_depth += 1
        if tag == "h1":
            self.heading_depth += 1
        if values.get("id"):
            self.ids.add(values["id"] or "")
        asset = values.get("src") if tag == "script" else values.get("href") if tag == "link" else None
        if asset and not asset.startswith(("http://", "https://", "data:")):
            self.local_assets.append(asset)

    def handle_endtag(self, tag: str) -> None:
        if tag == "title":
            self.title_depth = max(0, self.title_depth - 1)
        if tag == "h1":
            self.heading_depth = max(0, self.heading_depth - 1)

    def handle_data(self, data: str) -> None:
        if self.title_depth:
            self.title_parts.append(data)
        if self.heading_depth:
            self.heading_parts.append(data)


def fail(message: str) -> None:
    print(f"FAIL: {message}", file=sys.stderr)
    raise SystemExit(1)


def main() -> None:
    index_path = ROOT / "index.html"
    style_path = ROOT / "styles.css"
    engine_path = ROOT / "engine.mjs"
    app_path = ROOT / "app.mjs"
    package_path = ROOT / "package.json"

    for path in (index_path, style_path, engine_path, app_path, package_path):
        if not path.is_file() or path.stat().st_size == 0:
            fail(f"missing or empty required file: {path.name}")

    parser = DocumentParser()
    parser.feed(index_path.read_text(encoding="utf-8"))
    title = "".join(parser.title_parts).strip()
    heading = "".join(parser.heading_parts).strip()
    if title != EXPECTED_TITLE:
        fail(f"browser title is {title!r}, expected {EXPECTED_TITLE!r}")
    if heading != EXPECTED_TITLE:
        fail(f"primary visible title is {heading!r}, expected {EXPECTED_TITLE!r}")

    for asset in parser.local_assets:
        path = (ROOT / asset).resolve()
        if ROOT not in path.parents or not path.is_file():
            fail(f"missing local asset: {asset}")

    required_ids = {
        "worldCanvas", "timelineCanvas", "phaseCanvas", "playButton", "stepButton",
        "resetButton", "randomizeButton", "seedInput", "presetList", "inspectorCard",
        "controlGroups", "applyAndReset"
    }
    missing_ids = sorted(required_ids - parser.ids)
    if missing_ids:
        fail(f"missing required interaction surfaces: {', '.join(missing_ids)}")

    package = json.loads(package_path.read_text(encoding="utf-8"))
    scripts = package.get("scripts", {})
    if "9156" not in scripts.get("start", "") or "9156" not in scripts.get("dev", ""):
        fail("dev and start package scripts must both bind port 9156")

    engine_source = engine_path.read_text(encoding="utf-8")
    app_source = app_path.read_text(encoding="utf-8")
    styles = style_path.read_text(encoding="utf-8")
    required_parameters = {
        "fruitGrowth", "fruitLimit", "fruitReturnDelay", "blueEnergyUse", "blueSpeed",
        "blueVision", "blueCopyThreshold", "blueEatingTime", "redEnergyUse", "redSpeed",
        "redVision", "redContactStrength", "redCopyThreshold", "redPauseTime", "startTrees",
        "startBlue", "startRed", "worldSize"
    }
    missing_parameters = sorted(key for key in required_parameters if f'key: "{key}"' not in engine_source)
    if missing_parameters:
        fail(f"missing simulation parameters: {', '.join(missing_parameters)}")

    for preset in ("balanced", "fruitRich", "redHeavy", "fragile", "lowFruit"):
        if not re.search(rf"\b{preset}\s*:\s*preset\(", engine_source):
            fail(f"missing preset: {preset}")

    required_engine_markers = (
        "blob.energy -=", "slot.ready = false", "stats.fruitEaten", "stats.contacts",
        "#tryReproduction", "this.history.push", "runHeadless"
    )
    for marker in required_engine_markers:
        if marker not in engine_source:
            fail(f"simulation rule marker missing: {marker}")

    if "prefers-reduced-motion" not in styles:
        fail("reduced-motion fallback is missing")
    if "pointerdown" not in app_source or "selectResident" not in app_source:
        fail("world rotation or blob inspection wiring is missing")
    if re.search(r"\bnpm\b", "\n".join(str(value) for value in scripts.values())):
        fail("package scripts must not invoke npm")

    print("Static app checks passed")
    print(f"  title: {EXPECTED_TITLE}")
    print("  assets: index.html, styles.css, app.mjs, engine.mjs")
    print("  package port: 9156")
    print(f"  controls: {len(required_parameters)} rule parameters + playback/presets")


if __name__ == "__main__":
    main()
