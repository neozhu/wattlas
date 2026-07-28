# Wattlas Mobile and Branding Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename the public descriptor to “Global Energy Infrastructure Map,” replace the default favicon with a green Wattlas `W`, and add a map-first mobile experience without changing desktop presentation or analytical behaviour.

**Architecture:** Keep one shared Opportunity Radar state and data path. Add mobile-only presentation components for the control dock and modal bottom sheets, while reusing the existing search, layer, lens, timeline and inspector logic. Gate the new presentation entirely behind the existing 680px breakpoint and protect desktop rendering with explicit regression tests and screenshots.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, existing CSS design tokens, MapLibre GL, Vitest, Testing Library and Playwright. Do not add Konsta UI, Sailboat UI or another production dependency.

---

## Preconditions

The earlier disk cleanup removed reproducible dependencies. Before implementation:

1. Run `npm ci` from `web/`.
2. Run `npm test -- --run` to establish the restored baseline.
3. Run `npm run build` to confirm the baseline production build.
4. Do not modify generated snapshot data or pipeline inputs.

### Task 1: Product metadata and Wattlas favicon

**Files:**
- Modify: `web/app/layout.tsx`
- Replace: `web/app/favicon.ico`
- Create: `web/app/icon.svg`
- Create: `web/app/apple-icon.png`
- Create: `web/tests/branding-metadata.test.ts`
- Modify: `web/tests/e2e/radar.spec.ts`

**Step 1: Write the failing metadata test**

Create `branding-metadata.test.ts` to read `app/layout.tsx` and assert:

```ts
expect(layout).toContain('title: "Wattlas | Global Energy Infrastructure Map"');
expect(layout).toContain("Explore global energy demand, power generation");
expect(layout).not.toContain("Global Infrastructure Opportunity Radar");
```

Read `app/icon.svg` and assert that it contains the Wattlas green value `#167C68`, an accessible `<title>Wattlas</title>`, and a visible `W` path or text element.

**Step 2: Update the Playwright title assertion**

Change the desktop title expectation in `tests/e2e/radar.spec.ts` to:

```ts
await expect(page).toHaveTitle("Wattlas | Global Energy Infrastructure Map");
```

**Step 3: Run the focused tests and confirm failure**

Run:

```bash
npm test -- --run tests/branding-metadata.test.ts
```

Expected: FAIL because the old title and favicon are still present.

**Step 4: Implement the approved metadata**

Update `layout.tsx` with:

- Browser title: `Wattlas | Global Energy Infrastructure Map`
- Search description: `Explore global energy demand, power generation, infrastructure projects and regional electricity opportunities on one interactive map.`
- Open Graph title and description
- Twitter card title and description
- Application name `Wattlas`
- Theme colour `#167C68`

Do not add “live,” “real-time,” or “complete.”

**Step 5: Create favicon assets**

Create a transparent square SVG master with:

- One uppercase geometric `W`
- Fill `#167C68`
- Strong strokes and generous internal spacing at 16px
- No decorative map detail

Generate the ICO and Apple-touch PNG from the same master. Inspect all outputs at 16px, 32px and 180px before accepting them.

**Step 6: Run focused tests**

Run:

```bash
npm test -- --run tests/branding-metadata.test.ts
```

Expected: PASS.

**Step 7: Commit**

```bash
git add web/app/layout.tsx web/app/favicon.ico web/app/icon.svg web/app/apple-icon.png web/tests/branding-metadata.test.ts web/tests/e2e/radar.spec.ts
git commit -m "feat: clarify Wattlas branding and favicon"
```

### Task 2: Accessible mobile sheet primitive

**Files:**
- Create: `web/components/mobile/mobile-sheet.tsx`
- Create: `web/tests/mobile-sheet.test.tsx`

**Step 1: Write failing component tests**

Cover:

- Closed sheet renders no dialog.
- Open sheet renders `role="dialog"` with `aria-modal="true"`.
- The title is connected through `aria-labelledby`.
- Escape calls `onClose`.
- Clicking the backdrop calls `onClose`.
- Clicking inside the sheet does not close it.
- Initial focus enters the sheet.
- Closing restores focus to the supplied trigger.

