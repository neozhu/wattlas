# Subtle Map Interactions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add smooth selection flights, collapsible details, a stronger methodology link, and a non-overlapping Asset Explorer summary while preserving Wattlas behavior.

**Architecture:** Keep selection state in `OpportunityRadar`, add a small pure camera-planning helper for deterministic motion, and let `GlobalMap` execute the plan through MapLibre. The right panel remains mounted only while visible, while the existing bottom summary becomes the restore path. CSS grid state classes handle map expansion and Asset Explorer placement without absolute overlap.

**Tech Stack:** Next.js, React, TypeScript, MapLibre GL, Vitest, Testing Library, CSS Grid.

---

### Task 1: Deterministic map camera plan

**Files:**
- Create: `web/lib/map/selection-flight.ts`
- Test: `web/tests/selection-flight.test.ts`
- Modify: `web/components/map/global-map.tsx`
- Modify: `web/components/opportunity-radar.tsx`

**Step 1: Write the failing test**

Test that a distant selection returns a pullback stage and a target stage totalling about 2.7 seconds, a nearby selection uses a shorter direct stage, and reduced motion uses a short direct stage.

**Step 2: Run test to verify it fails**

Run: `cd web && npm test -- --run tests/selection-flight.test.ts`

Expected: FAIL because `selection-flight.ts` does not exist.

**Step 3: Write minimal implementation**

Create a pure helper that accepts current center, current zoom, target coordinates or bounds, and reduced-motion state. Return camera stages with duration, center or bounds, target zoom, padding, and easing intent. In `GlobalMap`, cancel any active camera movement before executing the stages. Use MapLibre `easeTo` and `fitBounds`, and wait for the first stage to finish before starting the second.

Update selection flows in `OpportunityRadar` so direct map selections, search results, facilities, and generators create a new focus target.

**Step 4: Run focused tests**

Run: `cd web && npm test -- --run tests/selection-flight.test.ts tests/global-map.test.tsx tests/opportunity-radar.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add web/lib/map/selection-flight.ts web/tests/selection-flight.test.ts web/components/map/global-map.tsx web/components/opportunity-radar.tsx
git commit -m "feat: add smooth map selection flights"
```

### Task 2: Collapsible details panel and restore path

**Files:**
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/components/inspector/entity-inspector.tsx`
- Modify: `web/components/intelligence/country-intelligence.tsx`
- Modify: `web/components/map/project-summary-card.tsx`
- Modify: `web/components/inspector/inspector-resizer.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/opportunity-radar.test.tsx`
- Test: `web/tests/project-summary-card.test.tsx`

**Step 1: Write failing component tests**

Test that the inspector starts open, Hide details removes it and expands the map, selecting another entity does not reopen it, and More details restores it. Test the same restore action for geography, asset, and generator selections.

**Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- --run tests/opportunity-radar.test.tsx tests/project-summary-card.test.tsx`

Expected: FAIL because the visibility controls and callback do not exist.

**Step 3: Implement visibility state**

Add `detailsVisible` state initialized from session storage with an open fallback. Add an inspector-hidden shell class. Pass `onHide` into all inspector variants and `onMoreDetails` into the bottom summary. Do not change visibility when selection changes. Hide the resizer while the panel is collapsed.

**Step 4: Run focused tests**

Run: `cd web && npm test -- --run tests/opportunity-radar.test.tsx tests/project-summary-card.test.tsx tests/entity-inspector.test.tsx`

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/opportunity-radar.tsx web/components/inspector/entity-inspector.tsx web/components/intelligence/country-intelligence.tsx web/components/map/project-summary-card.tsx web/components/inspector/inspector-resizer.tsx web/app/globals.css web/tests/opportunity-radar.test.tsx web/tests/project-summary-card.test.tsx
git commit -m "feat: add collapsible details panel"
```

### Task 3: Command bar and Asset Explorer layout polish

**Files:**
- Modify: `web/components/intelligence/asset-explorer-summary.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/opportunity-radar.test.tsx`
- Test: `web/tests/responsive-controls.test.ts`

**Step 1: Write failing layout tests**

Assert that the Methodology link has the dedicated outlined style contract and that the Asset Explorer summary occupies the map workspace rather than the command-bar tab area at desktop and tablet breakpoints.

**Step 2: Run tests to verify they fail**

Run: `cd web && npm test -- --run tests/opportunity-radar.test.tsx tests/responsive-controls.test.ts`

Expected: FAIL on the missing layout and style contracts.

**Step 3: Implement visual changes**

Strengthen the Methodology link border with neutral gray and a restrained hover state. Position the Asset Explorer summary within the map grid, add top spacing inside the map only when Explorer is active, and keep responsive stacking clean.

**Step 4: Run focused tests**

Run: `cd web && npm test -- --run tests/opportunity-radar.test.tsx tests/responsive-controls.test.ts`

Expected: PASS.

**Step 5: Commit**

```bash
git add web/components/intelligence/asset-explorer-summary.tsx web/app/globals.css web/tests/opportunity-radar.test.tsx web/tests/responsive-controls.test.ts
git commit -m "style: polish explorer and methodology controls"
```

### Task 4: Full verification and local handoff

**Files:**
- Modify only if verification finds a defect.

**Step 1: Run all automated checks**

```bash
cd web
npm test
npm run lint
npm run build
```

Expected: all tests, lint, and build pass.

**Step 2: Run browser verification**

At `http://127.0.0.1:3003/`, verify:

- distant selections pull back and then zoom in smoothly;
- reduced-motion produces a short direct move;
- the inspector starts open, hides, stays hidden across selections, and restores from More details;
- Methodology & Sources is visibly outlined;
- Asset Explorer summary does not overlap workspace tabs;
- desktop and tablet layouts have no overflow.

**Step 3: Leave local preview running**

Keep the approved worktree on port 3003. Do not push or deploy.
