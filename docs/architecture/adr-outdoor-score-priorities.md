# ADR: Outdoor Score Priorities

## Status

Accepted.

## Context

Rainplay helps users make a simple vacation/outdoor decision:

- go outside now;
- wait a few hours;
- choose tomorrow or another day.

The app is intentionally not an activity-specific dashboard. Earlier references
to cycling are not the product direction. Rainplay should support broad outdoor
decisions such as `buiten`, `op pad`, and `beste moment`.

Open-Meteo and similar weather sources can expose many useful factors, including
apparent temperature, wind speed, wind gusts, cloud cover, radiation, sunshine,
precipitation amount, precipitation probability, and daylight. Some APIs and
apps also expose activity-oriented scores, such as outdoor or cycling scores.

For Rainplay, the product owner has explicitly chosen not to use an
activity-specific outdoor-cycling score as the primary model. The goal is a calm,
human decision aid for general outdoor plans.

## Decision

Rainplay's outdoor score prioritizes rain and daylight above all other weather
factors.

The first-order question is:

> Is it dry enough, and is it light enough, to go outside?

Temperature, apparent temperature, wind, gusts, cloud cover, sunshine, and
radiation may still be used as secondary modifiers, explanatory context, or
future tuning inputs, but they must not dominate the score in a way that hides
the main rain/daylight decision.

This is an intentional product decision, not an accidental omission of available
weather variables.

## Rationale

Rainplay is used for quick vacation/outdoor planning. In that context, rain and
darkness most often determine whether going outside feels like a good idea.

Wind and apparent temperature matter, but they are more context-dependent:

- a windy day can still be fine for walking around town;
- a chilly but dry morning may still be acceptable;
- a cloudy day can still be a good outdoor window;
- an activity-specific score may punish conditions that are only problematic for
  cycling or sports.

If the score overweights wind, apparent temperature, or other secondary factors,
Rainplay risks becoming less intuitive for its main use case. The app should
feel like a calm decision aid, not a scientific or sport-specific rating.

## Consequences

Accepted benefits:

- The score matches the product's general outdoor use case.
- Advice stays easy to understand: dry/light windows are surfaced clearly.
- The app avoids inheriting assumptions from cycling-specific or
  activity-specific scoring models.
- The formula can remain small and explainable during the first PWA version.

Accepted trade-offs:

- The score may be optimistic on dry but very windy or cold days.
- Some weather variables fetched from Open-Meteo may initially be unused or used
  only in secondary copy.
- Future reviewers may mistake this for incomplete scoring unless this decision
  remains documented.

## Guardrails

- Do not use Open-Meteo or third-party activity scores directly as Rainplay's
  primary score.
- Keep Rainplay's score owned by `src/lib/` and covered by behavior-oriented
  tests.
- Rain and daylight should remain the strongest score drivers unless a later
  product decision changes this.
- Secondary factors may reduce or nuance the score, but should not obscure a
  clearly dry and light window.
- If secondary factors are added, tune them conservatively and test edge cases:
  dry but dark, wet but bright, dry but windy, cold but dry, and stormy gusts.
- UI copy may mention secondary risks separately, for example wind or cold, even
  when the main score remains rain/daylight-led.

## Exit Criteria

Revisit this decision if:

- users report that the score regularly recommends unpleasant dry windows;
- the product becomes activity-specific;
- wind, cold, heat, or gusts become a repeated source of wrong advice;
- the score and displayed advice diverge in confusing ways;
- Rainplay adds user-tunable preferences for sensitivity to wind, temperature,
  or comfort.

## Follow-ups

- Keep the current score rain/daylight-led.
- Update tests to make this priority explicit where score behavior is asserted.
- If apparent temperature, wind, gusts, sunshine, or radiation are added to the
  score, add them as secondary modifiers with documented weights.
- Prefer separate explanatory copy for notable secondary conditions over making
  the main score feel activity-specific.
