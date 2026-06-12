---
name: geocoding-test-pattern
description: searchLocations test structure — signal forwarding, trim short-circuit, coordinate rounding, missing-country tolerance
metadata:
  type: feedback
---

`geocoding.ts` follows the same fetch-boundary contract as `openMeteo.ts` and should be tested the same way: stub `fetch` globally, never mock internal functions.

Key cases that matter:
- Short query (< MIN_QUERY_LENGTH after trim) must skip the network call entirely.
- Whitespace-padded strings count as trimmed, so " a" is still too short.
- `signal` is forwarded as the second argument to `fetch`; assert `passedInit?.signal === controller.signal`.
- When caller supplies no signal, `passedInit?.signal` is `undefined` (not an AbortSignal).
- Coordinate rounding: raw API gives many decimals; the mapper rounds to 4dp — assert the rounded value, not the raw one.
- `country` is optional in the API; test a result without it to guard against accidental required-field coercion.

**Why:** geocoding is low-cohesion (community 0.07), meaning it drifts independently from the rest of the system — regressions in the normalization shape or the short-circuit guard are unlikely to be caught by any other test.

**How to apply:** any future change to `geocoding.ts` should be reflected in `src/api/geocoding.test.ts` using the same fetch-stub pattern, not mocking `searchLocations` itself.
