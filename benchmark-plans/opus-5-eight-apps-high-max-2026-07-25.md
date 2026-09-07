# Opus 5: eight apps at High and Max effort

Same model, same eight tasks, two effort levels. Both rows share one `benchmark_id`
so the sixteen runs form a single comparison group in the compare UI.

| enabled | model | harness | effort | tasks |
|---|---|---|---|---|
| yes | claude-opus-5 | cc | high | car-crash,saveit-now-landing,elysian-taste-challenge,simulation-life,earthquake-explorer,rocket-launch,timezone-checker,gmail-clone |
| yes | claude-opus-5 | cc | max | car-crash,saveit-now-landing,elysian-taste-challenge,simulation-life,earthquake-explorer,rocket-launch,timezone-checker,gmail-clone |

## Notes

- Requested task wording maps to canonical task names as follows: evolution
  simulator -> `simulation-life` (prompt slug `ecosystem-evolution-simulator`),
  elysian taste -> `elysian-taste-challenge`, rocket launch -> `rocket-launch`
  (prompt slug `rocket-launch-animation`), car crash -> `car-crash`
  (prompt slug `car-brick-wall-crash`).
- Prompts resolve to the highest local version: `car-brick-wall-crash/v2`,
  `saveit-now-landing/v1`, `elysian-taste-challenge/v2`,
  `ecosystem-evolution-simulator/v3`, `earthquake-explorer/v3`,
  `rocket-launch-animation/v1`, `timezone-checker/v1`, `gmail-clone/v1`.
- Four tasks are standalone HTML (`car-crash`, `elysian-taste-challenge`,
  `rocket-launch`) or seeded (`saveit-now-landing`); the remaining
  `earthquake-explorer`, `simulation-life`, `timezone-checker`, and `gmail-clone`
  each get an allocated port in the Claude range 9200-9299.
- The plan runner launches all sixteen model/task pairs concurrently.
