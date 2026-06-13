---
name: ios-viewport-fill
description: iOS PWA viewport-fill saga; FINAL 2026-06-13 — use PERCENTAGE recipe, NOT viewport units. On iOS 26 cold start EVERY viewport unit (svh/dvh/lvh/innerHeight/visualViewport) reads full-physical 852 at first paint. No viewport unit is stable. % resolves from containing block at first paint = the only reliable fill.
metadata:
  type: project
---

The `.app-shell` viewport-fill flip-flopped through MANY single-unit strategies
(svh floor, lvh fixed background layer, dvh, JS innerHeight, position:fixed). ALL
of them were wrong because they assumed SOME viewport unit is stable at cold
launch. NEW decisive data proves none are. **Final answer = drop viewport units
from the outer fill entirely; use a percentage chain.**

**DECISIVE on-device cold-launch capture #2 (v0.1.84, iPhone 15, iOS 26, FRESH
install, cold start), via coldLaunchViewport.ts:**
- vp-resize +2ms (FIRST PAINT): iH 852 · dvh 852 · svh 852 · lvh 852 · visualVP 852
- rAF +3ms: iH 852 · dvh 852 · svh 852 · lvh 852 · visualVP 852  (ALL units 852, INCL svh)
- +500ms: iH 793 · dvh 793 · svh 793 · lvh 852 · visualVP 793  (settles)
- At rest: innerH 793 · svh 793 · dvh 793 · lvh 852 · safe-top 59 · safe-bottom 34 · screenH 852
- **This DEMOLISHES the earlier "svh is stable 793" premise.** Capture #1 had svh=793
  at first paint; capture #2 has svh=852 at first paint settling to 793 at +500ms.
  So svh is NOT reliably stable at cold launch — it depends on whether a geometry
  event already fired. CONCLUSION: no CSS viewport unit is reliable at iOS-26 PWA
  cold launch. Confirmed bug: 100dvh isn't initialized on PWA cold start until the
  viewport is exercised by a geometry change (e.g. rotation) the app CANNOT trigger
  programmatically. The 852->793 settle IS that uninitialized-then-recomputed event.

**FINAL STRUCTURE (2026-06-13) — PERCENTAGE recipe, verdict NON-BLOCKING:**
1. **Fill = `%` chain, NOT viewport units.** `%` resolves from the containing block,
   which the layout engine computes correctly at FIRST paint (unlike the dynamic
   viewport machinery). Chain MUST be unbroken — every ancestor needs a definite
   height or the fill collapses (classic gotcha):
   - `html { height:100%; min-height:calc(100% + env(safe-area-inset-top)); overflow:hidden; }`
     The `min-height: 100% + safe-area-inset-top` is the canonical
     black-translucent + viewport-fit=cover recipe that PREVENTS the bottom white bar.
   - `body { height:100%; overflow:hidden; margin:0; }` (NO background — sky shows through)
   - `#root { height:100%; overflow:hidden; }`
   - `.app-shell { height:100%; overflow:hidden; background:transparent; display:flex; flex-direction:column; }`
2. **Sky background = on `html`** with `background:var(--color-surface-solid)
   url(/assets/weather-hero.png); background-size:cover; center top;
   background-attachment:fixed;`. Spans the full padded canvas incl. under status
   bar and into home-indicator band. **`.app-shell::before` is DELETED** (the
   fixed-lvh layer caused the v0.1.84 "content too high + white-bar-on-scroll"
   regression — fixed lvh=852 overlapped scrolling content).
3. **Safe-area: ONE owner per inset (no double-pad):**
   - TOP inset -> `html` padding-top (NEW owner). REMOVED from `.weather-hero`
     (now plain `padding: 12px ...`) and from `.settings-gear-button` (now `top:14px`).
   - BOTTOM inset -> `.decision-sheet` padding-bottom ONLY. NOT applied on html.
   - right/left insets -> html padding (landscape notch guard).
4. `.decision-sheet` KEEP `--sheet-safe-trim:16px` and
   `padding-bottom:max(10px, calc(env(safe-area-inset-bottom) - var(--sheet-safe-trim)))`.
   Physical bottom band now filled by the html sky (behind the transparent shell).
5. **NO SCROLL anywhere**: overflow:hidden on html+body+#root+.app-shell kills the
   white-bar-on-scroll symptom. `.weather-hero flex:1 1 auto`, `.decision-sheet
   flex-shrink:0` unchanged.
6. **Status-bar style: KEEP `black-translucent`.** The % recipe is the canonical
   companion to black-translucent + viewport-fit=cover and solves the cold-start
   quirk, so no need to retreat to `default`/`black` (which would add a themed
   status-bar band and lose the immersive sky-under-clock north-star look). index.html
   meta tags UNCHANGED.
7. **Desktop `@media(min-width:720px)`:** neutralise the mobile recipe so the html
   sky doesn't paint the whole browser window: `html { min-height:100%; padding:0;
   background:none; }`. Move the sky onto `.app-shell` (since ::before is gone),
   clipped to the rounded frame by overflow:hidden. `.app-shell { height:932px }`
   still overrides the mobile `height:100%` (later source order).

**Why this is final:** the fill no longer depends on ANY viewport unit, so the
852->793 cold-start reflow cannot affect it. `%` is computed correctly at first
paint. There is no remaining axis to flip on.

**Reserve `dvh` for INTERNAL proportions only** (`clamp(...,40dvh,...)` hero floor,
`calc(100dvh - 56px)` desktop settings, `80dvh` settings sheet) — NEVER for the
outer fill floor. These internal uses are unaffected by this change.

**Rejected / superseded (do not re-litigate without NEW on-device numbers):**
- `svh` floor on the shell — svh is NOT stable at cold launch (capture #2: 852->793).
- `lvh` fixed `::before` background layer — caused content-too-high + white-bar-on-scroll.
- `dvh` / `innerHeight` on the fill floor — dynamic, reflow 852->793 = the flicker.
- `position:fixed; inset:0` on the shell — regressed iPhone 15.
- JS `--app-height` from innerHeight (appHeight.ts, DELETED) — unreliable.
- ALL single-viewport-unit strategies — the premise (some unit is stable) is false.

**How to apply:** before judging ANY layout change on device, confirm
`__APP_VERSION__` (Settings -> Diagnostiek, SettingsPanel.tsx) matches the shipped
build — backgrounded standalone PWAs don't force-refresh. Desktop Chrome hits the
device-frame media query and CANNOT reproduce iOS viewport behaviour.
coldLaunchViewport.ts captures the first-paint transient. The `%` chain breaks if
anyone inserts an ancestor without `height:100%`. Relates to [[user-profile]].
