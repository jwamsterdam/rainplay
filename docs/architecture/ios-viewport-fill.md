# iOS PWA viewport fill — how the app fills the screen on iOS 26

Status: **Accepted / shipped** (v0.1.88, 2026-06-13)
Scope: `src/styles.css` (the `html` / `body` / `#root` / `.app-shell` chain), `index.html` meta tags, `src/lib/coldLaunchViewport.ts`, the Settings "Diagnostiek" block in `src/components/SettingsPanel.tsx`.

> Read this in full before touching any height/viewport CSS. This problem cost
> ~8 flip-flop iterations because each "obvious" fix regressed another device
> state. The final solution is simple; the reasons the alternatives fail are not.
> If you are an AI agent refactoring this code: **do not change the strategy
> below without reproducing the failure on a real iOS 26 iPhone first.** Desktop
> Chrome cannot reproduce any of this.

---

## 1. The product requirement

Rainplay is a standalone iPhone PWA (added to the Home Screen, launched
full-screen). On screen it must, on every cold launch and at rest:

1. Fill the **entire physical screen** with the sky background — no white/blank
   bar at the bottom (behind the home indicator) or top (behind the Dynamic
   Island / status bar).
2. Keep all **content** inside the safe area: the header clears the status bar,
   and the bottom row + the `Weather data by Open-Meteo` attribution sit just
   above the home indicator and are **never clipped off the bottom edge**.
3. **Never scroll.** It is a single fixed screen.

The reference device during development was an **iPhone 15 on iOS 26**:
physical screen height **852**, `safe-area-inset-top` **59** (Dynamic Island),
`safe-area-inset-bottom` **34** (home indicator), usable height **793**.

---

## 2. The root cause: no height reference is stable on iOS 26

On an iOS 26 standalone PWA, **every height reference flickers** between the
full physical height (852) and the usable height (793) around cold launch, and
none of them is reliable at first paint:

- `100svh`, `100dvh`, `100lvh`, `window.innerHeight`, `window.visualViewport.height`
  and even CSS `%` (which resolves from the initial containing block) were all
  measured reading **852 at first paint** and only settling to 793 after an
  **untriggerable geometry event** (~14–500 ms later, or never until a rotation).
- A second capture on a different launch read `svh = 793` at first paint — i.e.
  the same unit is **not even self-consistent** between launches.
- At rest the diagnostics showed `innerHeight = dvh = lvh = visualViewport = 852`
  while `documentElement.clientHeight = 793` and `svh = 793` — so a `%`-based or
  unit-based height resolves to **793 while the screen is physically 852**,
  leaving the bottom ~59 px showing whatever is behind the content.

This is a documented iOS 26 regression: "the layout engine has not computed the
dynamic viewport values until the viewport has been *exercised* through a
geometry change (rotation), which you cannot trigger programmatically." The
`black-translucent` status bar (which we keep, see §6) makes the WebView the
full 852 and overlays the chrome, which is the source of the 852↔793 ambiguity.

**Conclusion: do not size the fill with any height value.** Pin to the viewport
edges instead.

---

## 3. The solution (what is shipped)

Two decoupled layers:

1. **The sky** is a fixed, full-screen background on `html`. `background-attachment: fixed` + `background-size: cover` sizes it to the viewport and fixes it to the screen, so it covers the physical screen regardless of any element's box height. It carries no content, so it can never clip anything.
2. **The content** lives in `.app-shell`, pinned with **`position: fixed; inset: 0`** — the *same* mechanism as the settings overlay, which always rendered correctly. `inset: 0` (top/right/bottom/left = 0) stretches the element to all four edges of the viewport **with no height unit at all**, so it tracks the 793↔852 flicker instead of fighting it. The shell is transparent; the sky shows through behind it.

Safe-area insets are applied **per element**, because the fixed shell is pinned
to the raw viewport (it does not inherit any padding from `html`):

- top inset → `.weather-hero` `padding-top` and `.settings-gear-button` `top`
- bottom inset → `.decision-sheet` `padding-bottom`

### 3.1 Exact CSS (mobile / base)

```css
html {
  height: 100%;
  /* Keeps the html box tall enough that the fixed sky reaches the physical
     bottom (no white bar). With the fixed shell this is belt-and-suspenders,
     but harmless and defensive. */
  min-height: calc(100% + env(safe-area-inset-top));
  padding: 0;            /* content is the fixed .app-shell, not html's box */
  overflow: hidden;      /* never scroll */
  background: var(--color-surface-solid) url("/assets/weather-hero.png");
  background-position: center top;
  background-size: cover;
  background-repeat: no-repeat;
  background-attachment: fixed;   /* sky fills the viewport, fixed to the screen */
}

body {
  margin: 0;
  min-width: 320px;
  height: 100%;
  overflow: hidden;
  background: transparent;        /* transparent so html's sky shows through */
}

#root { height: 100%; }

.app-shell {
  position: fixed;                /* THE fix: pin to the viewport, no height unit */
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.weather-hero {
  flex: 1 1 auto;                 /* absorbs the slack between hero and sheet */
  /* the shell is pinned to the viewport top, so clear the status bar here */
  padding: max(12px, env(safe-area-inset-top)) var(--space-5) clamp(18px, 3dvh, 44px);
}

.settings-gear-button {
  position: absolute;
  top: max(14px, env(safe-area-inset-top));   /* clear the status bar */
}

.decision-sheet {
  flex-shrink: 0;                 /* fixed height, anchored to the bottom */
  /* owns the bottom inset; --sheet-safe-trim (16px) trims dead space while still
     clearing the home indicator */
  padding: 14px 10px max(10px, calc(env(safe-area-inset-bottom) - var(--sheet-safe-trim)));
}
```

`--sheet-safe-trim: 16px` lives in `:root` in `src/styles.css`.

