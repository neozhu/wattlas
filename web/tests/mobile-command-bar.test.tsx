import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CommandBar } from "@/components/controls/command-bar";
import type { SnapshotManifest } from "@/lib/snapshot/types";

afterEach(cleanup);

const manifest = {
  generatedAt: "2026-07-21T13:50:00Z",
  coverage: { assets: 12_069 },
} as SnapshotManifest;

describe("mobile CommandBar navigation", () => {
  it("keeps search and Wattlas visible while placing secondary actions in a compact menu", () => {
    const onModeChange = vi.fn();
    const onOpenStatus = vi.fn();
    render(
      <CommandBar
        manifest={manifest}
        searchSlot={<input aria-label="Search Wattlas" />}
        mode="radar"
        onModeChange={onModeChange}
        onOpenStatus={onOpenStatus}
      />,
    );
    expect(screen.getByLabelText("Wattlas")).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Search Wattlas" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open mobile navigation" }));
    const navigation = screen.getByRole("navigation", { name: "Mobile navigation" });
    expect(within(navigation).getByRole("link", { name: "Methodology and sources" })).toHaveAttribute("href", "/methodology");
    fireEvent.click(within(navigation).getByRole("button", { name: "Asset Explorer" }));
    expect(onModeChange).toHaveBeenCalledWith("explorer");
    fireEvent.click(screen.getByRole("button", { name: "Open mobile navigation" }));
    fireEvent.click(within(screen.getByRole("navigation", { name: "Mobile navigation" })).getByRole("button", { name: "Data refresh details" }));
    expect(onOpenStatus).toHaveBeenCalledTimes(1);
  });
});
