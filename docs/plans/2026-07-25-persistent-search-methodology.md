# Persistent Search and Product Explanations Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Put search permanently in the top navigation, simplify the header, compact the filter rail, and explain Wattlas modes and views on the methodology page.

**Architecture:** Keep the existing SearchBox and search index in OpportunityRadar, but pass the rendered search control into CommandBar instead of LayerRail. Use CSS-only layout and density changes for desktop and responsive behaviour. Add a self-contained explanatory section to MethodologyPage so product meaning stays next to the detailed method and source catalogue.

**Tech Stack:** Next.js 16, React 19, TypeScript, CSS Modules, global CSS, Vitest, Testing Library, MapLibre.

---

### Task 1: Persistent top-bar search and simplified header

**Files:**
- Modify: `web/components/controls/command-bar.tsx`
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`

**Step 1: Write the failing tests**

Add assertions that:

- Search remains present after Hide filters is clicked.
- The Map controls complementary region no longer contains Search Wattlas.
- Global and the data-source attention badge are absent.
- Monthly refreshed remains present.

**Step 2: Run the focused test**

Run:

```bash
cd web
npm test -- --run tests/opportunity-radar.test.tsx
```

Expected: FAIL because search is currently rendered inside LayerRail and the header labels remain.

**Step 3: Implement changes 1 through 6**

- Add `searchSlot?: ReactNode` to CommandBar.
- Render the slot in a `.command-search` wrapper.
- Remove the Global label and command divider.
- Remove connector-attention rendering and its unused import.
- Pass SearchBox to CommandBar from OpportunityRadar.
- Stop passing `searchSlot` to LayerRail.

**Step 4: Run focused tests**

Run:

```bash
npm test -- --run tests/opportunity-radar.test.tsx tests/search-box.test.tsx
```

Expected: PASS.

### Task 2: Compact rail and responsive header

**Files:**
- Modify: `web/app/globals.css`
- Modify: `web/tests/responsive-controls.test.ts`
- Modify: `web/tests/analytics-layout.test.ts`

**Step 1: Write failing CSS-contract tests**

Assert the stylesheet includes:

- A centred `.command-search`.
- A header layout without `border-left` on freshness.
- A compact two-column technology grid on desktop.
- A compact two-column lens grid.
- A mobile header row that keeps `.command-search` visible.

**Step 2: Run the focused tests**

Run:

```bash
npm test -- --run tests/responsive-controls.test.ts tests/analytics-layout.test.ts
```

Expected: FAIL because the new layout contracts do not exist.

**Step 3: Implement changes 7 and 10**

- Make CommandBar position relative.
- Centre `.command-search` in the viewport on desktop.
- Reduce freshness width and remove its left divider.
- Remove the brand divider.
- Reduce rail section padding and vertical gaps.
- Use two columns for generator technologies and analytical views on desktop.
- Keep vertical scrolling as a fallback.
- Use a two-row mobile command bar with search on the second row.

**Step 4: Run focused tests**

Run:

```bash
npm test -- --run tests/responsive-controls.test.ts tests/analytics-layout.test.ts tests/opportunity-radar.test.tsx
```

Expected: PASS.

### Task 3: Explain modes and analytical views

**Files:**
- Modify: `web/components/methodology/methodology-page.tsx`
- Modify: `web/app/methodology/methodology.module.css`
- Modify: `web/tests/methodology.test.tsx`

**Step 1: Write the failing test**

Assert the methodology page includes:

- A How to read Wattlas heading.
- Opportunity Radar and Asset Explorer explanations.
- Plain-language explanations for all four analytical views.

**Step 2: Run the focused test**

Run:

```bash
npm test -- --run tests/methodology.test.tsx
```

Expected: FAIL because the explanatory section is not present.

**Step 3: Implement changes 8 and 9**

Add a new section after the story:

- Two mode cards comparing Opportunity Radar and Asset Explorer.
- Four view cards for Infrastructure Demand, Site Attractiveness, System Risk, and Power Balance.
- Human, direct wording with no unexplained modelling terms.

Add matching responsive CSS in the methodology module.

**Step 4: Run focused tests**

Run:

```bash
npm test -- --run tests/methodology.test.tsx
```

Expected: PASS.

### Task 4: Full verification and local preview

**Files:**
- Verify all modified files.

**Step 1: Run formatting and diff checks**

```bash
git diff --check
```

Expected: no output.

**Step 2: Run the full test suite**

```bash
cd web
npm test -- --run
```

Expected: all tests pass.

**Step 3: Run the production build**

```bash
npm run build
```

Expected: successful static generation of `/` and `/methodology`.

**Step 4: Host locally**

```bash
npm run dev -- --hostname 127.0.0.1 --port 3003
```

Expected: Wattlas available at `http://127.0.0.1:3003/`.

**Step 5: Browser verification**

Verify:

- Search is centred in the top bar.
- Search remains after filters are hidden.
- Removed header labels and dividers are absent.
- The compact rail fits more controls at 1366 by 768.
- The methodology section is readable and responsive.
- No console errors appear.

Do not push until the user approves the local result.
