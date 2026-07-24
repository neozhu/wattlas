# Filtered CSV download implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an English **Download CSV** control that exports the complete global set of infrastructure assets and generators matching the current filters.

**Architecture:** Extract the shared infrastructure filter into a small map utility, then add a dependency-free export module that normalizes filtered GeoJSON features and serializes them on click. `OpportunityRadar` owns filtering and download orchestration; `LayerRail` renders only the count-aware control.

**Tech Stack:** Next.js 16, React 19, TypeScript 5, Vitest 4, Testing Library, browser Blob and object URL APIs.

## Global constraints

- Work only on `feat/filtered-csv-download`.
- Keep all user-facing copy, identifiers, tests, and documentation in English.
- Export complete client-side collections, not the current map viewport.
- Use CSV only; do not add a spreadsheet package or any other dependency.
- Start CSV output with a UTF-8 byte-order mark.
- Preserve missing values as empty cells, never inferred zeroes.
- Protect text cells from spreadsheet formula execution.
- Build normalized rows and CSV text only after the user clicks download.
- Treat the two existing `web/tests/snapshot.test.ts` failures as the accepted baseline.

---

### Task 1: Shared entity filtering

**Files:**
- Create: `web/lib/map/asset-filters.ts`
- Modify: `web/components/map/global-map.tsx`
- Modify: `web/components/controls/layer-rail.tsx`
- Create: `web/tests/filtered-entities-csv.test.ts`

**Interfaces:**
- Consumes: `AssetCollection`, `InfrastructureVisibility`, lifecycle strings.
- Produces:
  - `InfrastructureVisibility` from `web/lib/map/asset-filters.ts`
  - `filterInfrastructureAssets(assets, infrastructure, lifecycles): AssetCollection`

- [ ] **Step 1: Write the failing filter test**

Create assets for each infrastructure category and lifecycle. Assert that:

```typescript
const result = filterInfrastructureAssets(
  assets,
  {
    dataCentres: true,
    water: false,
    industrial: false,
    hydrogen: false,
    generators: false,
  },
  new Set(["operational"]),
);

expect(result.features.map(({ properties }) => properties.id)).toEqual([
  "data-centre-1",
]);
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts
```

Expected: FAIL because `@/lib/map/asset-filters` does not exist.

- [ ] **Step 3: Add the shared filter**

Implement:

```typescript
export function filterInfrastructureAssets(
  assets: AssetCollection,
  infrastructure: InfrastructureVisibility,
  lifecycles: ReadonlySet<string>,
): AssetCollection
```

Map `data_centre`, `water_infrastructure`, `industrial_load`, and
`hydrogen_infrastructure` to their existing switches. Require the lifecycle to
be present in `lifecycles`. Move `InfrastructureVisibility` into the shared
module and import it from both map and control components.

- [ ] **Step 4: Replace `GlobalMap.visibleAssets`**

Import `filterInfrastructureAssets` in `global-map.tsx`, remove the private
duplicate, and preserve both existing call sites.

- [ ] **Step 5: Run the target test and map tests**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts global-map.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit the shared filter**

```bash
git add web/lib/map/asset-filters.ts web/components/map/global-map.tsx web/components/controls/layer-rail.tsx web/tests/filtered-entities-csv.test.ts
git commit -m "refactor: share infrastructure asset filters"
```

### Task 2: Stable CSV normalization and serialization

**Files:**
- Create: `web/lib/export/filtered-entities-csv.ts`
- Modify: `web/tests/filtered-entities-csv.test.ts`

**Interfaces:**
- Consumes:
  - `selectFilteredEntities(input: FilteredEntitySelectionInput)`
  - `serializeFilteredEntities(input: FilteredEntityCsvInput)`
  - `filteredEntityFilename(date: Date)`
- Produces:
  - `FilteredEntities = { assets: AssetFeature[]; generators: GeneratorFeature[] }`
  - UTF-8 CSV text with the approved 39-column schema.

- [ ] **Step 1: Write failing selection tests**

Assert that `selectFilteredEntities`:

```typescript
expect(
  selectFilteredEntities({
    assets,
    generators,
    infrastructure,
    technologies: new Set(["hydro"]),
    lifecycles: new Set(["operational"]),
    capacityRange: { minMw: 100, maxMw: null },
  }).generators.map(({ properties }) => properties.id),
).toEqual(["hydro-1"]);
```

Also assert that disabling generators returns no generator rows while retaining
matching infrastructure assets.

