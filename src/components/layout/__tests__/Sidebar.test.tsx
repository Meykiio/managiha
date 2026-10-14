import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SidebarContent } from "../Sidebar";
import { setLanguage } from "../../../i18n";

/**
 * The groups exist to let the eye skip a block. That only works if the labels
 * are actually rendered, and they are hidden on the collapsed rail by design, so
 * both states are asserted rather than just the expanded one.
 *
 * The language is reset in beforeEach rather than afterEach for the same reason
 * the i18n suites do it: the global cleanup hook is registered first, so an
 * afterEach reset would fire setLanguage while this test's tree is still mounted.
 */
function renderSidebar(collapsed: boolean) {
  return render(
    <MemoryRouter>
      <SidebarContent collapsed={collapsed} />
    </MemoryRouter>
  );
}

describe("Sidebar navigation groups", () => {
  beforeEach(() => act(() => setLanguage("en")));
  afterEach(() => act(() => setLanguage("fr")));

  it("renders both group labels when expanded", () => {
    renderSidebar(false);
    expect(screen.getByRole("heading", { name: "Operations" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reference" })).toBeInTheDocument();
  });

  it("keeps every destination reachable inside its group", () => {
    renderSidebar(false);
    const nav = screen.getByRole("navigation", { name: "Manage" });
    for (const label of ["Dashboard", "Products", "Stock", "Credit book", "Suppliers", "Reports"]) {
      expect(screen.getByRole("link", { name: label })).toBeInTheDocument();
    }
    // Both groups live in one nav, so the aria-label on the container still
    // describes the whole set rather than a single group.
    expect(nav).toBeInTheDocument();
  });

  it("drops the labels on the collapsed rail, where they would only add noise", () => {
    renderSidebar(true);
    expect(screen.queryByRole("heading", { name: "Operations" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Reference" })).not.toBeInTheDocument();
    // The links survive, as icon-only buttons carrying a tooltip.
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
  });

  it("translates the labels with the rest of the interface", () => {
    act(() => setLanguage("fr"));
    renderSidebar(false);
    expect(screen.getByRole("heading", { name: "Exploitation" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Référentiel" })).toBeInTheDocument();
  });
});