**Step 2: Run the test and verify failure**

```bash
npm test -- --run tests/mobile-sheet.test.tsx
```

Expected: FAIL because the component does not exist.

**Step 3: Implement the minimal primitive**

`MobileSheet` accepts:

```ts
type MobileSheetProps = {
  id: string;
  title: string;
  open: boolean;
  size?: "compact" | "medium" | "full";
  triggerRef?: RefObject<HTMLElement | null>;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};
```

Requirements:

- Render through normal React markup, not a new dependency.
- Add a drag-handle visual but keep closing actions explicit and accessible.
- Close on Escape and backdrop.
- Prevent background scroll only while open on mobile.
- Restore focus on close.
- Respect reduced motion through CSS.

**Step 4: Run focused tests**

```bash
npm test -- --run tests/mobile-sheet.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/mobile/mobile-sheet.tsx web/tests/mobile-sheet.test.tsx
git commit -m "feat: add accessible mobile bottom sheet"
```

### Task 3: Mobile control dock

**Files:**
- Create: `web/components/mobile/mobile-control-dock.tsx`
- Create: `web/tests/mobile-control-dock.test.tsx`

**Step 1: Write failing tests**

Assert that the dock provides:

- `Layers` button with active-filter count
- `View` button with the current lens label
- `Year` button with the active year
- `aria-expanded` state for the active sheet
- One callback per control

**Step 2: Verify failure**

```bash
npm test -- --run tests/mobile-control-dock.test.tsx
```

Expected: FAIL because the dock does not exist.

**Step 3: Implement the dock**

Use compact icon-plus-label buttons with 44px minimum targets. Keep the component presentational and pass all values and callbacks from `OpportunityRadar`.

**Step 4: Run focused tests**

```bash
npm test -- --run tests/mobile-control-dock.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/mobile/mobile-control-dock.tsx web/tests/mobile-control-dock.test.tsx
git commit -m "feat: add mobile map control dock"
```

### Task 4: Mobile filter and view sheets

**Files:**
- Modify: `web/components/controls/layer-rail.tsx`
- Modify: `web/components/controls/generator-capacity-filter.tsx`
- Create: `web/components/mobile/mobile-filter-sheet.tsx`
- Create: `web/components/mobile/mobile-view-sheet.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`
- Create: `web/tests/mobile-filter-sheet.test.tsx`

**Step 1: Add failing filter-sheet tests**

Cover:

- Infrastructure, generator technology, project status, capacity and explanation groups render as accordions.
- Only the first group starts expanded.
- `Clear all` disables every infrastructure and technology layer.
- `Restore defaults` returns to the existing clean default map.
- `Show results` closes the sheet without resetting filters.
- Active filter count updates from controlled props.
- Existing desktop switches retain their accessible names and behaviour.

**Step 2: Run focused tests and verify failure**

```bash
npm test -- --run tests/mobile-filter-sheet.test.tsx tests/opportunity-radar.test.tsx
```

Expected: FAIL for missing mobile controls.

**Step 3: Refactor reusable control content**

Extract reusable sections from `LayerRail` only where needed. Do not duplicate the filtering rules or maintain separate mobile filter state.

Add controlled callbacks for:

- Clear all
- Restore defaults
- Show results

The desktop `LayerRail` markup and behaviour must remain unchanged unless the same refactor is required to share content.

**Step 4: Implement mobile view sheet**

Render the four existing lenses:

- Infrastructure Demand
- Site Attractiveness
- System Risk
- Power Balance

Use the same `lens` value and `onChange` callback already owned by `OpportunityRadar`.

**Step 5: Run focused tests**

```bash
npm test -- --run tests/mobile-filter-sheet.test.tsx tests/opportunity-radar.test.tsx
```

Expected: PASS.

**Step 6: Commit**

