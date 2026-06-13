---
name: ios-viewport-fill
description: iOS PWA viewport-fill saga; SETTLED 2026-06-13 — DECOUPLE background-fill (fixed lvh layer = 852) from content-bound (svh shell = 793). One unit cannot serve both; this retires the flip-flop.
metadata:
  type: project
---

The `.app-shell` viewport-fill flip-flopped through MANY single-unit strategies. The
root error was structural, not unit-choice: `.app-shell` did TWO jobs with TWO
different correct heights — (a) paint the physical-screen background, which wants the
FULL physical height, and (b) bound the flex content (hero + sheet, esp. the Open-Meteo
attribution at the sheet bottom), which wants the SAFE height. No single unit on one
element satisfies both. Every prior flip asked "which unit on .app-shell?" — unanswerable.

**DECISIVE on-device cold-launch capture (iPhone 15, iOS 26, clean reinstall, no
auto-update reload), src/lib/coldLaunchViewport.ts sampling rAF / +500ms / vp-resize:**
- rAF +3ms (FIRST PAINT): innerH 852 · dvh 852 · svh 793 · lvh 852 · visualVP 852
- vp-resize +20ms (settles): innerH 793 · dvh 793 · svh 793 · lvh 852 · visualVP 793
- +500ms: innerH 793 · dvh 793 · svh 793 · lvh 852 · visualVP 793
- At rest: innerH 793 · svh 793 · lvh 852 · safe-top 59 · safe-bottom 34 · screenH 852
- Read: at first paint EVERY unit reports 852 EXCEPT svh (stays 793). At rest only lvh
  stays 852. So: **lvh = 852 is the ONLY unit that is both full-physical AND stable
  across first-paint and rest.** dvh/innerHeight are 852→793 (reflow = the launch
  flicker). svh = 793 stable but 59px SHORT of physical → the persistent bottom gap.

**SETTLED STRUCTURE (2026-06-13) — verdict NON-BLOCKING, decouple the two jobs:**
1. **Background = fixed full-physical layer on `.app-shell::before`**:
   `position:fixed; inset:0; z-index:0; height:100vh; height:100lvh;` carrying the
   sky image + `--color-surface-solid` fallback (`background-size:cover; center top`),
   `pointer-events:none`. lvh=852 over-fills into the home-indicator band — HARMLESS
   here because the layer holds NO content to clip. This is why the OLD lvh rejection
   (lvh clipped the attribution) does NOT apply: back then lvh sized the shell that
   ALSO carried content. Content-free lvh fill is safe.
2. **Content = `.app-shell` flex column bounded to STABLE svh**: keep
   `min-height:100vh; min-height:100svh;` (svh=793, never reflows), `display:flex;
   flex-direction:column; overflow:hidden;` add `z-index:0` to form a stacking context
   above `::before`. REMOVE the `background` from `.app-shell` (now on `::before`).
3. `.weather-hero` flex `1 1 auto` — NO CHANGE (absorbs slack between svh shell and
   fixed sheet). `.decision-sheet flex-shrink:0` — NO CHANGE.
4. `.decision-sheet` KEEP `--sheet-safe-trim:16px` and
   `padding-bottom:max(10px, calc(env(safe-area-inset-bottom) - var(--sheet-safe-trim)))`
   (validated commit d7eac6a; do NOT revert to full inset — regresses dead whitespace).
   Update the line ~393 comment: physical bottom is now filled by `.app-shell::before`,
   not the shell.
5. **Desktop `@media(min-width:720px)` REQUIRED addition**: the fixed full-window
   `::before` would paint sky across the whole desktop window, not the 430x932 frame.
   Re-anchor it inside the frame: `.app-shell::before { position:absolute; height:100%;
   border-radius:34px; }` (shell already `overflow:hidden` → clipped to rounded frame).
   The existing `.app-shell { height:932px; min-height:932px }` still overrides the
   mobile svh floor (same specificity, later source order). Good.

**Why no 6th flip:** neither layer uses a DYNAMIC unit (lvh and svh are both stable;
dvh/innerHeight banned for the fill floor — they reflow), so nothing can jump during
the launch animation. Background uses its stable full number, content uses its stable
safe number. There is no remaining axis to flip on.

**Reserve `dvh` for INTERNAL proportions only** (`clamp(…,40dvh,…)` hero floor,
`calc(100dvh - 56px)` desktop settings) — NEVER for the outer fill floor.

**Rejected earlier (do not re-litigate without NEW on-device numbers):**
- `position:fixed; inset:0` ON THE SHELL — regressed iPhone 15. (Note: fixed is now
  used ONLY for the content-free `::before` background layer, which is fine.)
- JS `--app-height` from innerHeight (src/lib/appHeight.ts, DELETED) — innerHeight is
  852 at first paint then 793 = unreliable; under-reported home-indicator band.
- `lvh` ON THE SHELL (with content) — clipped the attribution. Superseded: lvh is now
  correct for the CONTENT-FREE background layer only.
- `dvh` ON THE FILL FLOOR — dynamic, reflows 852→793 mid-launch = the flicker.

**How to apply:** before judging ANY layout change on device, confirm `__APP_VERSION__`
(Settings → Diagnostiek, SettingsPanel.tsx ~161-194) matches the shipped build —
backgrounded standalone PWAs don't force-refresh. Desktop Chrome hits the device-frame
media query and CANNOT reproduce iOS viewport behaviour. coldLaunchViewport.ts captures
the first-paint transient (panel-open readout is too late). Relates to [[user-profile]].
