import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("responsive map controls", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("keeps the tablet rail reachable by horizontal scrolling", () => {
    const tablet = css.match(/@media \(max-width: 1024px\)([\s\S]*?)@media \(max-width: 680px\)/)?.[1] ?? "";
    expect(tablet).toMatch(/\.layer-rail\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(tablet).not.toMatch(/\.layer-rail\s*\{[\s\S]*overflow:\s*hidden/);
  });

  it("provides 44px mobile touch targets for every rail control", () => {
    const mobile = css.match(/@media \(max-width: 680px\)([\s\S]*?)@media \(prefers-reduced-motion/ )?.[1] ?? "";
    expect(mobile).toMatch(/\.layer-rail button\s*\{[\s\S]*min-height:\s*44px/);
    expect(mobile).toMatch(/\.layer-rail\s*>\s*\.rail-section:first-child,[\s\S]*\.layer-rail\s*>\s*\.infrastructure-controls\s*\{[\s\S]*flex:\s*1 1 auto/);
  });

  it("keeps the restore control on the left and the composition note on the bottom right", () => {
    expect(css).toMatch(/\.show-filters\s*\{[\s\S]*justify-self:\s*start/);
    expect(css).toMatch(/\.map-composition-key\s*\{[\s\S]*right:\s*12px[\s\S]*bottom:\s*34px/);
  });

  it("hides the desktop inspector resizer in stacked layouts", () => {
    const tablet = css.match(/@media \(max-width: 1024px\)([\s\S]*?)@media \(max-width: 680px\)/)?.[1] ?? "";
    expect(tablet).toMatch(/\.inspector-resizer\s*\{[\s\S]*display:\s*none/);
  });
});
