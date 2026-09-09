# Benchmark plan: Muse Spark 1.3 High — Astra task repeat

Repeat the 2026-09-05 GPT-6 Astra Codex set
(`car-crash`, `simulation-life`, `saveit-now-landing`, `timezone-checker`,
`gmail-clone`) with Muse Spark 1.3 High through Cursor Agent.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | muse-spark-1.3-high | cursor-agent | high | car-crash,simulation-life,saveit-now-landing,timezone-checker,gmail-clone |

## Notes

`muse-spark-1.3-high` was confirmed present in the `cursor-agent --list-models`
catalog on 2026-09-09. Effort is encoded in the model id; Cursor Agent does not
take a separate `--effort` flag.
