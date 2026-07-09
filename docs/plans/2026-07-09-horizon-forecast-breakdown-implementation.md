# Horizon and Forecast Breakdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Wattlas open on the 2026 horizon and add a scroll-down demand/supply forecast calculation section in the right inspector.

**Architecture:** Keep the horizon state in `OpportunityRadar`, changing the initial year from a hard-coded 2030 to the first published active year. Add a presentational forecast-breakdown section inside `EntityInspector` for selected geographies, using existing `regionalEnergy`, `demandMwByYear`, and `generatorOverview` inputs. The section must explain baseline demand/supply, new infrastructure demand, planned/operational generation context, retirement notes, and net pressure with honest unavailable states.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Vitest, Testing Library.

---

### Task 1: Default horizon

**Files:**
- Modify: `web/components/opportunity-radar.tsx`
- Test: `web/tests/opportunity-radar.test.tsx`

**Steps:**
1. Add a failing test that the default horizon is 2026 and the map receives year 2026 on first load.
2. Run `npm test -- opportunity-radar.test.tsx` and confirm it fails.
3. Set initial `year` from `snapshot.manifest.activeYears[0] ?? 2026`.
4. Run the targeted test and confirm it passes.

### Task 2: Forecast breakdown section

**Files:**
- Modify: `web/components/inspector/entity-inspector.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`

**Steps:**
1. Add fixture regional energy and demand ranges for 2026 and 2028.
2. Add a failing test that the right inspector shows “Demand and supply forecast”, current baseline, new infrastructure demand, generation supply, retiring generation, and forecast pressure.
3. Run the targeted test and confirm it fails.
4. Implement the section below the existing top summary for selected geographies.
5. Ensure unavailable values render as “Unavailable”, not zero.
6. Run the targeted test and confirm it passes.

### Task 3: Styling and regression

**Files:**
- Modify: `web/app/globals.css`

**Steps:**
1. Add compact styles for forecast rows, plus/minus values, explanatory method note, and year context.
2. Run `npm test`.
3. Run `npm run lint`.
4. Run `NEXT_PUBLIC_GA_MEASUREMENT_ID='G-6QH4YS3Z6P' npm run build`.
5. Keep the local dev server running for user testing; do not commit, push, or deploy.
