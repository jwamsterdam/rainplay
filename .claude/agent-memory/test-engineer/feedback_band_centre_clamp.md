---
name: band-centre-clamp
description: nowFraction / sky-gradient use a band-centre model ((i+0.5)/n); the clamp boundary is half a band, not the point itself
metadata:
  type: feedback
---

The chart's horizontal position math (`nowFraction` in src/lib/nowMarker.ts, and the
sky gradient in src/lib/chart.ts) uses a BAND-CENTRE model: point i's centre sits at
fraction `(i + 0.5)/n`, interpolated between bracketing points as `(i + 0.5 + t)/n`.

**Why:** the chart lays out n points as n equal bands; a point owns its whole band, and
its visual centre is the band centre, not the band's left edge.

**How to apply:** when writing/auditing tests for marker-position logic, do NOT assume
`now == firstPoint` → fraction 0, or that `now` slightly before the first point hard-clamps
to 0. The +0.5 offset means:
- `now == firstPoint` → `0.5/n` (NOT 0); `now == lastPoint` → `(n-0.5)/n` (NOT 1).
- A `now` LESS than half a band before the first point → a small POSITIVE interior
  fraction, not a clamped 0. The hard left-clamp only kicks in past half a band.
  (Concrete: in the +6 uur window with 30-min cadence, now 14 min before the 11:00
  centre gave ~0.0042, not 0. In the +2 uur window with 15-min cadence, now 14 min
  before 11:00 is >half a band, so it DID clamp to 0.)
Assert the renderable CONTRACT (non-null, within [0,1], near the expected edge), not an
over-specified exact 0/1, unless you've traced that the input is genuinely past the half-band
clamp boundary. See [[chart-logic-in-lib]] for why this logic is pure + clock-injected.
