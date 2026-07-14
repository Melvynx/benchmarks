---
name: dev-browser
description: "Browser automation with persistent page state using dev-browser CLI. Use when user mentions 'browse', 'open website', 'click on', 'fill form', 'take screenshot', 'scrape', 'automate browser', 'test website', 'log into', 'navigate to', 'web page', 'dev-browser', or any browser interaction task."
allowed-tools:
  - Bash(dev-browser *)
  - Bash(/Applications/Helium.app/Contents/MacOS/Helium *)
---

# dev-browser

Browser automation tool that controls browsers through sandboxed JavaScript scripts via CLI.
Scripts run in QuickJS WASM sandbox - not Node.js. No `require`, `fetch`, `fs`, or `process`.

## Setup

If `dev-browser` is not found:
```bash
npm install -g dev-browser
dev-browser install
```

## Core Pattern

Write small, focused scripts. Each script does ONE thing. End by logging state for next decision.

```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com");
console.log(JSON.stringify({ url: page.url(), title: await page.title() }, null, 2));
EOF
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `--headless` | Launch Chromium in headless mode |
| `--connect [URL]` | Connect to running Chrome/Chromium via CDP (auto-discover Chrome, or use a specific CDP endpoint) |
| `--browser <NAME>` | Select named browser instance (default: "default") |
| `--timeout <SECONDS>` | Max script execution time (default: 30) |

## Browser API

| Method | Description |
|--------|-------------|
| `browser.getPage(name)` | Get/create named page (persists between scripts) |
| `browser.newPage()` | Create anonymous page (auto-cleanup after script) |
| `browser.listPages()` | List all tabs: `[{id, url, title, name}]` |
| `browser.closePage(name)` | Close named page |

## File I/O (restricted to `~/.dev-browser/tmp/`)

| Method | Description |
|--------|-------------|
| `await saveScreenshot(buf, name)` | Save screenshot buffer, returns path |
| `await writeFile(name, data)` | Write file, returns path |
| `await readFile(name)` | Read file, returns content |

## Key Workflows

### Discover Unknown Page

```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.goto("https://example.com");
const result = await page.snapshotForAI();
console.log(result.full);
EOF
```

Then interact based on discovered elements:
```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.getByRole("button", { name: "Continue" }).click();
const result = await page.snapshotForAI({ track: "main" });
console.log(result.full);
EOF
```

### Take Screenshot

```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
const buf = await page.screenshot();
const path = await saveScreenshot(buf, "debug.png");
console.log(path);
EOF
```

### Fill Form

```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
await page.fill("#email", "user@example.com");
await page.fill("#password", "secret");
await page.click("button[type=submit]");
await page.waitForURL("**/dashboard");
console.log(JSON.stringify({ url: page.url(), title: await page.title() }, null, 2));
EOF
```

### Connect to Running Chrome

```bash
dev-browser --connect <<'EOF'
const tabs = await browser.listPages();
console.log(JSON.stringify(tabs, null, 2));
EOF
```

### Connect to Helium via CDP

Helium is Chromium-based and can be controlled by `dev-browser` when launched with remote debugging enabled. `dev-browser --connect` auto-discovery does not find Helium, so always pass the explicit CDP endpoint.

For a separate automation profile:
```bash
"/Applications/Helium.app/Contents/MacOS/Helium" \
  --remote-debugging-port=9334 \
  --user-data-dir=/tmp/helium-dev-browser-profile \
  --no-first-run \
  --no-default-browser-check
```

Then connect:
```bash
dev-browser --browser helium --connect http://127.0.0.1:9334 <<'EOF'
const tabs = await browser.listPages();
console.log(JSON.stringify(tabs, null, 2));
EOF
```

To automate the user's existing Helium session, Helium must be fully quit and relaunched with `--remote-debugging-port`; an already-running Helium instance that was started without remote debugging cannot be attached by `dev-browser`.

```bash
"/Applications/Helium.app/Contents/MacOS/Helium" --remote-debugging-port=9334
dev-browser --browser helium --connect http://127.0.0.1:9334
```

If Helium is already open without CDP and must not be restarted, use AppleScript or Computer Use for UI-level control instead of `dev-browser`.

### Error Recovery

If a script fails, the page stays where it stopped. Reconnect and inspect:
```bash
dev-browser <<'EOF'
const page = await browser.getPage("main");
const path = await saveScreenshot(await page.screenshot(), "debug.png");
console.log(JSON.stringify({ screenshot: path, url: page.url(), title: await page.title() }, null, 2));
EOF
```

## Tips

- Use `page.snapshotForAI()` for structure discovery; use screenshots for visual layout
- Keep page names stable across scripts to resume after failures
- Use `console.log(JSON.stringify(...))` for structured output
- Use `--timeout 10` for scripts that should fail fast
- Pages from `browser.getPage("name")` persist between script runs - no need to re-navigate
- Inside `page.evaluate(...)`, use plain JavaScript only - no TypeScript

## Full API Reference

For complete Playwright Page methods and advanced patterns, see [references/api-reference.md](references/api-reference.md).
