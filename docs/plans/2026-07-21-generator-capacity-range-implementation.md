# Generator Capacity Range Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an accessible preset-plus-custom minimum/maximum MW filter for power generators, preserve exact facility filtering and honest low-zoom aggregation, and serve the ENTSO-E-enabled snapshot locally for review.

**Architecture:** A small capacity-domain module owns range normalization, matching, labels, and logarithmic slider conversion. `OpportunityRadar` owns the committed range and full generator catalogue; `LayerRail` renders a dedicated editor; `GlobalMap` applies the range to loaded country shards. When a non-default range is active, the full catalogue is regrouped into the published overview geography so world-scale markers represent only matching facilities.

**Tech Stack:** TypeScript, React 19, Next.js 16, MapLibre GL, Vitest, Testing Library, CSS, immutable JSON/GeoJSON snapshots.

---

### Task 1: Add the capacity range domain model

**Files:**
- Create: `web/lib/map/generator-capacity.ts`
- Create: `web/tests/generator-capacity.test.ts`

**Step 1: Write failing range tests**

Cover the default range, inclusive minimum and maximum boundaries, exclusion of zero/unknown capacity above 0 MW, normalization of negative or inverted values, active summaries, and reversible logarithmic slider conversion.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- generator-capacity.test.ts`

Expected: FAIL because `generator-capacity.ts` does not exist.

**Step 3: Implement the minimal domain module**

Export:

```ts
export type GeneratorCapacityRange = { minMw: number; maxMw: number | null };
export const ALL_GENERATOR_CAPACITIES = { minMw: 0, maxMw: null };
export const GENERATOR_CAPACITY_PRESETS_MW = [0, 10, 25, 50, 100, 250, 500, 1000] as const;
export function normalizeCapacityRange(...): GeneratorCapacityRange;
export function generatorMatchesCapacity(capacityMw: number, range: GeneratorCapacityRange): boolean;
export function capacityRangeLabel(range: GeneratorCapacityRange): string;
export function capacityToSliderPosition(...): number;
export function sliderPositionToCapacity(...): number | null;
```

Use inclusive comparisons. Treat slider position 1000 for the maximum handle as No limit. Keep exact numeric fields authoritative.

**Step 4: Run the focused test and verify GREEN**

Run: `npm test -- generator-capacity.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add web/lib/map/generator-capacity.ts web/tests/generator-capacity.test.ts
git commit -m "feat: model generator capacity ranges"
```

### Task 2: Apply the range to facilities and world overviews

**Files:**
- Modify: `web/lib/map/generator-shards.ts`
- Modify: `web/tests/generator-colors.test.ts`

**Step 1: Write failing filtering tests**

Add tests proving that technology, lifecycle, and capacity conditions are all required; 10 MW and 250 MW boundaries are included; zero-capacity records disappear for positive minimums; and custom finite maximums work.

Add overview regrouping tests using two base geographies and plants above/below the range. Assert count, total/operating/planned capacity, technology mix, dominant technology, country, and geometry.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- generator-colors.test.ts`

Expected: FAIL because filter functions do not accept or aggregate a capacity range.

**Step 3: Implement facility filtering and overview regrouping**

Extend `filterGenerators` with an optional defaulted range so existing callers remain safe. Add `buildCapacityFilteredGeneratorOverview(catalogue, publishedOverview, range)` that:

- returns the published overview for the default range;
- filters plants by total `capacityMw` for active ranges;
- groups matching plants by `geographyId` using published overview geometry;
- sums facility count, capacity, operating/planned capacity, and technology mix;
- derives the dominant technology deterministically;
- never uses a region's aggregate capacity as if it were a plant capacity.

**Step 4: Run the focused test and verify GREEN**

Run: `npm test -- generator-colors.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add web/lib/map/generator-shards.ts web/tests/generator-colors.test.ts
git commit -m "feat: filter generator shards by capacity"
```

### Task 3: Build the hybrid capacity editor

**Files:**
- Create: `web/components/controls/generator-capacity-filter.tsx`
- Create: `web/tests/generator-capacity-filter.test.tsx`
- Modify: `web/app/globals.css`

**Step 1: Write failing component tests**

Test all eight minimum presets, the synchronized minimum and maximum numeric fields, No limit, inclusive summary text, positive-minimum unknown-capacity disclosure, Reset, keyboard commit, invalid range handling, and disabled styling when the generator layer is off.