### 3.2 Desktop override (`@media (min-width: 720px)`)

On desktop the app renders as a centred 430×932 "device frame". The fixed shell
and fixed sky must be neutralised or they paint across the whole window:

```css
@media (min-width: 720px) {
  html { min-height: 100%; padding: 0; background: none; }   /* drop the fixed sky */
  body { display: grid; place-items: start center; background: /* page bg */; }
  .app-shell {
    position: relative;            /* override the mobile position:fixed */
    inset: auto;
    width: 430px;
    height: 932px;
    min-height: 932px;
    margin: 28px 0;
    overflow: hidden;
    border-radius: 34px;
    /* the sky lives on the framed shell here, inside the rounded frame */
    background: var(--color-surface-solid) url("/assets/weather-hero.png") center top / cover no-repeat;
  }
}
```

### 3.3 DOM structure it relies on

```
html  (fixed sky background)
└─ body (transparent)
   └─ #root
      └─ .app-shell            position:fixed; inset:0; flex column
         ├─ .weather-hero      flex:1 1 auto; padding-top = top inset
         │  └─ .settings-gear-button  top = top inset
         └─ .decision-sheet    flex-shrink:0; padding-bottom = bottom inset
      └─ .settings-overlay     position:fixed; inset:0; z-index:100 (when open)
```

---

## 4. What was tried and why it failed (do not repeat)

Each row regressed a real device state. Listed so a future refactor does not
re-discover them.

| Attempt | Symptom it caused |
| --- | --- |
| `height: 100vh` | iOS treats it like `lvh` → too tall, content clipped under the toolbar. |
| `height: 100dvh` | Dynamic unit; resolves larger during the cold-launch animation, then reflows → "too much bottom whitespace on cold start, correct after reopen". |
| `height: 100svh` (stable-floor theory) | svh was 793 in one capture but **852 in the next** at first paint → still flickered; 59 px short → bottom gap. |
| `height: 100lvh` on the shell | Fills 852 but the flex-anchored sheet bottom lands below the fold → **attribution clipped**. |
| `position: fixed; inset: 0` + `::before { height:100lvh }` sky on the shell | The fixed sky tied to scrollable content produced a **white bar the text scrolled behind**. |
| JS `--app-height` from `window.innerHeight` (`src/lib/appHeight.ts`, deleted) | innerHeight under-reports the home-indicator band AND is 852 at first paint → unreliable. |
| Percentage recipe: `html { min-height: calc(100% + env(safe-area-inset-top)); padding: <insets> }` + content sized by `%` | `%` resolved to clientHeight (793) while the screen was 852 → bottom rows + attribution sat above the physical bottom, **background image showed below the sheet**. `+inset` variant pushed content 59 px **off the bottom** (attribution cut off); plain `100%` variant brought the **white bar** back. No single padding value won because `%` flickers. |

The decisive observation that ended the saga: **the settings overlay
(`position:fixed; inset:0`) always rendered correctly** while the homepage
(height-unit/`%` based) did not. The fix was to give the homepage shell the same
mechanism.

---

## 5. On-device diagnostics (keep these — they are the only way to see the bug)

Desktop Chrome hits the device-frame media query and **cannot reproduce** any
iOS viewport behaviour. To debug on a real iPhone the app ships a gated readout:

- `src/lib/coldLaunchViewport.ts` — `initColdLaunchViewport()` (called from
  `src/main.tsx` as early as possible) snapshots `innerHeight / dvh / svh / lvh /
  visualViewport` at three moments around first paint (`rAF`, `+500 ms`, first
  `visualViewport` resize) and keeps them in memory. This is what caught "all
  units = 852 at first paint".
- The **Settings → "Diagnostiek"** block in `src/components/SettingsPanel.tsx`
  shows the live probes (innerHeight, screen, visualViewport, dvh/svh/lvh,
  safe-area insets, display-mode, `__APP_VERSION__`) plus the cold-launch
  capture rows.

When judging a layout change on device, **first confirm the version line matches
the build you shipped** — a backgrounded standalone PWA does not force-refresh,
and on an auto-update launch it briefly shows the OLD build before the
`controllerchange` reload (looks like a regression but is not). The build version
is `v{major}.{minor}.{git-commit-count}` (see `vite.config.ts`).

---

## 6. Hard rules for future refactors

- **Do NOT size the outer fill with any height value** — not `vh/svh/dvh/lvh`,
  not `%`, not JS `innerHeight/visualViewport`. They all flicker 793↔852 at iOS
  26 cold launch. Pin with `position: fixed; inset: 0`.
- **Keep the sky as a separate fixed background** behind the content. It must
  carry no content so it can never clip the attribution.
- **Apply safe-area insets per element** (hero/gear top, sheet bottom), because
  the fixed shell does not inherit padding from `html`.
- **Keep the desktop `@media (min-width: 720px)` override** that returns
  `.app-shell` to `position: relative; inset: auto` and moves the sky onto the
  framed shell — otherwise the fixed layers paint across the whole window.
- **`index.html` keeps** `apple-mobile-web-app-status-bar-style="black-translucent"`
  + `viewport-fit=cover`. Switching the status bar style is an option of last
  resort (it changes the immersive look) and was explicitly not taken.
- `dvh` is still fine for **internal proportions** (e.g. the settings sheet
  `max-height: calc(100dvh - 56px)`, hero `clamp(..., 40dvh, ...)`) — just never
  for the outer screen fill.
- **Verify on a real iPhone.** Confirm: sky fills top-to-bottom, attribution
  flush above the home indicator and not clipped, no scroll, header clears the
  status bar. The agent-memory note
  `.claude/agent-memory/developer/project_ios_viewport_strategy.md` mirrors these
  rules for the developer subagent.
