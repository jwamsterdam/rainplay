import { describe, expect, it } from "vitest";

// @ts-expect-error Vitest runs in Node, but this app intentionally does not carry Node typings.
import { readFileSync } from "node:fs";

declare const process: {
  cwd: () => string;
};

function readProjectFile(path: string): string {
  return readFileSync(`${process.cwd()}/${path}`, "utf8");
}

function ruleBlock(css: string, selector: string, startAt = 0): string {
  const selectorPattern = new RegExp(`\\n\\s*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*\\{`, "g");
  selectorPattern.lastIndex = startAt;
  const match = selectorPattern.exec(css);
  const selectorIndex = match?.index ?? -1;
  expect(selectorIndex, `Missing CSS selector ${selector}`).toBeGreaterThanOrEqual(0);

  const blockStart = match ? selectorPattern.lastIndex - 1 : -1;
  const blockEnd = css.indexOf("}", blockStart);
  expect(blockStart, `Missing opening brace for ${selector}`).toBeGreaterThanOrEqual(0);
  expect(blockEnd, `Missing closing brace for ${selector}`).toBeGreaterThan(blockStart);

  return css.slice(blockStart + 1, blockEnd);
}

describe("iOS viewport fill contract", () => {
  it("keeps the iOS fullscreen PWA meta tags that make safe areas relevant", () => {
    const indexHtml = readProjectFile("index.html");

    expect(indexHtml).toContain("viewport-fit=cover");
    expect(indexHtml).toContain('name="apple-mobile-web-app-capable" content="yes"');
    expect(indexHtml).toContain('name="apple-mobile-web-app-status-bar-style" content="black-translucent"');
  });

  it("pins the mobile app shell and settings overlay with fixed inset boxes", () => {
    const stylesCss = readProjectFile("src/styles.css");

    const htmlRule = ruleBlock(stylesCss, "html");
    expect(htmlRule).toContain("image-set");
    expect(htmlRule).toContain("weather-hero.avif");
    expect(htmlRule).toContain("background-attachment: fixed");

    const appShellRule = ruleBlock(stylesCss, ".app-shell");
    expect(appShellRule).toContain("position: fixed");
    expect(appShellRule).toContain("inset: 0");
    expect(appShellRule).not.toMatch(/\b(?:min-)?height\s*:/);

    const settingsOverlayRule = ruleBlock(stylesCss, ".settings-overlay");
    expect(settingsOverlayRule).toContain("position: fixed");
    expect(settingsOverlayRule).toContain("inset: 0");
  });

  it("keeps safe-area padding on the elements that own visible content", () => {
    const stylesCss = readProjectFile("src/styles.css");

    expect(ruleBlock(stylesCss, ".weather-hero")).toContain("env(safe-area-inset-top)");
    expect(ruleBlock(stylesCss, ".settings-gear-button")).toContain("env(safe-area-inset-top)");
    expect(ruleBlock(stylesCss, ".decision-sheet")).toContain("env(safe-area-inset-bottom)");
  });

  it("restores the app shell to a desktop device frame inside the desktop media query", () => {
    const stylesCss = readProjectFile("src/styles.css");

    const desktopMediaIndex = stylesCss.lastIndexOf("@media (min-width: 720px)");
    expect(desktopMediaIndex).toBeGreaterThanOrEqual(0);

    const desktopAppShellRule = ruleBlock(stylesCss, ".app-shell", desktopMediaIndex);
    expect(desktopAppShellRule).toContain("position: relative");
    expect(desktopAppShellRule).toContain("inset: auto");
    expect(desktopAppShellRule).toContain("image-set");
    expect(desktopAppShellRule).toContain("weather-hero.avif");
  });

  it("keeps cold-launch viewport diagnostics wired into startup and settings", () => {
    const mainTsx = readProjectFile("src/main.tsx");
    const settingsPanelTsx = readProjectFile("src/components/SettingsPanel.tsx");

    expect(mainTsx).toContain('import { initColdLaunchViewport } from "./lib/coldLaunchViewport"');
    expect(mainTsx).toContain("initColdLaunchViewport();");
    expect(settingsPanelTsx).toContain("getColdLaunchSamples");
    expect(settingsPanelTsx).toContain("Cold-launch");
    expect(settingsPanelTsx).toContain('aria-label="Diagnostiek"');
  });
});
