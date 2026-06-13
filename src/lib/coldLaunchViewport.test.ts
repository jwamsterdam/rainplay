/**
 * coldLaunchViewport — behavior-oriented tests.
 *
 * The module has module-level state (`started` flag + `samples` array).
 * Each test uses `vi.resetModules()` + dynamic import to get a fresh module
 * instance so the idempotency flag and samples array are reset between tests.
 *
 * Key contracts:
 * - measureCssHeight inserts a probe element, reads its height, removes it.
 * - getColdLaunchSamples returns [] before init.
 * - initColdLaunchViewport schedules a rAF sample (label "rAF").
 * - initColdLaunchViewport schedules a +500ms sample after setTimeout(500).
 * - initColdLaunchViewport is idempotent — second call is a no-op.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

type ColdLaunchMod = typeof import("./coldLaunchViewport");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function freshMod(): Promise<ColdLaunchMod> {
  vi.resetModules();
  return import("./coldLaunchViewport");
}

function stubProbeHeight(height: number) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    height,
    width: 0,
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: height,
    toJSON: () => ({}),
  } as DOMRect);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("coldLaunchViewport", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});
    Object.defineProperty(window, "visualViewport", {
      value: null,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  // -------------------------------------------------------------------------
  // measureCssHeight
  // -------------------------------------------------------------------------

  it("measureCssHeight returns the height from the probe element", async () => {
    const mod = await freshMod();
    stubProbeHeight(812);

    expect(mod.measureCssHeight("100dvh")).toBe(812);
  });

  it("measureCssHeight removes the probe element from the DOM after measuring", async () => {
    const mod = await freshMod();
    stubProbeHeight(100);

    const before = document.body.children.length;
    mod.measureCssHeight("100svh");
    expect(document.body.children.length).toBe(before);
  });

  it("measureCssHeight rounds the pixel height to the nearest integer", async () => {
    const mod = await freshMod();
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      height: 667.6,
    } as DOMRect);

    expect(mod.measureCssHeight("100dvh")).toBe(668);
  });

  // -------------------------------------------------------------------------
  // getColdLaunchSamples — before init
  // -------------------------------------------------------------------------

  it("getColdLaunchSamples returns an empty array before initColdLaunchViewport is called", async () => {
    const mod = await freshMod();
    expect(mod.getColdLaunchSamples()).toEqual([]);
  });

  // -------------------------------------------------------------------------
  // initColdLaunchViewport — rAF sample
  // -------------------------------------------------------------------------

  it("initColdLaunchViewport adds a sample with label 'rAF' after the first rAF fires", async () => {
    const mod = await freshMod();
    stubProbeHeight(667);

    mod.initColdLaunchViewport();

    const samples = mod.getColdLaunchSamples();
    expect(samples.some((s) => s.label === "rAF")).toBe(true);
  });

  it("the rAF sample captures innerHeight from window", async () => {
    const mod = await freshMod();
    stubProbeHeight(812);
    Object.defineProperty(window, "innerHeight", { value: 812, configurable: true });

    mod.initColdLaunchViewport();

    const rAFSample = mod.getColdLaunchSamples().find((s) => s.label === "rAF");
    expect(rAFSample).toBeDefined();
    expect(rAFSample!.innerHeight).toBe(812);
  });

  // -------------------------------------------------------------------------
  // initColdLaunchViewport — +500ms sample
  // -------------------------------------------------------------------------

  it("initColdLaunchViewport adds a '+500ms' sample after 500ms elapses", async () => {
    const mod = await freshMod();
    stubProbeHeight(667);

    mod.initColdLaunchViewport();
    vi.advanceTimersByTime(600);

    const samples = mod.getColdLaunchSamples();
    expect(samples.some((s) => s.label === "+500ms")).toBe(true);
  });

  it("does NOT add the +500ms sample before 500ms elapses", async () => {
    const mod = await freshMod();
    stubProbeHeight(667);

    mod.initColdLaunchViewport();
    vi.advanceTimersByTime(100);

    const samples = mod.getColdLaunchSamples();
    expect(samples.some((s) => s.label === "+500ms")).toBe(false);
  });

  // -------------------------------------------------------------------------
  // idempotency — calling twice must not double-schedule
  // -------------------------------------------------------------------------

  it("is idempotent — calling initColdLaunchViewport twice fires rAF only once", async () => {
    const mod = await freshMod();
    stubProbeHeight(667);

    const rafSpy = vi.fn((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
    vi.stubGlobal("requestAnimationFrame", rafSpy);

    mod.initColdLaunchViewport();
    mod.initColdLaunchViewport();

    expect(rafSpy).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Sample shape
  // -------------------------------------------------------------------------

  it("each sample contains the expected fields (label, t, innerHeight, dvh, svh, lvh)", async () => {
    const mod = await freshMod();
    stubProbeHeight(812);

    mod.initColdLaunchViewport();

    const [sample] = mod.getColdLaunchSamples();
    expect(sample).toMatchObject({
      label: "rAF",
      innerHeight: expect.any(Number),
      dvh: expect.any(Number),
      svh: expect.any(Number),
      lvh: expect.any(Number),
      t: expect.any(Number),
    });
  });
});
