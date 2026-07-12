import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import MethodologyPage, { metadata } from "@/app/methodology/page";

describe("methodology page", () => {
  it("explains Wattlas, sources, evidence, and limitations without em dashes", () => {
    const { container } = render(<MethodologyPage />);
    expect(screen.getByRole("heading", { name: /How Wattlas works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Data sources/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Limitations/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open Opportunity Radar/i })[0]).toHaveAttribute("href", "/");
    expect(container.textContent).not.toContain("—");
  });

  it("publishes indexable search metadata", () => {
    expect(metadata.title).toMatch(/Data Sources and Methodology/i);
    expect(metadata.alternates?.canonical).toBe("/methodology");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
});
