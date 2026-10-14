import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { SortableHeader, type SortState } from "../SortableHeader";
import { useTableSort } from "../../../hooks/useTableSort";

/** A real table, because aria-sort is only meaningful on a th inside one. */
function Table({ onChange }: { onChange?: () => void } = {}) {
  const { sort, toggleSort } = useTableSort({ onChange });
  return (
    <table>
      <thead>
        <tr>
          <SortableHeader label="Name" sortKey="name" sort={sort} onSort={toggleSort} />
          <SortableHeader label="Stock" sortKey="current_stock" sort={sort} onSort={toggleSort} />
        </tr>
      </thead>
    </table>
  );
}

function headerFor(label: string) {
  return screen.getByRole("button", { name: label }).closest("th") as HTMLTableCellElement;
}

describe("SortableHeader", () => {
  it("marks the active column ascending, and leaves the others unset", () => {
    render(<Table />);
    expect(headerFor("Name")).toHaveAttribute("aria-sort", "ascending");
    // Not omitted: an absent aria-sort is not the same as "none" to a screen
    // reader walking the header, so the inactive column must say so explicitly.
    expect(headerFor("Stock")).toHaveAttribute("aria-sort", "none");
  });

  it("flips to descending when the active column is clicked again", async () => {
    const user = userEvent.setup();
    render(<Table />);
    await user.click(screen.getByRole("button", { name: "Name" }));
    expect(headerFor("Name")).toHaveAttribute("aria-sort", "descending");
  });

  it("starts a newly clicked column ascending rather than inheriting the direction", async () => {
    const user = userEvent.setup();
    render(<Table />);
    await user.click(screen.getByRole("button", { name: "Name" }));
    await user.click(screen.getByRole("button", { name: "Stock" }));
    expect(headerFor("Stock")).toHaveAttribute("aria-sort", "ascending");
    expect(headerFor("Name")).toHaveAttribute("aria-sort", "none");
  });

  it("is operable from the keyboard", async () => {
    const user = userEvent.setup();
    render(<Table />);
    await user.tab();
    expect(screen.getByRole("button", { name: "Name" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(headerFor("Name")).toHaveAttribute("aria-sort", "descending");
  });

  it("exposes the arrows to nothing but the eye", () => {
    render(<Table />);
    // The chevrons are decorative; the sorting state is already carried by
    // aria-sort, so announcing them would just repeat it.
    expect(document.querySelectorAll('svg[aria-hidden="true"]').length).toBeGreaterThan(0);
  });
});

describe("useTableSort", () => {
  it("calls back on every change so the caller can reset pagination", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<Table onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: "Name" }));
    await user.click(screen.getByRole("button", { name: "Stock" }));
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("honours an initial sort other than the default", () => {
    function BalanceTable() {
      const [sort] = useState<SortState>({ key: "balance", dir: "desc" });
      return (
        <table>
          <thead>
            <tr>
              <SortableHeader label="Balance" sortKey="balance" sort={sort} onSort={() => {}} />
            </tr>
          </thead>
        </table>
      );
    }
    render(<BalanceTable />);
    expect(headerFor("Balance")).toHaveAttribute("aria-sort", "descending");
  });
});
