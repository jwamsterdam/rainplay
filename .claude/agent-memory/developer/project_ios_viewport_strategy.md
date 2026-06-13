---
name: ios-viewport-strategy
description: iOS viewport fill uses the percentage + safe-area recipe (NOT viewport units) — html owns top/side insets and carries a fixed sky; viewport units are unreliable at iOS 26 cold launch
metadata:
  type: project
---

The iOS standalone-PWA viewport-fill bug went through many iterations. The CURRENT settled answer (architect-locked, implemented in src/styles.css) ABANDONS viewport units for the outer fill and uses the canonical **percentage + safe-area recipe** — the documented companion to `apple-mobile-web-app-status-bar-style="black-translucent"` + `viewport-fit=cover`.

**Why viewport units were abandoned:** on iOS 26 standalone PWAs, NO CSS viewport unit (svh/dvh/lvh) nor JS (innerHeight/visualViewport) is reliable at cold launch. On-device capture showed ALL of them read the FULL physical height (e.g. 852) at first paint and only settle to the usable area (e.g. 793) after an untriggerable geometry event. `%` resolves correctly from the containing block at first paint, so the outer chain is now percentage-based.

**Settled structure in src/styles.css (mobile):**
- `html`: OWNS the top + side safe-area insets and CARRIES the sky.
  `height:100%; min-height: 100%; padding: env(safe-area-inset-top) env(safe-area-inset-right) 0 env(safe-area-inset-left); overflow:hidden;` plus the sky as a `background-attachment: fixed` image (`var(--color-surface-solid) url("/assets/weather-hero.png") center top / cover no-repeat`). The bottom inset is owned by `.decision-sheet`. NOTE: `min-height` is plain `100%`, NOT `calc(100% + env(safe-area-inset-top))` — the canonical recipe's `+inset` over-extends the content by ~59px and pushes the attribution off the physical bottom edge (on-device iPhone 15: text cut off at the home screen). No bottom white bar results because the FIXED sky fills the whole screen behind the content regardless of content height, so the `+inset` overfill is unnecessary here. With border-box, the `padding-top` shrinks the content box to the usable area so the sheet bottom lands exactly on the physical bottom.
- `body`: `margin:0; min-width:320px; height:100%; overflow:hidden; background: var(--color-surface-solid);`
- `#root`: `height:100%;`
- `.app-shell`: `position:relative; display:flex; flex-direction:column; height:100%; overflow:hidden; background:transparent;` — no sky here anymore (it's on html), no z-index, no viewport units.
- `.weather-hero` padding top is plain `12px` (NOT `max(12px, env(safe-area-inset-top))`) and `.settings-gear-button` top is plain `14px` — html owns the top inset, so re-adding it here double-pads (content sits ~59px too low).
- `.decision-sheet`: unchanged — keeps `--sheet-safe-trim:16px` and `padding-bottom: max(10px, calc(env(safe-area-inset-bottom) - var(--sheet-safe-trim)))`; it owns the BOTTOM inset.

**box-sizing gotcha (verify if you touch the chain):** `* { box-sizing:border-box }` is set. With `html` padded by the top inset, `body { height:100% }` resolves against html's CONTENT box. The `min-height: calc(100% + inset)` grows html so its content box equals the full physical height (not the short usable area), so the chain does NOT collapse. If you ever see `.app-shell` compute to ~0 or far short of the viewport, the fix is `min-height:100%` instead of `height:100%` on body/#root, or `flex:1` on .app-shell.

**Desktop `@media (min-width:720px)`:** NEUTRALISE the html recipe — `html { min-height:100%; padding:0; background:none; }` — and move the sky onto the device-frame `.app-shell` (`background: var(--color-surface-solid) url("/assets/weather-hero.png") center top / cover no-repeat;`) which keeps explicit `width:430px; height:932px; min-height:932px`. Otherwise the fixed html sky would paint across the whole desktop window.

**Do NOT** reintroduce: `.app-shell::before` fixed sky layer (deleted — caused a white-bar-on-scroll), svh/lvh/dvh on the OUTER fill, `position:fixed; inset:0` on the shell, or JS `--app-height` from `window.innerHeight`. Reserve `dvh` for INTERNAL proportions only (e.g. settings-sheet `max-height: calc(100dvh - 56px)`, hero clamps). index.html keeps `black-translucent` + `viewport-fit=cover` and must NOT change.

**How to verify:** Settings → "Diagnostiek" shows live probes + a cold-launch capture. Confirm the version line matches the shipped build before judging layout (a backgrounded standalone PWA shows the OLD build briefly on auto-update). Desktop Chrome hits the device-frame media query and cannot reproduce iOS viewport behaviour. To check the % chain locally, measure `getBoundingClientRect()` on html/body/#root/.app-shell at a mobile viewport and confirm a full, non-collapsed height with the sheet flush at the bottom.
