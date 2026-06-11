---
name: ios-viewport-fill
description: iOS PWA viewport-fill flip-flopped through every strategy; current verdict is over-fill+clip (lvh/svh), NOT position:fixed and NOT JS innerHeight
metadata:
  type: project
---

The `.app-shell` viewport-fill strategy has flip-flopped many times: 100dvh (good iPhone15 / too-high iPhone11) -> 100svh (under-filled iPhone15) -> 100dvh -> position:fixed+inset:0 (regressed iPhone15) -> JS `--app-height` from `window.innerHeight` (under-fills home-indicator band on iPhone15, attribution sits above the rounded corners). Each fix regressed another device/state.

NOTE: an earlier version of this memory recommended `position:fixed; inset:0`. That was tried (commit history step 4) and regressed iPhone 15. Superseded.

Current architect verdict (2026-06-11): **over-fill-and-clip**, not position:fixed, not JS height.
- `.app-shell { min-height:100svh; height:100lvh }` (100vh legacy fallback first), clipped by existing `overflow:hidden`. `lvh` reaches into the rounded corners on all iOS 16-18 states; `svh` floor keeps content reachable.
- `.decision-sheet` uses the FULL `env(safe-area-inset-bottom)` (drop the `-8px` trim) so attribution clears the home indicator with no per-device tuning.
- Delete `src/lib/appHeight.ts` + its `initAppHeight()` call — `innerHeight` under-reports the home-indicator band on fullscreen standalone PWAs.

**Why:** over-fill clipped is invisible; under-fill exposes the system background (the actual bug). The desktop `@media(min-width:720px)` 430x932 frame still needs its explicit height to override the mobile fill.

**How to apply:** before judging ANY layout change on device, confirm `__APP_VERSION__` (Settings, SettingsPanel.tsx ~line 218) is the build you just shipped — `autoUpdate`+`skipWaiting` does NOT force-refresh a backgrounded standalone PWA, so stale SW builds masquerade as device differences (the old "iPhone 11 too high" is suspected stale-SW, never confirmed). Desktop Chrome hits the device-frame media query and cannot reproduce any of this — add a gated on-device diagnostic readout in Settings (innerHeight, screen.height, visualViewport, dvh/svh/lvh probes, safe-area-inset-bottom, display-mode, version). Relates to [[user-profile]].
