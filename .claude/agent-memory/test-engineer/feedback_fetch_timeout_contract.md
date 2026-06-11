---
name: fetch-timeout-contract
description: Pattern for testing the "fetch with no timeout hangs forever → query stuck pending" class of bug in this repo
metadata:
  type: feedback
---

When a `queryFn` calls `await fetch(url)` with no AbortController/timeout, a stalled
mobile radio can leave the promise never-settling. TanStack Query then stays `pending`
forever and `retry` never fires (retry only happens on rejection, not on a hang). The UI
sits on its loading state with no recovery path.

**Why:** Hit in Rainplay's `fetchOpenMeteoForecast` (src/api/openMeteo.ts) — chart stuck on
"Weer laden" forever on a real iPhone PWA cold-start. `retry: 1` and `isError` never engage
because nothing ever rejects.

**How to apply:** Test the abort contract deterministically with fake timers + an
"abort-aware hanging fetch" (a fetch that only rejects when its AbortSignal fires; hangs if
no signal is passed — which catches the current bug). Assert the call rejects within the
timeout and that an AbortSignal is passed. Write these as `it.fails(...)` while the prod fix
is pending so the suite stays green but flips loudly once a fix is attempted; the developer
must remove `.fails` when the AbortController lands. See src/api/openMeteo.test.ts for the
template. Recommended timeout: 8000–12000 ms as a named constant.