- [ ] **Step 2: Run selection tests and verify RED**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts
```

Expected: FAIL because `selectFilteredEntities` is not exported.

- [ ] **Step 3: Implement selection**

Call `filterInfrastructureAssets` for assets and `filterGenerators` for
generators. Wrap the generator feature array in a `FeatureCollection`. Return
an empty generator array when the generator layer is disabled.

- [ ] **Step 4: Write failing serialization tests**

Use one infrastructure feature and one generator feature. Assert:

```typescript
expect(csv.startsWith("\uFEFFexported_at,snapshot_id,selected_year")).toBe(true);
expect(csv).toContain("asset-1,Alpha DC,asset,data_centre");
expect(csv).toContain("generator-1,Rhine Hydro,generator,power_generation");
expect(csv).toContain("hydro");
expect(csv.split("\n")[1].split(",")[20]).toBe("");
```

Add focused cases for commas, doubled quotes, newlines, semicolon-joined arrays,
addresses, low/central/high ranges, coordinates, negative numbers, and empty
values.

- [ ] **Step 5: Write failing formula-safety tests**

Assert that text beginning with a formula marker after spaces, tabs, or carriage
returns receives an apostrophe, while numeric `-12.5` remains numeric.

- [ ] **Step 6: Implement the stable schema**

Define a readonly `CSV_COLUMNS` tuple matching the design. Normalize assets and
generators into `Record<CsvColumn, string | number | null | undefined>`.
Serialize cells in column order. Quote fields containing commas, quotes, CR, or
LF. Prefix unsafe text before quoting.

- [ ] **Step 7: Implement deterministic filenames**

Implement:

```typescript
export function filteredEntityFilename(date: Date): string
```

Use local `getFullYear()`, `getMonth() + 1`, and `getDate()` values with
two-digit month and day padding. Return
`wattlas-filtered-entities-YYYY-MM-DD.csv`.

- [ ] **Step 8: Run target tests and verify GREEN**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts
```

Expected: PASS.

- [ ] **Step 9: Commit normalization and serialization**

```bash
git add web/lib/export/filtered-entities-csv.ts web/tests/filtered-entities-csv.test.ts
git commit -m "feat: serialize filtered entities as CSV"
```

### Task 3: Browser download trigger

**Files:**
- Modify: `web/lib/export/filtered-entities-csv.ts`
- Modify: `web/tests/filtered-entities-csv.test.ts`

**Interfaces:**
- Consumes: finalized CSV text and filename.
- Produces: `downloadCsv(csv: string, filename: string): void`.

- [ ] **Step 1: Write the failing browser API test**

Mock `URL.createObjectURL`, `URL.revokeObjectURL`, `HTMLAnchorElement.click`,
and `setTimeout`. Assert that `downloadCsv`:

```typescript
expect(URL.createObjectURL).toHaveBeenCalledWith(
  expect.any(Blob),
);
expect(click).toHaveBeenCalledOnce();
expect(URL.revokeObjectURL).not.toHaveBeenCalled();
```

Run the captured timeout callback, then assert revocation with the generated
URL.

