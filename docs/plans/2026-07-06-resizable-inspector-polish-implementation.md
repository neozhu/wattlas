# Resizable Inspector and Map Polish Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent accessible inspector resizer and complete four small map-interface refinements.

**Architecture:** Keep inspector sizing at the `OpportunityRadar` layout boundary and expose it through the existing CSS custom property. Use an accessible separator for pointer and keyboard input, clamp and persist widths, while keeping mobile grid overrides independent from desktop state.

**Tech Stack:** React, TypeScript, Next.js, CSS Grid, Vitest, Testing Library, Playwright.

---

### Task 1: Exact searches and monthly cadence

**Files:**
- Modify: `web/components/inspector/entity-inspector.tsx`
- Modify: `web/components/controls/command-bar.tsx`
- Test: `web/tests/entity-inspector.test.tsx`
- Test: `web/tests/opportunity-radar.test.tsx`

1. Change tests to require exact entity-name queries and **Monthly refreshed**.
2. Run focused tests and confirm failure.
3. Simplify the query builder and update command-bar wording.
4. Run focused tests and confirm success.

### Task 2: Filter restore and composition-note placement

**Files:**
- Modify: `web/app/globals.css`
- Test: `web/tests/responsive-controls.test.ts`
- Modify: `web/tests/e2e/radar.spec.ts`

1. Add failing CSS assertions for a left-aligned restore control and bottom-right composition note.
2. Run the focused test and confirm failure.
3. Update desktop and responsive positioning styles.
4. Run the focused test and confirm success.

### Task 3: Persistent accessible inspector resizing

**Files:**
- Create: `web/components/inspector/inspector-resizer.tsx`
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/opportunity-radar.test.tsx`
- Modify: `web/tests/e2e/radar.spec.ts`

1. Write failing tests for separator semantics, keyboard resizing, clamping, and saved-width restoration.
2. Run focused tests and confirm failure.
3. Implement the resizer, local-storage initialization, CSS variable application, pointer handling, and mobile hiding.
4. Run focused tests and confirm success.

### Task 4: Verification and release

1. Run `git diff --check`, `npm test`, `npm run lint`, `npm run build`, and isolated `npm run e2e`.
2. Inspect the rendered layout and interactions in the in-app browser.
3. Commit, push `HEAD:main`, wait for Vercel production readiness, and verify the public URL returns HTTP 200.