```bash
git add web/components/controls/layer-rail.tsx web/components/controls/generator-capacity-filter.tsx web/components/mobile/mobile-filter-sheet.tsx web/components/mobile/mobile-view-sheet.tsx web/tests/mobile-filter-sheet.test.tsx web/tests/opportunity-radar.test.tsx
git commit -m "feat: organize mobile map filters"
```

### Task 5: Mobile year and selection-detail sheets

**Files:**
- Modify: `web/components/controls/timeline.tsx`
- Modify: `web/components/map/project-summary-card.tsx`
- Create: `web/components/mobile/mobile-year-sheet.tsx`
- Create: `web/components/mobile/mobile-detail-sheet.tsx`
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`
- Create: `web/tests/mobile-detail-sheet.test.tsx`

**Step 1: Add failing interaction tests**

Cover:

- Year sheet selects 2026 through 2031 using the existing callback.
- Selecting a map entity opens a compact mobile summary.
- More details expands the selected entity into a full sheet.
- Closing details preserves selected entity and camera focus state.
- Direct facility, generator, city and geography selections still do not change the camera.
- Search still changes the camera.
- Browser back closes the open sheet before navigation.

**Step 2: Run focused tests**

```bash
npm test -- --run tests/mobile-detail-sheet.test.tsx tests/opportunity-radar.test.tsx
```

Expected: FAIL before mobile sheet state is wired.

**Step 3: Add one mobile-sheet state machine**

In `OpportunityRadar`, introduce:

```ts
type MobileSheetName = "layers" | "view" | "year" | "details" | null;
```

Rules:

- Only one mobile sheet can be open.
- Selecting an entity opens the compact summary but does not move the camera.
- More details sets the mobile sheet to `details`.
- Opening a sheet pushes one shallow history state.
- `popstate` closes the active sheet.
- Desktop panel visibility state remains independent.

Do not use viewport state to change business logic. CSS controls which presentation is visible.

**Step 4: Reuse existing detail content**

Place the existing `EntityInspector` or `CountryIntelligence` inside the mobile full sheet. Do not copy score, evidence, facility or energy calculation code.

**Step 5: Run focused tests**

```bash
npm test -- --run tests/mobile-detail-sheet.test.tsx tests/opportunity-radar.test.tsx tests/global-map.test.tsx
```

Expected: PASS.

**Step 6: Commit**

```bash
git add web/components/controls/timeline.tsx web/components/map/project-summary-card.tsx web/components/mobile/mobile-year-sheet.tsx web/components/mobile/mobile-detail-sheet.tsx web/components/opportunity-radar.tsx web/tests/mobile-detail-sheet.test.tsx web/tests/opportunity-radar.test.tsx
git commit -m "feat: add mobile year and detail sheets"
```

### Task 6: Mobile header and overflow menu

**Files:**
- Modify: `web/components/controls/command-bar.tsx`
- Modify: `web/components/branding/wattlas-brand.tsx`
- Create: `web/components/mobile/mobile-overflow-menu.tsx`
- Create: `web/tests/mobile-command-bar.test.tsx`

**Step 1: Write failing tests**

Assert:

- Search remains rendered in the command bar.
- Wattlas wordmark remains visible.
- Monthly refresh is available as an accessible compact control.
- Methodology is reachable through the mobile overflow menu.
- Opportunity Radar and Asset Explorer remain reachable.
- Desktop command-bar links and buttons still render.

**Step 2: Verify failure**

```bash
npm test -- --run tests/mobile-command-bar.test.tsx
```

**Step 3: Implement responsive markup**

Add mobile-only overflow markup without removing desktop navigation. CSS determines which navigation treatment appears at 680px and below.

**Step 4: Run focused tests**

```bash
npm test -- --run tests/mobile-command-bar.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/controls/command-bar.tsx web/components/branding/wattlas-brand.tsx web/components/mobile/mobile-overflow-menu.tsx web/tests/mobile-command-bar.test.tsx
git commit -m "feat: refine Wattlas mobile header"
```

### Task 7: Mobile-only responsive styling

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/tests/responsive-controls.test.ts`

**Step 1: Extend responsive regression tests**

Add assertions that:

- Desktop base grid declarations remain present and unchanged.
- Mobile rules are contained inside `@media (max-width: 680px)`.
- Mobile map uses the available viewport between fixed header and safe-area dock.
- Desktop rail and inspector are hidden only in the mobile media block.
- Dock and sheets are hidden by default outside the mobile block.
- Mobile touch targets are at least 44px.
- Bottom controls use `env(safe-area-inset-bottom)`.
- Sheet animations are disabled under `prefers-reduced-motion`.

**Step 2: Verify test failure**

```bash
npm test -- --run tests/responsive-controls.test.ts
```

Expected: FAIL before the new mobile styles exist.

**Step 3: Implement mobile styles**

Within the 680px media block:

- Lock the application to the viewport instead of stacking a long document.
- Keep the compact header and search fixed.
- Give the map the remaining viewport.
- Position the mobile dock above the safe area.
- Style sheet backdrop, drag handle, accordion groups and sticky footer.
- Present compact selection card above the dock.
- Convert full detail content to a scrollable nearly full-screen sheet.
- Support landscape with a compact two-column sheet.

Do not change base desktop dimensions, desktop grid areas, desktop typography or desktop panel widths.

**Step 4: Run responsive unit tests**

```bash
npm test -- --run tests/responsive-controls.test.ts
```

Expected: PASS.

**Step 5: Commit**

```bash
git add web/app/globals.css web/tests/responsive-controls.test.ts
git commit -m "feat: style the map-first mobile layout"
```

### Task 8: End-to-end responsive verification

**Files:**
- Modify: `web/playwright.config.ts`
- Modify: `web/tests/e2e/radar.spec.ts`
- Create: `web/tests/e2e/mobile-radar.spec.ts`

**Step 1: Add mobile device projects**

Cover:

- 390 by 844
- 430 by 932
- 360 by 800
- 844 by 390 landscape

Keep the existing desktop and in-app projects unchanged.

**Step 2: Add mobile end-to-end scenarios**

Verify:

- No horizontal overflow.
- Search is visible on load.
- Map occupies the primary viewport.
- Layers, View and Year open the correct sheets.
- Filter changes affect map state and survive sheet dismissal.
- Direct project selection preserves the map camera.
- More details opens the full dossier sheet.
- Browser back closes a sheet.
- Methodology remains reachable.
- Touch targets meet minimum size.

**Step 3: Run the mobile scenarios**

```bash
npm run e2e -- tests/e2e/mobile-radar.spec.ts
```

Expected: PASS in every phone project.

**Step 4: Capture desktop regression screenshots**

Capture and compare:

- 1440 by 900
- 1280 by 800
- 1024 by 768

Confirm command bar, left rail, map, timeline and right inspector have not changed visually.

**Step 5: Run full verification**

```bash
npm run lint
npm test -- --run
npm run build
npm run e2e
```

Expected:

- Lint passes.
- All Vitest suites pass.
- Next.js production build passes.
- Desktop, in-app and mobile Playwright projects pass.

**Step 6: Commit**

```bash
git add web/playwright.config.ts web/tests/e2e/radar.spec.ts web/tests/e2e/mobile-radar.spec.ts
git commit -m "test: verify Wattlas mobile experience"
```

## Local review gate

After implementation:

1. Start the local site on the agreed local port.
2. Present the mobile version first at 390 by 844.
3. Keep a desktop tab available for side-by-side verification.
4. Do not push to GitHub or deploy to Vercel.
5. Wait for explicit approval from the owner before publishing.

## Success criteria

- The public title is `Wattlas | Global Energy Infrastructure Map`.
- The Vercel favicon is replaced by a legible green Wattlas `W`.
- Mobile opens as a map-first tool rather than a vertically stacked desktop dashboard.
- Search remains permanently accessible.
- Filters, views, years and details use accessible bottom sheets.
- Existing analytical state and calculations are shared across mobile and desktop.
- Direct selections never move the camera.
- Desktop visuals and behaviour above 680px remain unchanged.
- No new production UI dependency is added.
