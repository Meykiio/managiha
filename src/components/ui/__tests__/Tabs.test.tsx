import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs } from "../Tabs";

/**
 * The direction is read from the document, and these tests share a process with
 * the i18n suites that flip it. Setting it explicitly keeps the suite hermetic
 * rather than dependent on which file happened to run first.
 */
beforeEach(() => {
  document.documentElement.dir = "ltr";
});

afterEach(() => {
  document.documentElement.dir = "ltr";
});

const TABS = [
  { key: "receive", label: "Receive" },
  { key: "sell", label: "Sell" },
  { key: "adjust", label: "Adjust" },
  { key: "history", label: "History" },
];

/** Controlled, the way InventoryPage drives it, so `active` really tracks state. */
function ControlledTabs({ initial = "receive" }: { initial?: string }) {
  const [active, setActive] = useState(initial);
  return <Tabs tabs={TABS} active={active} onChange={setActive} />;
}

function renderTabs(initial = "receive") {
  render(<ControlledTabs initial={initial} />);
}

describe("Tabs", () => {
  it("links each tab to the panel it controls", () => {
    // The panel ids are what aria-controls on the tab points at. These used to be
    // dangling: the tablist set no ids at all, so every tabpanel's
    // aria-labelledby referenced an element that did not exist.
    renderTabs();
    const tab = screen.getByRole("tab", { name: "Sell" });
    expect(tab).toHaveAttribute("id", "tab-sell");
    expect(tab).toHaveAttribute("aria-controls", "tab-panel-sell");
    expect(tab).toHaveAttribute("aria-selected", "false");
  });

  it("uses a roving tabindex so only the active tab is tabbable", () => {
    renderTabs("adjust");
    expect(screen.getByRole("tab", { name: "Adjust" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "Sell" })).toHaveAttribute("tabindex", "-1");
  });

  it("moves between tabs with arrow keys", async () => {
    renderTabs();
    await userEvent.tab();
    expect(screen.getByRole("tab", { name: "Receive" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Sell" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Sell" })).toHaveAttribute("aria-selected", "true");

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Receive" })).toHaveFocus();
  });

  it("advances one tab per press even without waiting for a re-render", async () => {
    renderTabs();
    screen.getByRole("tab", { name: "Receive" }).focus();
    // Two presses in a row must land on Adjust, not on Sell twice.
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Adjust" })).toHaveFocus();
  });

  it("wraps around at both ends", async () => {
    renderTabs();
    screen.getByRole("tab", { name: "Receive" }).focus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "History" })).toHaveFocus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "Receive" })).toHaveFocus();
  });

  it("jumps to the first and last tab with Home and End", async () => {
    renderTabs("adjust");
    screen.getByRole("tab", { name: "Adjust" }).focus();

    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "Receive" })).toHaveFocus();

    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "History" })).toHaveFocus();
  });

  it("still activates on click", async () => {
    renderTabs();
    await userEvent.click(screen.getByRole("tab", { name: "History" }));
    expect(screen.getByRole("tab", { name: "History" })).toHaveAttribute("aria-selected", "true");
  });

  it("mirrors the arrow keys under RTL", async () => {
    // In Arabic the tab row reads right to left, so ArrowRight must move to the
    // tab that is visually to the right, which is the previous one.
    document.documentElement.dir = "rtl";
    renderTabs();
    screen.getByRole("tab", { name: "Receive" }).focus();

    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "History" })).toHaveFocus();

    await userEvent.keyboard("{ArrowLeft}");
    expect(screen.getByRole("tab", { name: "Receive" })).toHaveFocus();
  });
});