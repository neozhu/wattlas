# Wattlas Methodology Trust Page Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the partial and formal methodology page with a human, complete, and verifiable explanation for energy and market intelligence readers, while removing generator capacity presets and keeping precise range controls.

**Architecture:** The methodology loader will read both the governed source catalogue and the published evidence source collection from the same immutable snapshot. A pure source library builder will merge overlapping IDs, group file level variants into source families, and add presentation metadata for evidence sources without changing their published provenance. The page will render the personal story, plain language methods, regional context, industrial calculations, live publication totals, and the merged source library in the existing Wattlas design system.

**Tech Stack:** Next.js 16, React 19, TypeScript, Zod snapshot validation, CSS Modules, Vitest, Testing Library, Python snapshot pipeline artifacts.

---

### Task 1: Build the complete methodology source library

**Files:**

1. Create: `web/lib/methodology-source-profiles.ts`
2. Modify: `web/lib/methodology.ts`
3. Modify: `web/lib/snapshot/types.ts`
4. Test: `web/tests/methodology-source-library.test.ts`

**Step 1: Write failing tests**

Add tests that pass the current pattern of 32 catalogue sources and 57 evidence sources into a new `buildMethodologySourceLibrary` function. Assert that:

1. Exact duplicate IDs appear once.
2. `gem-gipt` merges into `gem-global-integrated-power-tracker`.
3. Every `worldpop-global2-*` record appears as one WorldPop family.
4. `openstreetmap-power` and `openstreetmap-infrastructure` appear as one OpenStreetMap family.
5. Catalogue governance fields take priority when both collections describe the same source.
6. The verified current snapshot resolves to 59 source families.
7. Globally applicable GEM, IEA, WorldPop, and OpenStreetMap families include Europe and all other applicable continents.
8. The filter function works for evidence, governed, supply, demand, regional, and foundational source families.

**Step 2: Run the test and verify failure**

Run:

```bash
cd web
npm test -- --run tests/methodology-source-library.test.ts
```

Expected: FAIL because the source library builder does not exist.

**Step 3: Add the source library types and profiles**

Add a `MethodologySource` type with these fields:

```ts
type MethodologySource = {
  id: string;
  name: string;
  publisher: string;
  url: string;
  categories: SourceDescriptor["categories"];
  continents: string[];
  countries: string[];
  accessMode: SourceDescriptor["accessMode"] | "public_reference";
  publicationState: SourceDescriptor["publicationState"] | "evidence_reference";
  refreshCadence: SourceDescriptor["refreshCadence"] | "source_release";
  licence: string | null;
  licenceUrl: string | null;
  notes: string | null;
  role: "supply" | "demand" | "regional" | "foundation" | "project_evidence";
  contributedToSnapshot: boolean;
};
```

Create presentation profiles only for evidence sources that do not already have governed catalogue metadata. Profiles may add publisher, geography, category, and role, but must not replace the published name, URL, tier, checksum, or licence evidence.

Implement canonical family aliases for GEM GIPT, WorldPop, and OpenStreetMap. Prefer governed catalogue fields over profile defaults. Sort the final library by contribution state, role, publisher, and name.

**Step 4: Run the test and verify success**

Run the focused test again. Expected: PASS.

**Step 5: Commit**

```bash
git add web/lib/methodology-source-profiles.ts web/lib/methodology.ts web/lib/snapshot/types.ts web/tests/methodology-source-library.test.ts
git commit -m "feat: build complete methodology source library"
```

### Task 2: Load evidence sources on the methodology route

**Files:**

1. Modify: `web/lib/snapshot/client-load.ts`
2. Modify: `web/components/methodology/methodology-loader.tsx`
3. Test: `web/tests/client-load.test.ts`

**Step 1: Write a failing loader test**

Mock `latest.json`, `source-catalog.json`, and `evidence.json`. Assert that `loadMethodologyFromStaticAssets` returns both the governed catalogue and the validated evidence source array. Assert that the evidence artifact path must match the active snapshot ID.

**Step 2: Run the focused test**

```bash
cd web
npm test -- --run tests/client-load.test.ts
```

Expected: FAIL because methodology loading currently ignores evidence sources.

**Step 3: Implement the loader change**

Fetch the catalogue and evidence artifact together after validating the manifest. Parse evidence through `evidenceSchema`. Pass `evidence.sources` to `MethodologyPage`. Keep the existing loading and error states.

**Step 4: Run the focused test**

Expected: PASS.

**Step 5: Commit**

```bash
git add web/lib/snapshot/client-load.ts web/components/methodology/methodology-loader.tsx web/tests/client-load.test.ts
git commit -m "feat: load methodology evidence sources"
```

### Task 3: Rewrite the methodology page in plain language

**Files:**

1. Modify: `web/components/methodology/methodology-page.tsx`
2. Modify: `web/components/methodology/source-catalog-table.tsx`
3. Modify: `web/tests/methodology.test.tsx`

**Step 1: Write failing content tests**

Assert that the page:

1. Does not contain `PUBLIC DATA · EXPLAINABLE METHODS · 2026–2031`.
2. Contains `Why I built Wattlas`.
3. Mentions predictive maintenance at Siemens Energy.
4. States that Wattlas is an independent open source project and not an official Siemens Energy product.
5. Contains `Adding more depth to regional data` and explains why Africa and South America needed more sources.
6. Contains `How planned projects become future electricity demand`.
7. Explains the project conversion in four steps before showing formulas.
8. Retains exact release, checksum, licence, lifecycle, ENTSO E, bidding zone, fallback, and limitation details.
9. Shows `59 source families` for the verified test fixture.
10. Contains no em dash or en dash characters in authored methodology copy.

**Step 2: Run the focused test and verify failure**

```bash
cd web
npm test -- --run tests/methodology.test.tsx
```

Expected: FAIL against the current formal copy.

**Step 3: Rewrite the page**

Use this section order:

1. Introduction.
2. Why I built Wattlas.
3. How Wattlas works.
4. Adding more depth to regional data.
5. How planned projects become future electricity demand.
6. Current publication evidence.
7. Complete source library.

Keep paragraphs short and use familiar words. Explain observed, reported, and estimated data before technical details. Use `2026 to 2031` instead of range punctuation. Use `Pre construction` instead of punctuation based compounds in public copy.

Update the source cards to accept `MethodologySource`. Display source role, contribution state, coverage, category, access, refresh, licence, and public link. Replace em dash characters in source display names with commas without modifying snapshot data.

**Step 4: Run the focused tests**

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/methodology/methodology-page.tsx web/components/methodology/source-catalog-table.tsx web/tests/methodology.test.tsx
git commit -m "feat: explain Wattlas methodology in plain language"
```

### Task 4: Improve the methodology page visual hierarchy

**Files:**

1. Modify: `web/app/methodology/methodology.module.css`
2. Test: `web/tests/methodology.test.tsx`

**Step 1: Add structural assertions**

Assert that the story, method steps, regional explanation, industrial steps, publication evidence, and source library have named sections and sequential headings.

**Step 2: Run the test and verify failure where new structure is absent**

Run the methodology test. Expected: FAIL.

**Step 3: Implement the approved design treatment**

Keep the existing Wattlas colors and typeface. Add:

1. A readable prose column with a maximum line length.
2. A story panel with a small independence note.
3. Numbered method and conversion steps.
4. Clear visual separation between plain language explanations and technical reference material.
5. Source role summary cards above the filter controls.
6. Responsive layouts at 375, 768, 1024, and 1440 pixels.
7. Visible focus states, 4.5 to 1 text contrast, and reduced motion support.

Do not add a new color palette, large decorative animation, glass effects that reduce contrast, or unrelated page features.

**Step 4: Run methodology tests**

Expected: PASS.

**Step 5: Commit**

```bash
git add web/app/methodology/methodology.module.css web/tests/methodology.test.tsx
git commit -m "style: improve methodology reading flow"
```

### Task 5: Remove generator capacity presets

**Files:**

1. Modify: `web/components/controls/generator-capacity-filter.tsx`
2. Modify: `web/app/globals.css`
3. Modify: `web/tests/generator-capacity-filter.test.tsx`

**Step 1: Replace the preset test with a failing absence test**

Assert that no `Minimum capacity presets` group or preset buttons render. Also assert that both sliders, exact minimum and maximum fields, active range label, reset button, validation, catalogue error, and unknown capacity message still work.

**Step 2: Run the focused test**

```bash
cd web
npm test -- --run tests/generator-capacity-filter.test.tsx
```

Expected: FAIL because preset buttons are still present.

**Step 3: Remove preset rendering and unused styles**

Remove the preset imports, label helper, JSX, and `.capacity-presets` CSS. Do not change the capacity range model or filtering behavior.

**Step 4: Run the focused test**

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/controls/generator-capacity-filter.tsx web/app/globals.css web/tests/generator-capacity-filter.test.tsx
git commit -m "refactor: simplify generator capacity controls"
```

### Task 6: Verify the local release

**Files:**

1. Verify: `web/public/data/latest.json`
2. Verify: `web/public/data/snapshots/2026-07-21T13-50-45Z/`

**Step 1: Run automated verification**

```bash
cd web
npm test
npm run lint
npm run build
```

Expected: all tests pass, lint reports no errors, and the production build completes.

**Step 2: Run Python source and snapshot checks**

```bash
uv run pytest pipeline/tests/test_source_catalog.py pipeline/tests/test_cli.py
```

Expected: PASS.

**Step 3: Verify in the browser**

Open `http://127.0.0.1:3003/methodology` and verify:

1. The page scrolls normally.
2. The personal story reads naturally.
3. The independence statement is visible.
4. The page reports 59 source families and explains the 32 source catalogue correctly.
5. Europe includes global and Europe specific sources.
6. Source filters work with mouse and keyboard.
7. Long cards do not overflow at desktop and mobile widths.
8. The main map still loads and capacity sliders and exact fields work without presets.

**Step 4: Keep the candidate local**

Leave the server running at `http://127.0.0.1:3003/`. Do not push to GitHub and do not trigger Vercel until Aditya approves the local result.

