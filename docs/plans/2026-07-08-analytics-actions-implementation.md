# Meaningful Product Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Track Wattlas's meaningful user actions through a clean, structured GA4 event contract.

**Architecture:** Add one typed analytics helper and call it from existing user-action boundaries. Keep selection context in `OpportunityRadar`, direct Google-link tracking in `EntityInspector`, and resize completion in `InspectorResizer`.

**Tech Stack:** React, TypeScript, GA4, `@next/third-parties`, Vitest, Testing Library.

---

### Task 1: Typed analytics helper

**Files:**
- Create: `web/lib/analytics.ts`
- Test: `web/tests/analytics.test.ts`

1. Write a failing test for the `wattlas_action` payload and omission of undefined parameters.
2. Implement the helper around `sendGAEvent`.
3. Run the focused test.

### Task 2: Controls, filters, selections, and panels

**Files:**
- Modify: `web/components/opportunity-radar.tsx`
- Test: `web/tests/opportunity-radar.test.tsx`

1. Add failing assertions for lens, infrastructure filter, state/facility/generator selection, hide/show, year, evidence, comparison, and status actions.
2. Add tracking at the existing handler boundaries.
3. Run focused tests and confirm no behavior regressions.

### Task 3: Search and resize completion

**Files:**
- Modify: `web/components/inspector/entity-inspector.tsx`
- Modify: `web/components/inspector/inspector-resizer.tsx`
- Test: `web/tests/entity-inspector.test.tsx`
- Test: `web/tests/opportunity-radar.test.tsx`

1. Add failing tests for exact-name Google search tracking and one resize-completion event.
2. Add click tracking and an `onCommit` resize callback.
3. Run focused tests.

### Task 4: Verification and release

1. Run `git diff --check`, all tests, lint, build, and end-to-end checks.
2. Commit, push `HEAD:main`, and verify Vercel production readiness.
3. Confirm `wattlas_action` in GA4 DebugView/Realtime and register useful custom dimensions.

