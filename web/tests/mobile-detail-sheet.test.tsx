import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileDetailSheet } from "@/components/mobile/mobile-detail-sheet";
import { MobileYearSheet } from "@/components/mobile/mobile-year-sheet";

afterEach(cleanup);

describe("MobileYearSheet", () => {
  it("selects the analysis year and closes", () => {
    const onChange = vi.fn();
    const onClose = vi.fn();
    render(<MobileYearSheet open years={[2026, 2027, 2028, 2029, 2030, 2031]} activeYear={2026} onChange={onChange} onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "2031" }));
    expect(onChange).toHaveBeenCalledWith(2031);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("MobileDetailSheet", () => {
  it("turns shared inspector content into a labelled mobile dialog", () => {
    const onClose = vi.fn();
    render(
      <MobileDetailSheet open title="Hamburg" onClose={onClose}>
        <p>Shared inspector</p>
      </MobileDetailSheet>,
    );
    expect(screen.getByRole("dialog", { name: "Hamburg details" })).toHaveTextContent("Shared inspector");
    fireEvent.click(screen.getByRole("button", { name: "Close Hamburg details" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("keeps shared content mounted without exposing a dialog while closed", () => {
    render(
      <MobileDetailSheet open={false} title="Hamburg" onClose={() => undefined}>
        <p>Shared inspector</p>
      </MobileDetailSheet>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("Shared inspector")).toBeInTheDocument();
  });
});
