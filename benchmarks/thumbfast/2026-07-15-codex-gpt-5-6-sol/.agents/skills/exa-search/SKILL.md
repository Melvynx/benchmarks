---
name: exa-search
description: >-
  Search the web, retrieve page contents, get cited answers, and gather
  research or code context using the local Exa CLI. Use this skill whenever
  the user wants Exa-powered web research, semantic search, recent source
  discovery, domain-filtered search, similar-page discovery, URL content
  extraction, or web-grounded answers with citations. Common scenarios include
  finding current sources before summarizing a topic, searching with domain or
  date filters, pulling page text from known URLs, finding pages similar to a
  reference URL, and gathering compact web context for technical questions.
  Prefer this skill when the user explicitly mentions Exa or when Exa CLI is
  the intended search tool.
---

# Exa Search

Use the local `exa-cli` installation to search the web, inspect URLs, and produce grounded answers.

## Quick Start

Prefer `exa-cli` from `PATH`.
If it is missing, check `/Users/melvynx/.local/bin/exa-cli`.
The local project source is `/Users/melvynx/.cli/exa-cli`.

Verify availability and auth before doing substantive work:

```bash
exa-cli --help
exa-cli auth test
```

If `exa-cli` is not installed at all, clone and link the local CLI:

```bash
git clone https://github.com/melvynx/exa-cli.git ~/.cli/exa-cli
cd ~/.cli/exa-cli && bun install && bun run build
mkdir -p ~/.local/bin
ln -sf ~/.cli/exa-cli/dist/exa-cli.js ~/.local/bin/exa-cli
chmod +x ~/.local/bin/exa-cli
# ensure ~/.local/bin is on PATH (add to ~/.zshrc if missing):
#   export PATH="$HOME/.local/bin:$PATH"
```

If authentication is missing or invalid:

```bash
exa-cli auth set <token>
exa-cli auth test
```

## Workflow

1. Choose the smallest command that matches the task.
2. Use `--json` when calling the CLI programmatically.
3. Start with concise output, then add `--text`, `--summary`, or `--highlights` only when needed.
4. Use domain, date, and category filters when freshness or source quality matters.
5. Summarize findings with the returned URLs so the final answer stays grounded.

## Command Selection

Use `exa-cli search query` for normal web research and source discovery.

```bash
exa-cli search query --query "latest AI research" --json
exa-cli search query --query "best React frameworks" --type neural --num-results 5 --json
exa-cli search query --query "SpaceX news" --start-date 2024-01-01 --category news --summary --json
```

Use `exa-cli search find-similar` when you already have one strong URL and want neighboring sources.

```bash
exa-cli search find-similar --url "https://example.com" --num-results 5 --json
```

Use `exa-cli contents get` when you already know the URL or URLs and need the page content.

```bash
exa-cli contents get --urls "https://example.com" --text --json
exa-cli contents get --urls "https://a.com,https://b.com" --summary --json
```

Use `exa-cli answer query` when the user wants a direct answer grounded in web citations.

```bash
exa-cli answer query --query "What is the latest valuation of SpaceX?" --json
exa-cli answer query --query "Who won the 2024 election?" --text --json
```

Use `exa-cli context get` when you need compact research or code context under a token budget.

```bash
exa-cli context get --query "how to use React hooks" --tokens-num 4000 --json
exa-cli context get --query "Python async await patterns" --tokens-num 8000 --json
```

## Query Guidance

Use the user's full intent as the query whenever possible.
Avoid single-word queries unless the task is intentionally broad.

Prefer these patterns:

- Current events or recent changes: add `--start-date`, `--end-date`, or a date in the query.
- Source curation: add `--include-domains` or `--exclude-domains`.
- Narrowing intent: use `--category` for `news`, `company`, `research_paper`, `pdf`, or `tweet`.
- Deep inspection: add `--text`, `--summary`, or `--highlights` only after you have the right result set.

## Common Patterns

Domain-filtered search:

```bash
exa-cli search query --query "React server components caching" --include-domains react.dev,nextjs.org --json
```

Recent news scan:

```bash
exa-cli search query --query "OpenAI funding" --category news --start-date 2026-03-01 --num-results 5 --json
```

Follow-up content fetch after search:

```bash
exa-cli contents get --urls "https://example.com/post-1,https://example.com/post-2" --text --json
```

Grounded answer first, manual inspection second:

```bash
exa-cli answer query --query "What changed in Bun's package manager recently?" --json
```

## Error Handling

If `exa-cli auth test` fails, tell the user the Exa token is missing or invalid and ask them to authenticate with `exa-cli auth set`.

If the CLI is missing from `PATH`, try `/Users/melvynx/.local/bin/exa-cli` before assuming it is not installed.

If a query returns weak results:

1. Rewrite the query with more concrete intent.
2. Add filters for domain, category, or date.
3. Switch from `answer query` to `search query` plus `contents get` when you need tighter control over sources.

## Common Mistakes

- Do not start with `--text` on broad searches unless you actually need page bodies.
- Do not use vague one-word queries when a full natural-language query is available.
- Do not rely on `answer query` alone for high-stakes topics if you should inspect the cited URLs directly.
- Do not fetch contents for many URLs before narrowing the result set with search.
