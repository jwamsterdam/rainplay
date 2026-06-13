// Cold-launch viewport capture.
//
// The Settings "Diagnostiek" block samples viewport heights when the panel
// opens — far too late to catch the iOS standalone COLD-LAUNCH transient, where
// `dvh` can resolve to a pre-settle value during the launch animation and reflow
// after first paint (the "bottom whitespace too high on cold start, correct after
// reopen" bug). This module snapshots the viewport units at three moments around
// first paint and keeps them in memory so the panel can show them after the fact.
//
// init is explicit (called from main.tsx), NOT run at import time, so importing
// this module in tests has no side effects.

export type ViewportSample = {
  label: string; // "rAF" | "+500ms" | "vp-resize"
  t: number; // ms since init (≈ since first paint)
  innerHeight: number;
  dvh: number;
  svh: number;
  lvh: number;
  visualVP: number | null;
};

// Measure the resolved pixel height of a CSS length (e.g. "100dvh") via a
// 1px-wide fixed probe element. Shared with the Settings diagnostics block.
export function measureCssHeight(value: string): number {
  const probe = document.createElement("div");
  probe.style.cssText = `position:fixed;left:0;top:0;width:1px;visibility:hidden;pointer-events:none;height:${value};`;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  probe.remove();
  return Math.round(px);
}

const samples: ViewportSample[] = [];
let started = false;

function snapshot(label: string, startedAt: number): ViewportSample {
  return {
    label,
    t: Math.round(performance.now() - startedAt),
    innerHeight: window.innerHeight,
    dvh: measureCssHeight("100dvh"),
    svh: measureCssHeight("100svh"),
    lvh: measureCssHeight("100lvh"),
    visualVP: window.visualViewport ? Math.round(window.visualViewport.height) : null,
  };
}

// Schedule the cold-launch captures. Idempotent and SSR/test-safe.
export function initColdLaunchViewport(): void {
  if (started || typeof window === "undefined") return;
  started = true;
  const startedAt = performance.now();

  // Closest sample to first paint.
  requestAnimationFrame(() => samples.push(snapshot("rAF", startedAt)));
  // After the launch animation has had time to settle.
  window.setTimeout(() => samples.push(snapshot("+500ms", startedAt)), 500);
  // The first viewport settle event, if iOS fires one.
  window.visualViewport?.addEventListener(
    "resize",
    () => samples.push(snapshot("vp-resize", startedAt)),
    { once: true },
  );
}

export function getColdLaunchSamples(): ViewportSample[] {
  return samples;
}
