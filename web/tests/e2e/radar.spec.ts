import { expect, test } from "@playwright/test";
import latestSnapshot from "../../public/data/latest.json" with { type: "json" };

test("renders the map and updates the analytical view", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop interaction assertion");
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Wattlas | Global Energy Infrastructure Map");
  await expect(page.getByText("Monthly refreshed", { exact: true })).toBeVisible();
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".map-container")).toHaveAttribute("data-map-loaded", "true");
  await expect(page.locator(".map-panel")).toHaveAttribute("data-admin1-count", "3229", { timeout: 30_000 });
  await expect(page.locator(".map-meta")).toContainText("246 countries");
  await expect(page.locator(".map-meta")).toContainText(`${latestSnapshot.coverage.assets} infrastructure assets`);
  await expect(page.getByRole("link", { name: "Open source project by Aditya Gupta" })).toBeVisible();

  const mapBox = await page.locator(".map-container").boundingBox();
  expect(mapBox?.height).toBeGreaterThan(300);
  expect(mapBox?.width).toBeGreaterThan(300);

  const search = page.getByRole("link", { name: /Search Google for/i });
  await expect(search).toHaveAttribute("href", /https:\/\/www\.google\.com\/search\?q=/);
  const selectedName = await page.locator(".inspector-title-row h1").innerText();
  expect(new URL((await search.getAttribute("href"))!).searchParams.get("q")).toBe(selectedName);
  const expandedWidth = mapBox?.width ?? 0;
  await page.getByRole("button", { name: "Hide filters" }).click();
  const showFilters = page.getByRole("button", { name: "Show filters" });
  await expect(showFilters).toBeVisible();
  const showFiltersBox = await showFilters.boundingBox();
  expect(showFiltersBox?.x).toBeLessThan((mapBox?.x ?? 0) + 100);
  await expect.poll(async () => (await page.locator(".map-container").boundingBox())?.width ?? 0).toBeGreaterThan(expandedWidth);
  await showFilters.click();
  await expect(page.getByRole("button", { name: "Hide filters" })).toBeVisible();

  const separator = page.getByRole("separator", { name: "Resize details panel" });
  const separatorBox = await separator.boundingBox();
  const inspectorBefore = await page.locator(".region-inspector").boundingBox();
  if (!separatorBox || !inspectorBefore) throw new Error("Inspector resize controls unavailable");
  await page.mouse.move(separatorBox.x + separatorBox.width / 2, separatorBox.y + 120);
  await page.mouse.down();
  await page.mouse.move(separatorBox.x - 80, separatorBox.y + 120);
  await page.mouse.up();
  await expect.poll(async () => (await page.locator(".region-inspector").boundingBox())?.width ?? 0).toBeGreaterThan(inspectorBefore.width);

  await page.getByRole("button", { name: "System Risk", exact: true }).click();
  await page.getByRole("button", { name: "2031", exact: true }).click();
  await expect(page.getByRole("button", { name: "System Risk", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "2031", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".map-meta")).toContainText("System Risk");
  await expect(page.locator(".map-meta")).toContainText("2031");

  await page.locator(".freshness-control").click();
  await expect(page.getByRole("complementary", { name: "Data source status" })).toBeVisible();
  await page.getByRole("button", { name: "Close data source status", exact: true }).click();
  await page.getByRole("button", { name: "Open evidence dossier", exact: true }).click();
  await expect(page.getByRole("complementary", { name: "Evidence dossier" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("keeps the analytical canvas usable in the in-app pane", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "in-app-pane", "narrow-pane assertion");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".maplibregl-canvas")).toBeVisible();
  await expect(page.locator(".map-container")).toHaveAttribute("data-map-loaded", "true");

  const layout = await page.evaluate(() => {
    const map = document.querySelector(".map-panel")?.getBoundingClientRect();
    const inspector = document.querySelector(".region-inspector")?.getBoundingClientRect();
    return {
      viewport: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      map: map ? { left: map.left, right: map.right, width: map.width } : null,
      inspector: inspector ? { left: inspector.left, right: inspector.right, width: inspector.width } : null,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewport);
  expect(layout.map?.width).toBeGreaterThan(300);
  expect(layout.inspector?.width).toBe(300);
  expect(layout.map?.right).toBeLessThanOrEqual(layout.inspector?.left ?? 0);
  expect(layout.inspector?.right).toBeLessThanOrEqual(layout.viewport);

  await expect(page.locator(".data-attribution")).toHaveCount(0);
});

test("methodology page uses normal document scrolling", async ({ page }) => {
  await page.goto("/methodology", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "How Wattlas puts the energy picture together" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /source families in one place/ })).toBeVisible();

  const before = await page.evaluate(() => ({
    scrollY: window.scrollY,
    scrollHeight: document.documentElement.scrollHeight,
    viewportHeight: window.innerHeight,
    scrollWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(before.scrollHeight).toBeGreaterThan(before.viewportHeight);
  expect(before.scrollWidth).toBeLessThanOrEqual(before.viewportWidth);

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);
});

test("loads published major cities into map search", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "desktop city assertion");
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".map-container")).toHaveAttribute("data-map-loaded", "true");
  const search = page.getByRole("combobox", { name: "Search Wattlas" });
  await search.fill("Mesa");
  const city = page.getByRole("option", { name: /^Mesa Million-plus city/ });
  await city.click();
  await expect(search).toHaveValue("Mesa");
});
