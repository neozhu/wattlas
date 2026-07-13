import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import MethodologyPage, { metadata } from "@/app/methodology/page";

afterEach(cleanup);

describe("methodology page", () => {
  it("presents the methodology in a clear anchored reading order", () => {
    const { container } = render(<MethodologyPage />);
    expect(screen.getByRole("heading", { name: /How Wattlas works/i })).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", { name: "On this page" });
    const expectedSections = [
      ["Overview", "#overview"],
      ["How it works", "#how-it-works"],
      ["Data sources", "#data-sources"],
      ["Evidence labels", "#evidence"],
      ["Refresh and quality", "#refresh-quality"],
      ["Limitations", "#limitations"],
    ];

    expectedSections.forEach(([name, href]) => {
      expect(within(navigation).getByRole("link", { name })).toHaveAttribute("href", href);
    });

    expect(screen.getByRole("heading", { name: "Data sources" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Evidence labels" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Limitations/i })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Open Opportunity Radar/i })[0]).toHaveAttribute("href", "/");
    expect(container.textContent).not.toContain("—");
  });

  it("uses the homepage Wattlas brand treatment", () => {
    render(<MethodologyPage />);
    expect(screen.getByLabelText("Wattlas home")).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Open source project by Aditya Gupta" })).toBeInTheDocument();
  });

  it("publishes indexable search metadata", () => {
    expect(metadata.title).toMatch(/Data Sources and Methodology/i);
    expect(metadata.alternates?.canonical).toBe("/methodology");
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
  });
});
