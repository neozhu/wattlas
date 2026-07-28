import { createRef } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileSheet } from "@/components/mobile/mobile-sheet";

afterEach(cleanup);

describe("MobileSheet", () => {
  it("renders nothing while closed", () => {
    render(<MobileSheet id="layers" title="Layers" open={false} onClose={() => undefined}>Filters</MobileSheet>);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("labels an open modal sheet and moves focus inside", () => {
    render(
      <MobileSheet id="layers" title="Layers" open onClose={() => undefined}>
        <button type="button">First control</button>
      </MobileSheet>,
    );
    const dialog = screen.getByRole("dialog", { name: "Layers" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("button", { name: "First control" })).toHaveFocus();
  });

  it("closes from Escape or the backdrop but not from sheet content", () => {
    const onClose = vi.fn();
    render(
      <MobileSheet id="layers" title="Layers" open onClose={onClose}>
        <button type="button">Inside</button>
      </MobileSheet>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Inside" }));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("mobile-sheet-backdrop"));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("restores focus to its trigger when closed", () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const { rerender } = render(
      <>
        <button ref={triggerRef} type="button">Open layers</button>
        <MobileSheet id="layers" title="Layers" open triggerRef={triggerRef} onClose={() => undefined}>
          <button type="button">Inside</button>
        </MobileSheet>
      </>,
    );
    expect(screen.getByRole("button", { name: "Inside" })).toHaveFocus();
    rerender(
      <>
        <button ref={triggerRef} type="button">Open layers</button>
        <MobileSheet id="layers" title="Layers" open={false} triggerRef={triggerRef} onClose={() => undefined}>
          <button type="button">Inside</button>
        </MobileSheet>
      </>,
    );
    expect(screen.getByRole("button", { name: "Open layers" })).toHaveFocus();
  });
});
