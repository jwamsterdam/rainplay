---
name: ios-viewport-fill
description: iOS PWA viewport-fill saga; current verdict is floor the shell on STABLE svh (not dynamic dvh, not lvh, not position:fixed, not JS innerHeight) to kill cold-launch whitespace flicker
metadata:
  type: project
---

The `.app-shell` viewport-fill strategy has flip-flopped through many strategies. Settled findings, with the MEASURED reasons each was rejected (do not re-litigate without new on-device numbers):

- **`position:fixed; inset:0`** — tried, regressed iPhone 15. Rejected.
- **JS `--app-height` from `window.innerHeight`** (`src/lib/appHeight.ts`) — under-reports the home-indicator band on fullscreen standalone PWAs; attribution sat above the rounded corners. File DELETED. Do not reintroduce.
- **`lvh` (large viewport)** — REJECTED BY MEASUREMENT. On-device iPhone 15 standalone diagnostics: `lvh = 852` = full physical screen incl. browser chrome, while `innerHeight = dvh = svh = 793`. lvh over-filled by ~59px and CLIPPED REAL CONTENT (the Open-Meteo attribution), not empty space. This disproved the earlier "over-fill clip is invisible" theory — the clipped region had content.
- **`dvh` (dynamic viewport)** — shipped 2026-06-11 (commit 97cd68a) as a correct supersession of lvh, and is dimensionally right at rest (dvh==svh==793 on iPhone 15). BUT dvh is the *dynamic* unit: the UA may resolve it larger during the standalone cold-launch animation and reflow after first paint. This is the suspected cause of the recurring "too much bottom whitespace on COLD start, CORRECT after close+reopen" symptom (reported 2026-06-13, v0.1.75).

**Current architect verdict (2026-06-13): floor the shell on STABLE `svh`, not dynamic `dvh`.**
- `.app-shell` (and `html`/`body`/`#root`): `min-height:100vh` (legacy fallback first) then `min-height:100svh`. Do NOT end the cascade on `dvh` — that reintroduces the dynamic unit and the bug. svh never grows after first paint, so it cannot reflow during the launch animation. Since dvh==svh at rest on iPhone 15, svh is dimensionally identical AND immune to the timing flicker = strictly safer.
- `.decision-sheet` keeps the `-16px` home-indicator trim (`max(10px, calc(env(safe-area-inset-bottom) - 16px))`) — full inset leaves too much dead whitespace; the `max(10px,…)` guard keeps it safe. Lift `16px` to a documented `--sheet-safe-trim` token. (This supersedes the older "use the FULL inset, drop the trim" verdict, which was wrong — the trim fixed a real complaint, commit d7eac6a.)
- Reserve `dvh` for INTERNAL proportions that should track available space (`clamp(…,40dvh,…)` weather-hero floor, `calc(100dvh - 56px)`), NOT for the outer fill floor.
- Desktop `@media(min-width:720px)` 430x932 frame keeps its explicit height to override the mobile fill; its comment naming "lvh/svh" was stale — keep the comment honest about the actual base unit.

**SW vs CSS for the cold-start symptom:** SW path is already hardened (autoUpdate + skipWaiting + clientsClaim + cleanupOutdatedCaches + #75 controllerchange reload + App.tsx visibility-driven registration.update). User confirmed on v0.1.75, so the running layout code is already latest → stale-SW is NOT the remaining cause → dvh-timing is. The svh switch is safe regardless of which hypothesis holds (identical at rest), so it does not gate on proving the cause.

**How to apply:** before judging ANY layout change on device, confirm `__APP_VERSION__` (Settings → Diagnostiek, SettingsPanel.tsx ~line 161-194) matches the build you just shipped — backgrounded standalone PWAs do not force-refresh. The Diagnostiek readout samples ONCE at panel-open, too late to catch a first-paint transient; to CONFIRM (not just fix) the dvh-timing hypothesis, capture dvh/svh/innerHeight at rAF + ~500ms + next visualViewport resize and persist for later display. Desktop Chrome hits the device-frame media query and cannot reproduce any iOS viewport behaviour. Relates to [[user-profile]].
