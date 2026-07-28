import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Wattlas branding metadata", () => {
  const layout = readFileSync("app/layout.tsx", "utf8");

  it("describes Wattlas as the global energy infrastructure map", () => {
    expect(layout).toContain('title: "Wattlas | Global Energy Infrastructure Map"');
    expect(layout).toContain("Explore global energy demand, power generation");
    expect(layout).not.toContain("Global Infrastructure Opportunity Radar");
  });

  it("publishes a green Wattlas W as the application icon", () => {
    expect(existsSync("app/icon.svg")).toBe(true);
    if (!existsSync("app/icon.svg")) return;
    const icon = readFileSync("app/icon.svg", "utf8");
    expect(icon).toContain("#167C68");
    expect(icon).toContain("<title>Wattlas</title>");
    expect(icon).toMatch(/>W<|aria-label="W"/);
  });
});
