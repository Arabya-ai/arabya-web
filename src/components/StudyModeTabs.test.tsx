/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StudyModeTabs } from "@/components/StudyModeTabs";

const MODES = [
  { id: "words", label: "الكلمات" },
  { id: "irab", label: "الإعراب" },
  { id: "sadi", label: "تفسير السعدي" },
  { id: "muyassar", label: "الميسر" },
  { id: "ibn-kathir", label: "ابن كثير" },
];

afterEach(() => {
  cleanup();
});

describe("StudyModeTabs", () => {
  it("renders an accessible RTL tablist with roving tabindex", () => {
    render(
      <StudyModeTabs modes={MODES} mode="words" onModeChange={() => {}} />,
    );

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(5);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(tabs[0]).toHaveAttribute("tabindex", "0");
    expect(tabs[1]).toHaveAttribute("aria-selected", "false");
    expect(tabs[1]).toHaveAttribute("tabindex", "-1");
    expect(tabs[0]).toHaveAttribute("aria-controls", "study-panel");
  });

  it("ArrowLeft selects the next tab (RTL) and moves focus", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const { rerender } = render(
      <StudyModeTabs
        modes={MODES}
        mode="words"
        onModeChange={onModeChange}
      />,
    );

    screen.getByRole("tab", { name: "الكلمات" }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onModeChange).toHaveBeenCalledWith("irab");

    rerender(
      <StudyModeTabs modes={MODES} mode="irab" onModeChange={onModeChange} />,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "الإعراب" }),
    );
  });

  it("ArrowRight selects the previous tab (RTL)", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <StudyModeTabs modes={MODES} mode="irab" onModeChange={onModeChange} />,
    );

    screen.getByRole("tab", { name: "الإعراب" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onModeChange).toHaveBeenCalledWith("words");
  });

  it("Home and End jump to the first and last tabs", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <StudyModeTabs modes={MODES} mode="irab" onModeChange={onModeChange} />,
    );

    screen.getByRole("tab", { name: "الإعراب" }).focus();
    await user.keyboard("{End}");
    expect(onModeChange).toHaveBeenLastCalledWith("ibn-kathir");

    await user.keyboard("{Home}");
    expect(onModeChange).toHaveBeenLastCalledWith("words");
  });

  it("clicking a tab selects it", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    render(
      <StudyModeTabs
        modes={MODES}
        mode="words"
        onModeChange={onModeChange}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "تفسير السعدي" }));
    expect(onModeChange).toHaveBeenCalledWith("sadi");
  });
});
