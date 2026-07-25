/** @vitest-environment jsdom */
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  scrollTabIntoRail,
  StudyModeTabs,
} from "@/components/StudyModeTabs";
import ar from "../../messages/ar.json";

const MODES = [
  { id: "words", label: "الكلمات" },
  { id: "irab", label: "الإعراب" },
  { id: "sadi", label: "تفسير السعدي" },
  { id: "muyassar", label: "الميسر" },
  { id: "ibn-kathir", label: "ابن كثير" },
];

function renderTabs(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="ar" messages={ar}>
      {ui}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
});

describe("StudyModeTabs", () => {
  it("renders an accessible RTL tablist with roving tabindex", () => {
    renderTabs(
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

  it("uses a custom panelId when provided", () => {
    renderTabs(
      <StudyModeTabs
        modes={MODES}
        mode="words"
        onModeChange={() => {}}
        panelId="study-panel-words"
      />,
    );
    expect(screen.getAllByRole("tab")[0]).toHaveAttribute(
      "aria-controls",
      "study-panel-words",
    );
  });

  it("ArrowLeft selects the next tab (RTL) and moves focus", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    const { rerender } = renderTabs(
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
      <NextIntlClientProvider locale="ar" messages={ar}>
        <StudyModeTabs modes={MODES} mode="irab" onModeChange={onModeChange} />
      </NextIntlClientProvider>,
    );
    expect(document.activeElement).toBe(
      screen.getByRole("tab", { name: "الإعراب" }),
    );
  });

  it("ArrowRight selects the previous tab (RTL)", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderTabs(
      <StudyModeTabs modes={MODES} mode="irab" onModeChange={onModeChange} />,
    );

    screen.getByRole("tab", { name: "الإعراب" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onModeChange).toHaveBeenCalledWith("words");
  });

  it("Home and End jump to the first and last tabs", async () => {
    const user = userEvent.setup();
    const onModeChange = vi.fn();
    renderTabs(
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
    renderTabs(
      <StudyModeTabs
        modes={MODES}
        mode="words"
        onModeChange={onModeChange}
      />,
    );

    await user.click(screen.getByRole("tab", { name: "تفسير السعدي" }));
    expect(onModeChange).toHaveBeenCalledWith("sadi");
  });

  it("scrollTabIntoRail only adjusts the rail, never window.scrollTo", () => {
    const scrollBy = vi.fn();
    const scroller = {
      getBoundingClientRect: () => ({
        left: 100,
        right: 300,
        top: 0,
        bottom: 40,
        width: 200,
        height: 40,
      }),
      scrollBy,
    } as unknown as HTMLElement;
    const tab = {
      getBoundingClientRect: () => ({
        left: 320,
        right: 400,
        top: 0,
        bottom: 40,
        width: 80,
        height: 40,
      }),
    } as unknown as HTMLElement;

    const windowScrollTo = vi
      .spyOn(window, "scrollTo")
      .mockImplementation(() => undefined);

    scrollTabIntoRail(scroller, tab, "auto");
    expect(scrollBy).toHaveBeenCalledWith(
      expect.objectContaining({ left: expect.any(Number) }),
    );
    expect(windowScrollTo).not.toHaveBeenCalled();
    windowScrollTo.mockRestore();
  });
});
