import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.startsWith("mobile"), "mobile-only assertion");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".map-container")).toHaveAttribute("data-map-loaded", "true", { timeout: 30_000 });
});

test("keeps the map primary at every approved phone viewport", async ({ page }) => {
  await expect(page.getByRole("combobox", { name: "Search Wattlas" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Mobile map controls" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Map controls" })).toBeHidden();
  await expect(page.locator(".timeline")).toBeHidden();

  const layout = await page.evaluate(() => {
    const map = document.querySelector(".map-panel")?.getBoundingClientRect();
    const dock = document.querySelector(".mobile-control-dock")?.getBoundingClientRect();
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      map: map ? { top: map.top, bottom: map.bottom, width: map.width, height: map.height } : null,
      dock: dock ? { top: dock.top, bottom: dock.bottom } : null,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.map?.width).toBe(layout.viewportWidth);
  expect(layout.map?.height).toBeGreaterThan(250);
  expect(layout.dock?.bottom).toBeLessThanOrEqual(layout.viewportHeight);
  expect(layout.dock?.top).toBeGreaterThan(layout.map?.top ?? 0);
});

test("uses shared mobile layers, view and year controls", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "full mobile interaction runs once");

  await page.getByRole("button", { name: /Layers, .* active filters/ }).click();
  const layers = page.getByRole("dialog", { name: "Map layers" });
  await expect(layers).toBeVisible();
  await expect(layers.getByRole("switch", { name: "Data centres" })).toHaveAttribute("aria-checked", "true");
  await layers.getByRole("button", { name: "Show results" }).click();
  await expect(layers).toBeHidden();

  await page.getByRole("button", { name: /View, Infrastructure Demand/ }).click();
  await page.getByRole("dialog", { name: "Choose map view" }).getByRole("button", { name: "System Risk" }).click();
  await expect(page.locator(".map-meta")).toContainText("System Risk");

  await page.getByRole("button", { name: /Year, 2026/ }).click();
  await page.getByRole("dialog", { name: "Choose analysis year" }).getByRole("button", { name: "2031" }).click();
  await expect(page.locator(".map-meta")).toContainText("2031");
});

test("opens shared selection details without replacing the map page", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "full mobile interaction runs once");

  const summary = page.getByRole("region", { name: "Selected region summary" });
  await expect(summary).toBeVisible();
  await summary.getByRole("button", { name: "More details" }).click();
  const details = page.getByRole("dialog", { name: /details$/ });
  await expect(details).toBeVisible();
  await expect(details.locator(".region-inspector")).toBeVisible();
  await page.goBack();
  await expect(details).toBeHidden();
  await expect(page.locator(".map-container")).toBeVisible();
});
