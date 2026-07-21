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
  it("offers the approved minimum presets and preserves a compatible maximum", () => {
    render(<ControlledFilter initial={{ minMw: 0, maxMw: 500 }} />);
    for (const label of ["All", "10 MW", "25 MW", "50 MW", "100 MW", "250 MW", "500 MW", "1 GW"]) {
      expect(screen.getByRole("button", { name: `Minimum capacity ${label}` })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Minimum capacity 100 MW" }));
    expect(screen.getByTestId("committed-range")).toHaveTextContent('{"minMw":100,"maxMw":500}');
    fireEvent.click(screen.getByRole("button", { name: "Minimum capacity 1 GW" }));
    expect(screen.getByTestId("committed-range")).toHaveTextContent('{"minMw":1000,"maxMw":null}');
  });

  it("commits exact numeric minimum and maximum values on blur", () => {
    render(<ControlledFilter />);
    const minimum = screen.getByRole("spinbutton", { name: "Minimum capacity (MW)" });
    const maximum = screen.getByRole("spinbutton", { name: "Maximum capacity (MW)" });
    fireEvent.change(minimum, { target: { value: "12" } });
    fireEvent.blur(minimum);
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
});
