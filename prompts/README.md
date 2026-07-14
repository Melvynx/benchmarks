# Benchmark prompts

This directory is the canonical, repository-owned prompt catalog used by the
benchmark runner and the public comparison application.

- Keep prompt versions immutable after they have been used by a run.
- Add changes as the next numeric `v<number>.md` file.
- Run `pnpm index:prompts` after adding a version.
- Commit the prompt file and the resulting root `prompts.json` together.

The original versions were imported byte-for-byte from the local
`code.melvynx.dev/content/prompts/` catalog on 2026-07-14.
