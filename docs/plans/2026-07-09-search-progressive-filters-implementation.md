# Search and Progressive Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a local trial of Wattlas search/autocomplete and a calmer progressive filter rail without pushing to GitHub.

**Architecture:** Keep state ownership in `OpportunityRadar`. Add a focused `SearchBox` component that indexes the already-loaded snapshot entities and emits selected entity IDs or generator features. Reorganize `LayerRail` into progressive sections with collapsed advanced generator controls and informational active-filter chips.

**Tech Stack:** Next.js App Router, React client components, TypeScript, MapLibre integration boundary, Vitest, Testing Library.

---

### Task 1: Search indexing and selection

**Files:**
- Create: `web/lib/search.ts`
- Create: `web/tests/search.test.ts`
- Modify: `web/components/opportunity-radar.tsx`

**Steps:**
1. Write failing tests for ranked exact/prefix/contains matches across geography, assets, and generators.
2. Run `npm test -- search.test.ts` and confirm the search helper does not exist.
3. Implement `buildSearchIndex` and `searchEntities`.
4. Run `npm test -- search.test.ts` and confirm it passes.

### Task 2: SearchBox component

**Files:**
- Create: `web/components/controls/search-box.tsx`
- Test: `web/tests/opportunity-radar.test.tsx`

**Steps:**
1. Add failing component tests showing autocomplete suggestions and selection of Assam, Alpha DC, and Rhine Solar.
2. Run `npm test -- opportunity-radar.test.tsx` and confirm failures.
3. Implement the accessible search box with grouped results and empty state.
4. Wire `OpportunityRadar` so selection updates the existing inspector state.
5. Track `search_result_selected` with entity type/name/country.
6. Run the targeted tests again.

### Task 3: Progressive filter rail

**Files:**
- Modify: `web/components/controls/layer-rail.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/opportunity-radar.test.tsx`

**Steps:**
1. Add failing tests for collapsed advanced power filters and expandable controls.
2. Run the targeted tests and confirm failures.
3. Refactor `LayerRail` sections into Search/View/Infrastructure/Advanced power filters/Map keys.
4. Add active filter summary chips.
5. Track `advanced_filters_opened` when the user expands the section.
6. Run targeted tests.

### Task 4: Visual polish and regression

**Files:**
- Modify: `web/app/globals.css`

**Steps:**
1. Tune spacing, chips, search suggestions, and collapsed advanced section styling.
2. Run `npm test`.
3. Run `npm run lint`.
4. Run `npm run build`.
5. Start the local app and tell the user the local URL for testing.

### Non-goals

- Do not push to GitHub.
- Do not deploy to Vercel.
- Do not add server-side search or new data ingestion.
- Do not redesign the right inspector in this pass.
