# dev-browser API Reference

## Playwright Page Methods

Pages returned by `browser.getPage()` and `browser.newPage()` are full Playwright Page objects.
Full docs: https://playwright.dev/docs/api/class-page

### Navigation

| Method | Description |
|--------|-------------|
| `page.goto(url)` | Navigate to URL |
| `page.goBack()` | Go back |
| `page.goForward()` | Go forward |
| `page.reload()` | Reload page |
| `page.waitForURL(pattern)` | Wait for navigation (supports glob: `**/success`) |

### Element Interaction

| Method | Description |
|--------|-------------|
| `page.click(selector)` | Click element |
| `page.fill(selector, value)` | Fill input field |
| `page.type(selector, text)` | Type text character by character |
| `page.press(selector, key)` | Press key (Enter, Tab, etc.) |
| `page.check(selector)` | Check checkbox |
| `page.uncheck(selector)` | Uncheck checkbox |
| `page.selectOption(selector, value)` | Select dropdown option |

### Locators (preferred for role-based targeting)

| Method | Description |
|--------|-------------|
| `page.getByRole(role, { name })` | Target by ARIA role |
| `page.getByText(text)` | Target by text content |
| `page.getByLabel(label)` | Target by label |
| `page.getByPlaceholder(text)` | Target by placeholder |
| `page.getByTestId(id)` | Target by test ID |
| `page.locator(selector)` | Create locator for chained actions |

### Content Extraction

| Method | Description |
|--------|-------------|
| `page.title()` | Get page title |
| `page.url()` | Get current URL |
| `page.textContent(selector)` | Get text content of element |
| `page.innerHTML(selector)` | Get inner HTML of element |
| `page.evaluate(fn)` | Run JavaScript in page context (plain JS only) |
| `page.$$eval(selector, fn)` | Run function on all matching elements |
| `page.$eval(selector, fn)` | Run function on first matching element |

### Waiting

| Method | Description |
|--------|-------------|
| `page.waitForSelector(selector)` | Wait for element to appear |
| `page.waitForURL(url)` | Wait for navigation to URL |
| `page.waitForLoadState(state)` | Wait for load state (`load`, `domcontentloaded`, `networkidle`) |
| `page.waitForTimeout(ms)` | Wait for specified milliseconds |

### Screenshots & Visual

| Method | Description |
|--------|-------------|
| `page.screenshot()` | Capture screenshot buffer |
| `page.screenshot({ fullPage: true })` | Full page screenshot |
| `page.screenshot({ path: "file.png" })` | Save screenshot to path |

### AI Snapshots

```javascript
const result = await page.snapshotForAI(options);
// Returns: { full: string, incremental?: string }
// Options: { track?: string, depth?: number, timeout?: number }
```

- Use `snapshotForAI()` to discover page structure before interacting
- Use `snapshotForAI({ track: "name" })` after page changes to get incremental diff
- Read `result.full` to identify elements, then use Playwright selectors to interact

## Sandbox Globals

Available in every script (NOT Node.js):

| Global | Description |
|--------|-------------|
| `browser` | Pre-connected browser handle |
| `console` | log, warn, error, info (routed to CLI output) |
| `setTimeout` / `clearTimeout` | Basic timers |
| `saveScreenshot(buf, name)` | Save screenshot buffer (async) |
| `writeFile(name, data)` | Write file to temp dir (async) |
| `readFile(name)` | Read file from temp dir (async) |

**NOT available**: `require()`, `import()`, `process`, `fs`, `path`, `os`, `fetch`, `WebSocket`, `__dirname`, `__filename`

## CLI Commands

| Command | Description |
|---------|-------------|
| `dev-browser run <file>` | Run a script file |
| `dev-browser install` | Install Playwright browsers (Chromium) |
| `dev-browser install-skill` | Install skill into agent directories |
| `dev-browser browsers` | List managed browser instances |
| `dev-browser status` | Show daemon status |
| `dev-browser stop` | Stop daemon and all browsers |

## Invocation Styles

```bash
# Heredoc (most common)
dev-browser <<'EOF'
const page = await browser.getPage("main");
EOF

# Script file
dev-browser run script.js

# Pipe
dev-browser --browser my-project < script.js

# Connect to external Chrome
dev-browser --connect http://localhost:9222 <<'EOF'
const page = await browser.getPage("main");
EOF

# Auto-discover Chrome
dev-browser --connect <<'EOF'
const page = await browser.getPage("main");
EOF
```
