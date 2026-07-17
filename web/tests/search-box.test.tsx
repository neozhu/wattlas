import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SearchBox } from "@/components/controls/search-box";
import { buildSearchIndex } from "@/lib/search";
import type { GeographyFeature } from "@/lib/snapshot/types";

afterEach(cleanup);

const geography = (id: string, name: string) => ({
  type: "Feature", id, geometry: { type: "Polygon", coordinates: [] },
  properties: { id, name, country: id.slice(0, 2), level: "country" },
} as unknown as GeographyFeature);

const index = buildSearchIndex({
  geographies: [geography("IE", "Ireland"), geography("IN", "India"), geography("IS", "Iceland")],
  assets: [],
  generators: [],
});

function open(onSelect = vi.fn()) {
  render(<SearchBox index={index} onSelect={onSelect} />);
  const input = screen.getByRole("combobox");
  fireEvent.change(input, { target: { value: "I" } });
  return { input, onSelect };
}

describe("SearchBox keyboard navigation", () => {
  it("moves the active option with arrow keys via aria-activedescendant", () => {
    const { input } = open();
    const first = screen.getAllByRole("option")[0];
    expect(input).toHaveAttribute("aria-activedescendant", first.id);

    fireEvent.keyDown(input, { key: "ArrowDown" });
    const second = screen.getAllByRole("option")[1];
    expect(input).toHaveAttribute("aria-activedescendant", second.id);
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(first).toHaveAttribute("aria-selected", "false");
  });

  it("does not move past the last option", () => {
    const { input } = open();
    const options = screen.getAllByRole("option");
    for (let i = 0; i < options.length + 3; i += 1) fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(input).toHaveAttribute("aria-activedescendant", options[options.length - 1].id);
  });

  it("selects the active option on Enter, not always the first", () => {
    const onSelect = vi.fn();
    const { input } = open(onSelect);
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect.mock.calls[0][0].label).not.toBe("Ireland");
  });

  it("closes the panel on Escape", () => {
    const { input } = open();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryAllByRole("option")).toHaveLength(0);
  });
});
