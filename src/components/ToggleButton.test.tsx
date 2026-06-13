/**
 * ToggleButton — behavior-oriented tests.
 *
 * Covers:
 * - label rendering
 * - active vs inactive visual state (inline style & border)
 * - onClick callback
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ToggleButton } from "./ToggleButton";

describe("ToggleButton", () => {
  it("renders its label text", () => {
    render(
      <ToggleButton active={false} color="#f97316" label="Temperatuur" onClick={() => {}} />,
    );
    expect(screen.getByRole("button", { name: "Temperatuur" })).toBeInTheDocument();
  });

  it("applies active background color when active={true}", () => {
    render(
      <ToggleButton active={true} color="#f97316" label="Neerslag" onClick={() => {}} />,
    );
    const btn = screen.getByRole("button", { name: "Neerslag" });
    // Active: background is the color prop, text is white
    expect(btn).toHaveStyle({ background: "#f97316", color: "#fff" });
  });

  it("applies inactive styling when active={false}", () => {
    render(
      <ToggleButton active={false} color="#f97316" label="Neerslag" onClick={() => {}} />,
    );
    const btn = screen.getByRole("button", { name: "Neerslag" });
    // Inactive: white background, grey text
    expect(btn).toHaveStyle({ background: "#fff", color: "#666" });
  });

  it("applies active border color to the color prop when active={true}", () => {
    render(
      <ToggleButton active={true} color="#64748b" label="Iconen" onClick={() => {}} />,
    );
    const btn = screen.getByRole("button", { name: "Iconen" });
    expect(btn).toHaveStyle({ border: "1px solid #64748b" });
  });

  it("applies grey border when active={false}", () => {
    render(
      <ToggleButton active={false} color="#64748b" label="Iconen" onClick={() => {}} />,
    );
    const btn = screen.getByRole("button", { name: "Iconen" });
    expect(btn).toHaveStyle({ border: "1px solid #ccc" });
  });

  it("calls onClick when the button is clicked", () => {
    const handleClick = vi.fn();
    render(
      <ToggleButton active={false} color="#f97316" label="Temperatuur" onClick={handleClick} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Temperatuur" }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it("calls onClick on each click when clicked multiple times", () => {
    const handleClick = vi.fn();
    render(
      <ToggleButton active={true} color="#f97316" label="Temperatuur" onClick={handleClick} />,
    );
    const btn = screen.getByRole("button", { name: "Temperatuur" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(3);
  });
});