- [ ] **Step 2: Run the test and verify RED**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts
```

Expected: FAIL because `downloadCsv` is not exported.

- [ ] **Step 3: Implement the download trigger**

Create a `text/csv;charset=utf-8` Blob, create an object URL, append an anchor
with `download=filename`, click it, remove it, then call
`window.setTimeout(() => URL.revokeObjectURL(url), 0)`.

- [ ] **Step 4: Run target tests and verify GREEN**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit the browser trigger**

```bash
git add web/lib/export/filtered-entities-csv.ts web/tests/filtered-entities-csv.test.ts
git commit -m "feat: trigger filtered CSV downloads"
```

### Task 4: Filter rail download control

**Files:**
- Modify: `web/components/controls/layer-rail.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`
- Modify: `web/app/globals.css`

**Interfaces:**
- Consumes these new `LayerRail` props:
  - `downloadCount?: number`
  - `downloadDisabled?: boolean`
  - `onDownload?: () => void`
- Produces an English **Download CSV** button with a count-aware accessible
  label.

- [ ] **Step 1: Write failing component assertions**

Render `OpportunityRadar` with the existing fixture and assert:

```typescript
expect(
  screen.getByRole("button", {
    name: "Download 1 filtered row as CSV",
  }),
).toBeEnabled();
```

Toggle off the final matching infrastructure layer and assert the button becomes
disabled. Enable generators before the catalogue resolves and assert the button
is disabled.

- [ ] **Step 2: Run the component test and verify RED**

Run:

```bash
cd web && npm test -- opportunity-radar.test.tsx
```

Expected: FAIL because the download button does not exist.

- [ ] **Step 3: Add the `LayerRail` props and button**

Render the button after the lifecycle controls. Use:

```tsx
aria-label={`Download ${downloadCount.toLocaleString()} filtered ${
  downloadCount === 1 ? "row" : "rows"
} as CSV`}
```

Set `disabled={downloadDisabled || downloadCount === 0}` and call `onDownload`
only through the normal button click.

- [ ] **Step 4: Add focused styles**

Add `.download-csv-button` beside `.advanced-filter-toggle`. Reuse the existing
border, radius, mono font, hover color, disabled cursor, and disabled opacity.
Add one horizontal-rail rule so the button keeps an intrinsic width.

- [ ] **Step 5: Run the component test**

Run:

```bash
cd web && npm test -- opportunity-radar.test.tsx
```

Expected: the new control assertions pass.

- [ ] **Step 6: Commit the filter rail control**

```bash
git add web/components/controls/layer-rail.tsx web/tests/opportunity-radar.test.tsx web/app/globals.css
git commit -m "feat: add filtered CSV download control"
```

### Task 5: Opportunity Radar export integration

**Files:**
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`

**Interfaces:**
- Consumes `selectFilteredEntities`, `serializeFilteredEntities`,
  `filteredEntityFilename`, and `downloadCsv`.
- Produces click-time CSV creation from the current snapshot and filter state.

- [ ] **Step 1: Add failing integration tests**

Mock only `downloadCsv`. Assert that clicking **Download CSV** sends CSV
whose header starts with `exported_at,snapshot_id,selected_year` and whose data
row contains:

```text
2026-06-27T04-12-00Z
2026
Alpha DC
```

Change the year to 2031 and assert `selected_year=2031`. Disable all
infrastructure layers and assert zero rows disables the button. Keep generators
disabled while their catalogue loads and assert infrastructure export remains
enabled.

- [ ] **Step 2: Run the integration tests and verify RED**

Run:

```bash
cd web && npm test -- opportunity-radar.test.tsx
```

Expected: FAIL because `OpportunityRadar` does not pass download props.

- [ ] **Step 3: Memoize filtered feature references**

Use `useMemo` to call `selectFilteredEntities` from current asset, generator,
layer, technology, lifecycle, and capacity state. Calculate the count from the
two feature array lengths. Do not normalize rows or serialize CSV in `useMemo`.

- [ ] **Step 4: Implement the click handler**

Inside the event handler, create one `Date`, call `serializeFilteredEntities`
with the selected features, `snapshot.manifest.snapshotId`, selected year, and
`date.toISOString()`, then call `downloadCsv` with the local-date filename.

- [ ] **Step 5: Pass control state to `LayerRail`**

Disable export only when the count is zero or the enabled generator layer lacks
a ready catalogue. Pass count and handler to the new props.

- [ ] **Step 6: Run integration and export tests**

Run:

```bash
cd web && npm test -- filtered-entities-csv.test.ts opportunity-radar.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the application integration**

```bash
git add web/components/opportunity-radar.tsx web/tests/opportunity-radar.test.tsx
git commit -m "feat: export current filtered entities"
```

### Task 6: Verification and branch handoff

**Files:**
- Verify all files changed by Tasks 1 through 5.

**Interfaces:**
- Consumes the completed feature.
- Produces verification evidence and a focused feature commit.

- [ ] **Step 1: Run target tests**

```bash
cd web && npm test -- filtered-entities-csv.test.ts opportunity-radar.test.tsx global-map.test.tsx
```

- [ ] **Step 2: Run the full frontend suite**

```bash
cd web && npm test
```

Expected: every new test passes; only the same two recorded `snapshot.test.ts`
baseline failures may remain in the full suite.

- [ ] **Step 3: Run lint**

```bash
cd web && npm run lint
```

Expected: exit 0.

- [ ] **Step 4: Run the production build**

```bash
cd web && npm run build
```

Expected: exit 0.

- [ ] **Step 5: Inspect the diff**

```bash
git diff --check
git status --short
git diff --stat origin/main...HEAD
```

Confirm that every changed production line traces to filtered CSV export.
