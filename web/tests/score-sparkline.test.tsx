import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ScoreSparkline } from "@/components/inspector/score-sparkline";
import type { LensScores } from "@/lib/snapshot/types";

afterEach(cleanup);

const scoresByYear: Record<string, LensScores> = {
  "2026": { infrastructureDemand: 34, siteAttractiveness: 50, systemRisk: 40, powerBalance: 30 },
  "2028": { infrastructureDemand: 46, siteAttractiveness: 55, systemRisk: 43, powerBalance: 35 },
  "2030": { infrastructureDemand: 57, siteAttractiveness: 60, systemRisk: 47, powerBalance: 40 },
};

describe("ScoreSparkline", () => {
  it("plots the lens trajectory and marks the active horizon year", () => {
    render(<ScoreSparkline scoresByYear={scoresByYear} lens="infrastructureDemand" activeYear={2030} label="Infrastructure Demand" />);
    expect(screen.getByRole("img", { name: "Infrastructure Demand trajectory 2026–2030" })).toBeInTheDocument();
    expect(screen.getByTestId("sparkline-active-year")).toBeInTheDocument();
  });

  it("summarises the signed change across the horizon", () => {
    render(<ScoreSparkline scoresByYear={scoresByYear} lens="infrastructureDemand" activeYear={2030} label="Infrastructure Demand" />);
    expect(screen.getByText("+23")).toBeInTheDocument();
  });

  it("renders nothing when fewer than two years are scored", () => {
    const { container } = render(
      <ScoreSparkline
        scoresByYear={{ "2030": { infrastructureDemand: 57, siteAttractiveness: null, systemRisk: null, powerBalance: null } }}
        lens="infrastructureDemand"
        activeYear={2030}
        label="Infrastructure Demand"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
