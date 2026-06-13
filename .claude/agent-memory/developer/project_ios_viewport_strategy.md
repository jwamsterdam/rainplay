---
name: ios-viewport-strategy
description: iOS viewport fill — .app-shell is position:fixed; inset:0 (no height unit), same as the settings overlay; the sky is a fixed background on html behind it. Viewport units AND % are unreliable at iOS 26 cold launch.
metadata:
  type: project
---

The iOS standalone-PWA viewport-fill bug went through MANY iterations (svh/dvh/lvh, the percentage + safe-area recipe, etc.). The CURRENT settled answer pins the content with `position:fixed; inset:0` and uses NO height unit at all.

**Why no height unit works:** on iOS 26 standalone PWAs, NO CSS viewport unit (svh/dvh/lvh) NOR `%` NOR JS (innerHeight/visualViewport) is reliable at cold launch. On-device capture showed they read the FULL physical height (852) at first paint and only settle to the usable area (793) after an untriggerable geometry event — and even at rest `%` resolves to clientHeight (793) while the screen is 852, so a `%`/unit-based content height leaves the bottom rows showing the background below the sheet. The decisive clue: the **settings overlay (`position:fixed; inset:0`) always rendered correctly** while the homepage (using a height unit) did not. `inset:0` pins to the real viewport edges with no height value, so it tracks 793↔852 instead of fighting it. So the homepage shell now uses the same mechanism.

**Settled structure in src/styles.css (mobile):**
- `html`: carries the fixed full-screen SKY behind everything. `height:100%; min-height: calc(100% + env(safe-area-inset-top)); padding:0; overflow:hidden;` + the sky as a `background-attachment: fixed` image (`var(--color-surface-solid) url("/assets/weather-hero.png") center top / cover no-repeat`). `background-attachment:fixed` + cover sizes the sky to the viewport so it fills the physical screen regardless of html's box height; the `min-height` calc keeps the html box tall enough that the sky reaches the bottom (no white bar). html has NO padding — the content does not live in html's box anymore.
- `body`: `margin:0; min-width:320px; height:100%; overflow:hidden; background: transparent;` (transparent so the html sky shows through). `#root`: `height:100%;`
- `.app-shell`: **`position:fixed; inset:0; display:flex; flex-direction:column; overflow:hidden; background:transparent;`** — pinned to the real viewport, no height unit. This is the key fix. The sky is the fixed html background behind it.
- `.weather-hero`: `padding: max(12px, env(safe-area-inset-top)) ...` — the shell is fixed to the viewport TOP, so the top status-bar/Dynamic-Island inset is applied here on the content.
- `.settings-gear-button`: `top: max(14px, env(safe-area-inset-top))` — same reason.
- `.decision-sheet`: `flex-shrink:0`; keeps `--sheet-safe-trim:16px` and `padding-bottom: max(10px, calc(env(safe-area-inset-bottom) - var(--sheet-safe-trim)))` — owns the BOTTOM home-indicator inset.

**Desktop `@media (min-width:720px)`:** override the mobile fixed shell back into flow — `.app-shell { position:relative; inset:auto; width:430px; height:932px; min-height:932px; ... ; background:<sky> }` (sky moves onto the framed shell). Also `html { min-height:100%; padding:0; background:none; }` so the fixed html sky does not paint across the whole desktop window. The 430×932 frame is centred via `body { display:grid; place-items:start center }` + the shell's `margin:28px 0`.

**Failed approaches — do NOT reintroduce:** svh/lvh/dvh or `%` on the outer fill (all flicker 793↔852 at cold launch); the canonical percentage + safe-area recipe with `html` owning the insets (the `%` resolved to clientHeight 793, leaving the bottom rows over the background — v0.1.85/86/87); a `.app-shell::before` fixed sky tied to scrollable content (white-bar-on-scroll); JS `--app-height` from innerHeight. Reserve `dvh` for INTERNAL proportions only (settings-sheet `max-height: calc(100dvh - 56px)`, hero clamps). index.html keeps `black-translucent` + `viewport-fit=cover` and must NOT change. (NOTE: an earlier version of this memory said "do NOT use position:fixed on the shell" — that is now WRONG; position:fixed; inset:0 is the SOLUTION. The old position:fixed regression was a different, pre-decoupled-sky configuration.)

**How to verify:** at a mobile viewport, `.app-shell` should compute to `position:fixed`, top 0, bottom = viewport, sheet flush at the bottom, no document scroll. Settings → "Diagnostiek" shows live probes + a cold-launch capture; confirm the version line matches the shipped build before judging (a backgrounded standalone PWA shows the OLD build briefly on auto-update). Desktop Chrome hits the device-frame media query and cannot reproduce iOS viewport behaviour.
