import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AssetExplorerSummary } from "@/components/intelligence/asset-explorer-summary";

describe("AssetExplorerSummary", () => {
  it("shows snapshot-derived facility and lifecycle counts", () => {
    render(<AssetExplorerSummary coverage={{ countries: 246, assets: 9500, dataCentres: 4000, waterInfrastructure: 150, industrialLoads: 4200, hydrogenInfrastructure: 1150, generators: 52000 }} statuses={{ operating: 7000, construction: 900, preConstruction: 800, announced: 650, retired: 150 }} />);
    expect(screen.getByRole("region", { name: "Asset Explorer summary" })).toHaveTextContent("9,500");
    for (const text of ["4,200", "1,150", "52,000", "7,000 operating", "900 construction", "800 pre-construction", "650 announced", "150 retired"]) expect(screen.getByText(text)).toBeInTheDocument();
  });
});
