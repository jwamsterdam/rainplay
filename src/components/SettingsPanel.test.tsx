import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { defaultCellColors } from "./cellColors";
import { SettingsPanel } from "./SettingsPanel";

// detectDisplayMode() calls window.matchMedia — provide a minimal stub so jsdom
// does not throw. The optional chaining in the source (matchMedia?.) already
// guards against undefined, but some jsdom versions expose the property as
// non-callable, so we replace it entirely.
beforeAll(() => {
  // Vite define replacement is not applied in this Vitest environment
  (globalThis as unknown as Record<string, unknown>).__APP_VERSION__ = "0.0.0-test";

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockReturnValue({ matches: false }),
  });
});

function defaultProps(overrides: Record<string, unknown> = {}) {
  return {
    colors: defaultCellColors,
    onColorsChange: vi.fn(),
    showTemp: true,
    showRain: true,
    showIcons: true,
    onShowTempChange: vi.fn(),
    onShowRainChange: vi.fn(),
    onShowIconsChange: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
}

describe("SettingsPanel", () => {
  it("renders the panel title", () => {
    render(<SettingsPanel {...defaultProps()} />);
    expect(screen.getByText("Grafiekkleuren")).toBeInTheDocument();
  });

  it("calls onClose when the × button is clicked", () => {
    const onClose = vi.fn();
    render(<SettingsPanel {...defaultProps({ onClose })} />);
    fireEvent.click(screen.getByRole("button", { name: "Sluiten" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("calls onClose when the Klaar button is clicked", () => {
    const onClose = vi.fn();
    render(<SettingsPanel {...defaultProps({ onClose })} />);
    fireEvent.click(screen.getByRole("button", { name: "Klaar" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("renders all five color row labels", () => {
    render(<SettingsPanel {...defaultProps()} />);
    expect(screen.getByText("Zon")).toBeInTheDocument();
    expect(screen.getByText("Zon met bewolking")).toBeInTheDocument();
    expect(screen.getByText("Bewolkt")).toBeInTheDocument();
    expect(screen.getByText("Regen")).toBeInTheDocument();
    expect(screen.getByText("Nacht")).toBeInTheDocument();
  });

  it("renders the three layer toggle buttons", () => {
    render(<SettingsPanel {...defaultProps()} />);
    expect(screen.getByRole("button", { name: "Temperatuur" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Neerslag" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iconen" })).toBeInTheDocument();
  });

  it("calls onShowTempChange(false) when Temperatuur is toggled off", () => {
    const onShowTempChange = vi.fn();
    render(<SettingsPanel {...defaultProps({ showTemp: true, onShowTempChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Temperatuur" }));
    expect(onShowTempChange).toHaveBeenCalledWith(false);
  });

  it("calls onShowRainChange(false) when Neerslag is toggled off", () => {
    const onShowRainChange = vi.fn();
    render(<SettingsPanel {...defaultProps({ showRain: true, onShowRainChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Neerslag" }));
    expect(onShowRainChange).toHaveBeenCalledWith(false);
  });

  it("calls onShowIconsChange(true) when Iconen is toggled on", () => {
    const onShowIconsChange = vi.fn();
    render(<SettingsPanel {...defaultProps({ showIcons: false, onShowIconsChange })} />);
    fireEvent.click(screen.getByRole("button", { name: "Iconen" }));
    expect(onShowIconsChange).toHaveBeenCalledWith(true);
  });

  it("displays alpha percentages for every color row", () => {
    render(<SettingsPanel {...defaultProps()} />);
    // defaultCellColors has 5 rows — each renders a "N%" span
    const percentSpans = screen.getAllByText(/^\d+%$/);
    expect(percentSpans.length).toBe(5);
  });

  it("calls onColorsChange when the alpha slider is moved", () => {
    const onColorsChange = vi.fn();
    render(<SettingsPanel {...defaultProps({ onColorsChange })} />);
    const zonSlider = screen.getByRole("slider", { name: "Intensiteit voor Zon" });
    fireEvent.change(zonSlider, { target: { value: "0.5" } });
    expect(onColorsChange).toHaveBeenCalledOnce();
    const [updatedColors] = onColorsChange.mock.calls[0];
    expect(updatedColors.sun).toMatch(/rgba\(\d+, \d+, \d+, 0\.5\)/);
  });

  it("renders the diagnostics section after mount", async () => {
    render(<SettingsPanel {...defaultProps()} />);
    expect(screen.getByLabelText("Diagnostiek")).toBeInTheDocument();
  });
});
