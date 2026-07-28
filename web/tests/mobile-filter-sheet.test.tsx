import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MobileFilterSheet } from "@/components/mobile/mobile-filter-sheet";
import { MobileViewSheet } from "@/components/mobile/mobile-view-sheet";

afterEach(cleanup);

const infrastructure = {
  dataCentres: true,
  water: true,
  industrial: true,
  hydrogen: true,
  generators: false,
};

describe("MobileFilterSheet", () => {
  it("organizes map controls into compact accordion groups", () => {
    render(
      <MobileFilterSheet
        open
        activeCount={4}
        infrastructure={infrastructure}
        technologies={new Set()}
        lifecycles={new Set(["operational"])}
        capacityRange={{ minMw: 0, maxMw: null }}
        capacityScaleMaximumMw={25_000}
        generatorCatalogueReady
        onInfrastructureChange={() => undefined}
        onTechnologiesChange={() => undefined}
        onLifecyclesChange={() => undefined}
        onCapacityRangeChange={() => undefined}
        onClearAll={() => undefined}
        onRestoreDefaults={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByRole("dialog", { name: "Map layers" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Infrastructure layers" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Generator technologies" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("switch", { name: "Solar" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Generator technologies" }));
    expect(screen.getByRole("switch", { name: "Solar" })).toBeInTheDocument();
  });

  it("delegates filter changes and explicit reset actions", () => {
    const onInfrastructureChange = vi.fn();
    const onClearAll = vi.fn();
    const onRestoreDefaults = vi.fn();
    const onClose = vi.fn();
    render(
      <MobileFilterSheet
        open
        activeCount={4}
        infrastructure={infrastructure}
        technologies={new Set()}
        lifecycles={new Set(["operational"])}
        capacityRange={{ minMw: 0, maxMw: null }}
        capacityScaleMaximumMw={25_000}
        generatorCatalogueReady
        onInfrastructureChange={onInfrastructureChange}
        onTechnologiesChange={() => undefined}
        onLifecyclesChange={() => undefined}
        onCapacityRangeChange={() => undefined}
        onClearAll={onClearAll}
        onRestoreDefaults={onRestoreDefaults}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Data centres" }));
    expect(onInfrastructureChange).toHaveBeenCalledWith({ ...infrastructure, dataCentres: false });
    fireEvent.click(screen.getByRole("button", { name: "Clear all" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore defaults" }));
    fireEvent.click(screen.getByRole("button", { name: "Show results" }));
    expect(onClearAll).toHaveBeenCalledTimes(1);
    expect(onRestoreDefaults).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("MobileViewSheet", () => {
  it("selects one of the existing analytical views", () => {
    const onChange = vi.fn();
    render(<MobileViewSheet open activeLens="infrastructureDemand" onChange={onChange} onClose={() => undefined} />);
    fireEvent.click(screen.getByRole("button", { name: "Power Balance" }));
    expect(onChange).toHaveBeenCalledWith("powerBalance");
  });
});
