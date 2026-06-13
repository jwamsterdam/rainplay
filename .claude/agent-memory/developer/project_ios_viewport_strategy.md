---
name: ios-viewport-strategy
description: Settled iOS viewport fill DECOUPLES background (fixed ::before at 100lvh) from content (.app-shell min-height 100svh); one element can't serve both heights
metadata:
  type: project
---

The iOS viewport-fill bug was structural, not a wrong unit. `.app-shell` was doing TWO jobs with two different correct heights: paint the physical-screen background (wants 852 = the full screen incl. home-indicator band) AND bound the flex content/attribution (wants 793 = the stable usable area). No single unit on one element satisfies both — that is what drove 5+ flip-flops (dvh↔svh↔lvh↔position:fixed↔JS innerHeight). **Fix: split the two jobs onto two layers.**

Settled structure in src/styles.css:
- `.app-shell`: `position:relative; z-index:0; min-height:100vh; min-height:100svh; overflow:hidden;` — bounds CONTENT to the stable small viewport (793). Background removed from here.
- `.app-shell::before`: `position:fixed; inset:0; z-index:0; height:100vh; height:100lvh;` carrying the sky image + `--color-surface-solid` fallback — fills the FULL physical screen (852). `lvh` is the ONLY unit that is both full-physical AND stable: decisive iPhone 15 cold-launch capture showed at first paint innerH/dvh/lvh/visualVP all = 852 while svh = 793; at rest only lvh stays 852 (dvh/innerHeight go 852→793 = the launch flicker). Has no content, so nothing clips.
- `.decision-sheet`: unchanged — `flex-shrink:0`, `z-index:2`, padding-bottom `max(10px, calc(env(safe-area-inset-bottom) - var(--sheet-safe-trim)))` with `--sheet-safe-trim:16px`. `.weather-hero` unchanged (`flex:1 1 auto`). Content (hero z-index auto, sheet z-index 2) paints above the z-index:0 ::before.
- Desktop `@media(min-width:720px)`: `.app-shell` keeps explicit `height:932px; min-height:932px`; ADD `.app-shell::before { position:absolute; height:100%; border-radius:34px; }` or the fixed sky paints across the whole desktop window.

**Do NOT** reintroduce: a single-unit fill on `.app-shell` (the trap), `dvh` on the outer fill (dynamic, flickers at cold launch), `position:fixed; inset:0` on the shell itself (regressed iPhone 15), or JS `--app-height` from `window.innerHeight` (deleted appHeight.ts; innerHeight is ALSO 852 at first paint = unreliable). Reserve `dvh` for internal proportions only (`clamp(…,40dvh,…)`, `calc(100dvh - 56px)`).

**How to verify:** Settings → "Diagnostiek" shows live probes + a cold-launch capture (src/lib/coldLaunchViewport.ts samples units at rAF/+500ms/visualViewport-resize) so first-paint transients are visible on-device. Before judging any layout change, confirm the version line matches the build you shipped — a backgrounded standalone PWA does not force-refresh, and an auto-update launch briefly shows the OLD build before the controllerchange reload (looks like a regression but isn't). Desktop Chrome hits the device-frame media query and cannot reproduce iOS viewport behaviour.
