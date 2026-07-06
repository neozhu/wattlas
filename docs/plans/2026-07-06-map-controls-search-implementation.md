# Map Controls and Contextual Search Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add reversible filter-rail collapse, contextual Google research links for every selected entity, and streamlined project attribution.

**Architecture:** Keep UI state in `OpportunityRadar`, pass a hide callback into `LayerRail`, and conditionally render a restore button while preserving all filter values. Centralize Google query construction in the inspector and reuse one title-action pattern across generator, facility, and geography branches; relocate project attribution to `CommandBar` and remove the map footer panel.

**Tech Stack:** Next.js App Router, React, TypeScript, MapLibre GL, CSS, Vitest, Testing Library, Playwright.

---

### Task 1: Collapsible filter rail

**Files:**
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/components/controls/layer-rail.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/opportunity-radar.test.tsx`

1. Write a failing component test that hides the rail, exposes **Show filters**, restores it, and confirms active infrastructure/filter state is preserved.
2. Run `npm test -- --run tests/opportunity-radar.test.tsx` and confirm the new assertion fails.
3. Add `filtersVisible` state, an accessible hide callback/button, a persistent restore button, and collapsed-layout CSS.
4. Re-run the focused test and confirm it passes.

### Task 2: Contextual Google search actions

**Files:**
- Modify: `web/components/inspector/entity-inspector.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/entity-inspector.test.tsx`

1. Write failing tests for generator, facility, and geography selections that assert an encoded `https://www.google.com/search?q=` URL, `_blank`, and `rel="noreferrer"`.
2. Run `npm test -- --run tests/entity-inspector.test.tsx` and confirm failure because the links do not exist.
3. Add a small query builder using exact names and available country/category/technology context, then render a consistent title-level search action in each inspector branch.
4. Re-run the focused tests and confirm they pass.

### Task 3: Attribution cleanup and relocation

**Files:**
- Modify: `web/components/controls/command-bar.tsx`
- Modify: `web/components/map/global-map.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/global-map.test.tsx`
- Test: `web/tests/opportunity-radar.test.tsx`
- Modify: `web/tests/e2e/radar.spec.ts`

1. Write failing tests asserting the custom map attribution panel is absent and **An open-source project by Aditya Gupta** appears beneath the Wattlas brand with the GitHub URL.
2. Run the focused tests and confirm the new expectations fail.
3. Remove `.data-attribution` markup/styles, preserve MapLibre compact attribution, and add the subtle command-bar byline.
4. Update the end-to-end layout assertion so it no longer expects the removed footer.
5. Re-run focused tests and confirm they pass.

### Task 4: Full verification and release

**Files:**
- Verify all modified files

1. Run `git diff --check`.
2. Run `npm test`, `npm run lint`, `npm run build`, and `npm run e2e` from `web/`.
3. Inspect the rendered desktop and mobile experience, including hide/show and a selected-entity Google link.
4. Commit the implementation, push `HEAD:main`, wait for Vercel production readiness, and verify `https://wattlas.vercel.app/` returns HTTP 200.

