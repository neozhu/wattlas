import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GeneratorCapacityFilter } from "@/components/controls/generator-capacity-filter";
import type { GeneratorCapacityRange } from "@/lib/map/generator-capacity";

afterEach(cleanup);

function ControlledFilter({ initial = { minMw: 0, maxMw: null }, disabled = false, catalogueReady = true }: { initial?: GeneratorCapacityRange; disabled?: boolean; catalogueReady?: boolean }) {
  const [value, setValue] = useState(initial);
  return <><GeneratorCapacityFilter value={value} scaleMaximumMw={25_000} disabled={disabled} catalogueReady={catalogueReady} onChange={setValue} /><output data-testid="committed-range">{JSON.stringify(value)}</output></>;
}

describe("GeneratorCapacityFilter", () => {
  it("keeps precise range controls without quick preset buttons", () => {
    render(<ControlledFilter initial={{ minMw: 0, maxMw: 500 }} />);
    expect(screen.queryByLabelText("Minimum capacity presets")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Minimum capacity 100 MW" })).not.toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Minimum generator capacity" })).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "Maximum generator capacity" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Minimum capacity (MW)" })).toBeInTheDocument();
    expect(screen.getByRole("spinbutton", { name: "Maximum capacity (MW)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reset capacity range" })).toBeInTheDocument();
  });

  it("commits exact numeric minimum and maximum values on blur", () => {
    render(<ControlledFilter />);
    const minimum = screen.getByRole("spinbutton", { name: "Minimum capacity (MW)" });
    fireEvent.change(minimum, { target: { value: "12" } });
    fireEvent.blur(minimum);
    const maximum = screen.getByRole("spinbutton", { name: "Maximum capacity (MW)" });
    fireEvent.change(maximum, { target: { value: "275" } });
    fireEvent.blur(maximum);
    expect(screen.getByTestId("committed-range")).toHaveTextContent('{"minMw":12,"maxMw":275}');
    expect(screen.getByLabelText("Active generator capacity range")).toHaveTextContent("12–275 MW");
    expect(screen.getByText("Unknown capacity excluded")).toBeInTheDocument();
  });

  it("keeps the committed filter intact when a numeric range is invalid", () => {
    render(<ControlledFilter initial={{ minMw: 100, maxMw: 500 }} />);
    const maximum = screen.getByRole("spinbutton", { name: "Maximum capacity (MW)" });
    fireEvent.change(maximum, { target: { value: "50" } });
    fireEvent.keyDown(maximum, { key: "Enter" });
    expect(screen.getByRole("alert")).toHaveTextContent("Maximum must be greater than or equal to minimum");
    expect(screen.getByTestId("committed-range")).toHaveTextContent('{"minMw":100,"maxMw":500}');
  });

  it("synchronizes both range handles and treats the upper endpoint as no limit", () => {
    render(<ControlledFilter />);
    const minimumSlider = screen.getByRole("slider", { name: "Minimum generator capacity" });
    const maximumSlider = screen.getByRole("slider", { name: "Maximum generator capacity" });
    fireEvent.change(minimumSlider, { target: { value: "500" } });
    fireEvent.pointerUp(minimumSlider);
    expect(JSON.parse(screen.getByTestId("committed-range").textContent ?? "{}").minMw).toBeGreaterThan(0);
    fireEvent.change(maximumSlider, { target: { value: "1000" } });
    fireEvent.pointerUp(maximumSlider);
    expect(screen.getByTestId("committed-range")).toHaveTextContent('"maxMw":null');
  });

  it("resets the range and discloses when the global filtered overview is preparing", () => {
    render(<ControlledFilter initial={{ minMw: 100, maxMw: 500 }} catalogueReady={false} />);
    expect(screen.getByText("Preparing matching global plants…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset capacity range" }));
    expect(screen.getByTestId("committed-range")).toHaveTextContent('{"minMw":0,"maxMw":null}');
    expect(screen.queryByText("Unknown capacity excluded")).not.toBeInTheDocument();
  });

  it("disables every editor control when the generator layer is unavailable", () => {
    const onChange = vi.fn();
    render(<GeneratorCapacityFilter value={{ minMw: 0, maxMw: null }} scaleMaximumMw={25_000} disabled catalogueReady onChange={onChange} />);
    for (const control of screen.getAllByRole("button").concat(screen.getAllByRole("slider"), screen.getAllByRole("spinbutton"))) {
      expect(control).toBeDisabled();
    }
  });

  it("offers a retry when the complete generator catalogue could not load", () => {
    const retry = vi.fn();
    render(<GeneratorCapacityFilter
      value={{ minMw: 0, maxMw: null }}
      scaleMaximumMw={25_000}
      catalogueReady={false}
      catalogueError="US generator shard failed"
      onRetryCatalogue={retry}
      onChange={vi.fn()}
    />);

    expect(screen.getByRole("alert")).toHaveTextContent("US generator shard failed");
    fireEvent.click(screen.getByRole("button", { name: "Retry generator catalogue" }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
