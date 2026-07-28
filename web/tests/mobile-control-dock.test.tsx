import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileControlDock } from "@/components/mobile/mobile-control-dock";

afterEach(cleanup);

describe("MobileControlDock", () => {
  it("summarizes the active map controls", () => {
    render(
      <MobileControlDock
        activeSheet="view"
        activeFilterCount={7}
        lensLabel="Power Balance"
        year={2028}
        onOpen={() => undefined}
      />,
    );
    expect(screen.getByRole("button", { name: /Filters, 7 active filters/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("button", { name: /View, Power Balance/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /Year, 2028/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("opens each mobile control surface", () => {
    const onOpen = vi.fn();
    render(
      <MobileControlDock
        activeSheet={null}
        activeFilterCount={2}
        lensLabel="Infrastructure Demand"
        year={2026}
        onOpen={onOpen}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: /View/ }));
    fireEvent.click(screen.getByRole("button", { name: /Year/ }));
    expect(onOpen.mock.calls.map(([value]) => value)).toEqual(["layers", "view", "year"]);
  });
});
