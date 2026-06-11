// Reliable viewport-height fill for iOS PWAs.
//
// CSS vh units (100vh/svh/dvh) and position:fixed all resolve the standalone
// PWA viewport inconsistently across iOS versions — some under-fill the
// home-indicator band (content too high), others over-fill. `window.innerHeight`
// reports the real usable height on every iOS version, so we mirror it into a
// `--app-height` custom property that .app-shell uses (with a 100dvh fallback).

function applyAppHeight() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}

let scheduled = false;
function scheduleApply() {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    applyAppHeight();
  });
}

export function initAppHeight() {
  applyAppHeight();
  window.addEventListener("resize", scheduleApply);
  window.addEventListener("orientationchange", scheduleApply);
  // visualViewport tracks toolbar/keyboard changes more precisely than `resize`.
  window.visualViewport?.addEventListener("resize", scheduleApply);
}
