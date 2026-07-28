import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("responsive map controls", () => {
  const css = readFileSync("app/globals.css", "utf8");
  const mobile = css.split("/* Mobile map-first workspace */")[1]?.split("/* Mobile landscape refinement */")[0] ?? "";
  const desktop = css.split("/* Mobile map-first workspace */")[0];

  it("keeps the tablet rail reachable by horizontal scrolling", () => {
    const tablet = desktop.match(/@media \(max-width: 1024px\)([\s\S]*?)$/)?.[1] ?? "";
    expect(tablet).toMatch(/\.layer-rail\s*\{[\s\S]*overflow-x:\s*auto/);
    expect(tablet).not.toMatch(/\.layer-rail\s*\{[\s\S]*overflow:\s*hidden/);
  });

  it("replaces the stacked mobile rail with map-first 44px controls", () => {
    expect(mobile).toMatch(/\.layer-rail,[\s\S]*\.timeline[\s\S]*\{[\s\S]*display:\s*none/);
    expect(mobile).toMatch(/\.mobile-control-dock button\s*\{[\s\S]*min-height:\s*44px/);
    expect(mobile).toMatch(/\.radar-shell,[\s\S]*\.radar-shell\.filters-hidden[\s\S]*\{[\s\S]*grid-template-areas:\s*"command"\s*"map"/);
    expect(mobile).toMatch(/padding-bottom:\s*env\(safe-area-inset-bottom/);
  });

  it("keeps the restore control on the left without rendering the obsolete composition note", () => {
    expect(css).toMatch(/\.show-filters\s*\{[\s\S]*justify-self:\s*start/);
    expect(css).not.toMatch(/\.map-composition-key\s*\{/);
  });

  it("keeps filter, map navigation, and loading controls in the light theme", () => {
    expect(css).toMatch(/\.rail-toggle,\s*\.show-filters\s*\{[\s\S]*background:\s*#fff/);
    expect(css).toMatch(/\.maplibregl-ctrl-group button\s*\{[\s\S]*background-color:\s*#fff\s*!important;[\s\S]*filter:\s*none\s*!important/);
    expect(css).toMatch(/\.snapshot-loader-card\s*\{[\s\S]*background:\s*rgb\(255 255 255/);
  });

  it("keeps infrastructure names, counts, and toggles on one compact row", () => {
    expect(css).toMatch(/\.layer-row\s*\{[\s\S]*grid-template-columns:\s*24px minmax\(0, 1fr\) auto auto/);
    expect(css).toMatch(/\.layer-name\s*\{[\s\S]*?font:\s*11px/);
  });

  it("hides the desktop inspector resizer in stacked layouts", () => {
    const tablet = desktop.match(/@media \(max-width: 1024px\)([\s\S]*?)$/)?.[1] ?? "";
    expect(tablet).toMatch(/\.inspector-resizer\s*\{[\s\S]*display:\s*none/);
  });

  it("centres persistent search and compacts the desktop filter rail", () => {
    expect(css).toMatch(/\.command-search\s*\{[\s\S]*position:\s*absolute;[\s\S]*left:\s*50%;[\s\S]*transform:\s*translateX\(-50%\)/);
    expect(css).toMatch(/\.freshness-control\s*\{[\s\S]*border-left:\s*0/);
    expect(css).toMatch(/\.tech-tree\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
    expect(css).toMatch(/\.lens-list\s*\{[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)/);
  });

  it("keeps search visible in the mobile command bar", () => {
    expect(mobile).toMatch(/\.command-search\s*\{[\s\S]*display:\s*block/);
    expect(mobile).toMatch(/\.command-search\s*\{[\s\S]*grid-area:\s*search/);
  });

  it("keeps mobile-only controls out of the desktop layout", () => {
    expect(desktop).toMatch(/\.mobile-control-dock,[\s\S]*\.mobile-overflow,[\s\S]*\.mobile-sheet-layer\s*\{[\s\S]*display:\s*none/);
    expect(desktop).toMatch(/\.mobile-detail-shell\s*\{[\s\S]*display:\s*contents/);
  });

  it("uses fixed bottom sheets and a full mobile details surface", () => {
    expect(mobile).toMatch(/\.mobile-sheet-layer\s*\{[\s\S]*position:\s*fixed/);
    expect(mobile).toMatch(/\.mobile-sheet\s*\{[\s\S]*bottom:\s*0/);
    expect(mobile).toMatch(/\.mobile-detail-shell\.open\s*\{[\s\S]*position:\s*fixed/);
  });
});
