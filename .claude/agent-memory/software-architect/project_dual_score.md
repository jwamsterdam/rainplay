---
name: project-dual-score
description: RESOLVED — Rainplay had two independent outdoor-score formulas; consolidated to one in src/lib/outdoorScore.ts (2026-06-09)
metadata:
  type: project
---

**Status: RESOLVED (2026-06-09)**

The dual-score problem has been fixed. There is now one score source:
- `outdoorScore()` in `src/lib/outdoorScore.ts` — the canonical formula (formerly `cyclingScore` from DayChartRecharts, promoted to the domain layer).
- `HourlyWeather.score` is filled by this function in `src/api/openMeteo.ts`.
- `DayChartRecharts` renders `hour.score` directly; no local recomputation.
- The old `outdoorScore()` in `openMeteo.ts` and `cyclingScore()` in DayChartRecharts have been deleted.

The fix was accepted by the user on 2026-06-09. The pattern is now a binding project rule in `docs/ai/lessons-learned.md`.

**How to apply going forward:** If any component reintroduces a local score computation, flag it immediately as a violation of the lessons-learned rule.
