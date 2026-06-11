---
name: ios-viewport-strategy
description: Settled .app-shell viewport-fill strategy is over-fill-and-clip (min-height 100svh + height 100lvh), after a long flip-flop; do not reintroduce dvh/position:fixed/JS innerHeight
metadata:
  type: project
---

The `.app-shell` viewport-fill strategy in src/styles.css is **over-fill-and-clip**:
`min-height: 100vh; min-height: 100svh; height: 100lvh;` with the existing `overflow: hidden` clipping any overflow. `.decision-sheet` padding-bottom uses the FULL `max(16px, env(safe-area-inset-bottom))`. html/body/#root use `min-height: 100svh` (100vh fallback).

**Why:** under-fill exposes the iOS system background below the sheet (the actual bug on iPhone 15 PWA); over-fill is invisible because it's clipped. This strategy was reached only after dvh, position:fixed+inset:0, and a JS `--app-height` from `window.innerHeight` (the deleted src/lib/appHeight.ts) each regressed a device/state. Do NOT reintroduce any of those.

**How to apply:** the desktop `@media (min-width: 720px)` block sets explicit `height: 932px; min-height: 932px` on `.app-shell` and MUST override the mobile fill (same specificity, later in source order — keep it after the base rule). Before judging any iOS layout change on device, confirm the version line in the Settings "Diagnostiek" block matches the build you shipped — a stale service worker masquerades as a device difference. The diagnostic block (SettingsPanel.tsx) reads live innerHeight/screenHeight/visualViewport and dvh/svh/lvh + safe-area probes; it's intentionally shippable so the user can report real device values.
