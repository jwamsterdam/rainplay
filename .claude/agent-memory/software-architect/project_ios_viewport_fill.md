---
name: ios-viewport-fill
description: Full-viewport fill in iOS standalone PWA is unreliable with dvh/svh/lvh units; prefer position:fixed+inset:0
metadata:
  type: project
---

Filling the exact visual viewport of the installed PWA across iOS versions cannot be done reliably with `100dvh`/`svh`/`lvh`/`-webkit-fill-available`. On older iOS (iPhone 11 era) in `black-translucent` standalone, those units resolve against viewport metrics the WebView reports inconsistently, leaving a white band below the bottom sheet ("content too high") while iPhone 15 / newer iOS renders fine from the same build.

**Why:** Recurring theme — the layout has been iterated multiple times (see commits trimming sheet padding, 100dvh, standalone viewport fill) and the dvh approach kept regressing on the older device.

**How to apply:** For the single-screen `.app-shell` (overflow hidden, no scroll), recommend `position: fixed; inset: 0` to anchor to the real layout viewport and sidestep unit discrepancies. Critical detail: the `@media (min-width: 720px)` desktop device-frame branch must explicitly reset `position: relative; inset: auto` plus its fixed width/height/margin, or the 430x932 frame jumps to the top-left. A JS `--app-height` shim (visualViewport.height on resize) is the runner-up only if fixed still gaps on real hardware. Only real iPhone 11 + 15 standalone can confirm the gap is gone. Relates to [[user-profile]] (iPhone-first PWA).