**Step 2: Run the focused test and verify RED**

Run: `npm test -- generator-capacity-filter.test.tsx`

Expected: FAIL because the component does not exist.

**Step 3: Implement the component**

Render compact preset buttons, two overlapping accessible range inputs, Min MW and Max MW numeric inputs, the active summary, conditional unknown-capacity disclosure, and Reset. Maintain draft strings/slider positions locally; call `onChange` only for preset/reset, slider release, numeric blur, or Enter.

**Step 4: Style within the current light rail**

Add compact grid, active preset, dual-track, thumb, numeric field, validation, and responsive rules. Reuse current rail colors, borders, radii, and typography.

**Step 5: Run the focused test and verify GREEN**

Run: `npm test -- generator-capacity-filter.test.tsx`

Expected: PASS.

**Step 6: Commit**

```bash
git add web/components/controls/generator-capacity-filter.tsx web/tests/generator-capacity-filter.test.tsx web/app/globals.css
git commit -m "feat: add hybrid generator capacity control"
```

### Task 4: Wire range state through the application and map

**Files:**
- Modify: `web/components/controls/layer-rail.tsx`
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/components/map/global-map.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`
- Modify: `web/tests/global-map.test.tsx`

**Step 1: Write failing integration tests**

Test that `LayerRail` exposes the control under Power generators, presets update the range, the range survives disabling/re-enabling generators, an 80 MW selected generator closes when minimum becomes 100 MW, analytics records the committed range, and `GlobalMap` passes the range into shard filtering.

Test low-zoom truthfulness: default range uses the published overview immediately; active range uses an empty overview while the full catalogue is loading; once ready, the regrouped filtered overview is used.

**Step 2: Run the integration tests and verify RED**

Run: `npm test -- opportunity-radar.test.tsx global-map.test.tsx`

Expected: FAIL because no capacity props/state exist.

**Step 3: Wire committed state and catalogue**

In `OpportunityRadar`:

- add `capacityRange` state with the All default;
- retain all loaded generator features, not only named ones;
- derive named search generators after applying the range;
- derive maximum known capacity for the slider;
- build a range-filtered overview only when the catalogue is ready;
- clear a selected generator that no longer matches;
- track `filter_changed` with `generator_capacity` and a stable range value.

**Step 4: Wire controls and detailed map filtering**

Pass range props through `LayerRail` to the editor and through `GlobalMap` to `filterGenerators`. Update filter refs and effects so loaded shards are re-filtered after a committed range change without reloading the map.

**Step 5: Run focused integration tests and verify GREEN**

Run: `npm test -- opportunity-radar.test.tsx global-map.test.tsx`

Expected: PASS.

**Step 6: Commit**

```bash
git add web/components/controls/layer-rail.tsx web/components/opportunity-radar.tsx web/components/map/global-map.tsx web/tests/opportunity-radar.test.tsx web/tests/global-map.test.tsx
git commit -m "feat: connect capacity range to Wattlas map"
```

### Task 5: Verify the integrated local candidate

**Files:**
- Inspect: `web/public/data/latest.json`
- Inspect: `web/public/data/snapshots/2026-07-21T11-46-20Z/entsoe-monthly.json`
- Modify only if tests reveal an issue.

**Step 1: Run the complete web suite**

Run: `npm test`

Expected: all tests PASS.

**Step 2: Run lint and production build**

Run: `npm run lint`

Expected: PASS with no errors.

Run: `npm run build`

Expected: PASS with the map and methodology routes generated.

**Step 3: Validate published ENTSO-E evidence without exposing the credential**

Confirm the latest manifest points to `entsoe-monthly.json`, the aggregate parses, and the connector reports a successful observation. Search tracked files for token-shaped secrets and confirm none are present.

**Step 4: Start local hosting**

Run: `npm run dev -- --hostname 127.0.0.1 --port 3003`

Expected: server ready at `http://127.0.0.1:3003`.

**Step 5: Browser verification**

Verify India is initially selected and centered, the light globe loads, ENTSO-E-enabled data is available, all presets and custom min/max values update generator markers, unknown capacity disclosure is correct, technology/status filters still compose, generator dossiers remain functional, and the layout works at desktop and narrow widths.

**Step 6: Stop before publication**

Report the local URL and verification results. Do not push to GitHub or deploy to Vercel until explicit owner approval.
