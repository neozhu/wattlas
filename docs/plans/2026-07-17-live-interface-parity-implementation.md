# Live Interface Parity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the local Wattlas map portal match the currently deployed `origin/main` interface exactly while retaining the new governed data snapshot and Methodology and Sources page.

**Architecture:** Treat `origin/main` commit `1360a0a` as the portal presentation source of truth. Restore its portal CSS, components, helper modules, and UI tests verbatim, then make only the narrow compatibility changes required for the additive source-catalog snapshot schema. Keep the new pipeline, published local snapshot, methodology catalogue components, and source-governance code untouched.

**Tech Stack:** Next.js 16, React 19, TypeScript, MapLibre GL, Vitest, Testing Library, Playwright/agent-browser.

---

### Task 1: Establish the live portal parity contract

**Files:**
- Restore test: `web/tests/search-box.test.tsx`
- Restore test: `web/tests/inspector-view.test.ts`
- Restore test: `web/tests/score-sparkline.test.tsx`
- Modify tests from reference: `web/tests/entity-inspector.test.tsx`
- Modify tests from reference: `web/tests/generator-colors.test.ts`
- Modify tests from reference: `web/tests/global-map.test.tsx`
- Modify tests from reference: `web/tests/opportunity-radar.test.tsx`
- Modify tests from reference: `web/tests/power-balance-chart.test.tsx`
- Modify test from reference: `web/tests/e2e/radar.spec.ts`

**Step 1: Restore live-version tests**

Read each file from `origin/main` with `git show origin/main:<path>` and reproduce it through `apply_patch`. Do not use checkout/reset because the worktree contains approved local changes.

**Step 2: Run the portal tests to verify the futuristic interface fails the live contract**

Run:

```bash
npm test --prefix web -- search-box inspector-view score-sparkline entity-inspector generator-colors global-map opportunity-radar power-balance-chart
```

Expected: failures identify the structural/default-state differences between the local futuristic portal and the live portal.

**Step 3: Commit the restored parity tests**

```bash
git add web/tests/e2e/radar.spec.ts web/tests/search-box.test.tsx web/tests/inspector-view.test.ts web/tests/score-sparkline.test.tsx web/tests/entity-inspector.test.tsx web/tests/generator-colors.test.ts web/tests/global-map.test.tsx web/tests/opportunity-radar.test.tsx web/tests/power-balance-chart.test.tsx
git commit -m "test: restore live portal interaction contract"
```

### Task 2: Restore the live portal component structure

**Files:**
- Restore: `web/components/branding/wattlas-brand.tsx`
- Restore: `web/components/inspector/score-sparkline.tsx`
- Restore: `web/lib/inspector/inspector-view.ts`
- Modify from reference: `web/components/controls/command-bar.tsx`
- Modify from reference: `web/components/controls/layer-rail.tsx`
- Modify from reference: `web/components/controls/search-box.tsx`
- Modify from reference: `web/components/inspector/entity-inspector.tsx`
- Modify from reference: `web/components/inspector/power-balance-chart.tsx`
- Modify from reference: `web/components/map/global-map.tsx`
- Modify from reference: `web/components/map/map-style.ts`
- Modify from reference: `web/components/opportunity-radar.tsx`
- Modify from reference: `web/components/status/data-status-drawer.tsx`
- Modify from reference: `web/lib/map/generator-colors.ts`

**Step 1: Restore components verbatim from `origin/main`**

Use `git show origin/main:<path>` as the reference and `apply_patch` for every file. Preserve no futuristic markup, icons, technology ordering, or default toggles unless it also exists in the live reference.

**Step 2: Run the focused portal tests**

Run the Task 1 test command.

Expected: all focused tests pass. If TypeScript reports an additive snapshot-schema mismatch, adapt only the data-loading boundary; do not alter the restored presentation structure.

**Step 3: Commit the structural restoration**

```bash
git add web/components/branding web/components/controls web/components/inspector web/components/map web/components/opportunity-radar.tsx web/components/status/data-status-drawer.tsx web/lib/inspector web/lib/map/generator-colors.ts
git commit -m "refactor: restore deployed Wattlas portal structure"
```

### Task 3: Restore the exact deployed visual system

**Files:**
- Modify from reference: `web/app/globals.css`

**Step 1: Replace portal styling with the `origin/main` stylesheet**

Reproduce `origin/main:web/app/globals.css` exactly through `apply_patch`. Methodology-specific styles remain isolated in `web/app/methodology/methodology.module.css` and are therefore preserved.

**Step 2: Run component tests and production build**

```bash
npm test --prefix web
npm run build --prefix web
```

Expected: 14 or more test files pass and `/`, `/_not-found`, and `/methodology` build successfully as static routes.

**Step 3: Commit the visual restoration**

```bash
git add web/app/globals.css
git commit -m "style: match the deployed Wattlas interface"
```

### Task 4: Reconcile additive data and methodology compatibility

**Files:**
- Preserve: `web/app/methodology/page.tsx`
- Preserve: `web/app/methodology/methodology.module.css`
- Preserve: `web/components/methodology/methodology-page.tsx`
- Preserve: `web/components/methodology/source-catalog-table.tsx`
- Preserve: `web/lib/methodology.ts`
- Preserve unless compatibility requires a narrow change: `web/lib/snapshot/client-load.ts`
- Preserve unless compatibility requires a narrow change: `web/lib/snapshot/schema.ts`
- Preserve unless compatibility requires a narrow change: `web/lib/snapshot/types.ts`
- Preserve: `web/public/data/latest.json`
- Preserve: `web/public/data/snapshots/2026-07-17T08-25-17Z/**`
- Test: `web/tests/methodology.test.tsx`
- Test: `web/tests/snapshot.test.ts`

**Step 1: Run methodology and snapshot tests**

```bash
npm test --prefix web -- methodology snapshot
```

Expected: source-catalog loading, deterministic UTC timestamp rendering, quarantine labels, and snapshot parsing pass.

**Step 2: Apply only necessary compatibility changes**

If a restored live component expects a field made optional or additive by the new schema, normalize it in `client-load.ts` or a pure selector. Do not fork the live visual component.

**Step 3: Re-run tests and commit only if code changed**

```bash
git add web/lib/snapshot web/tests/methodology.test.tsx web/tests/snapshot.test.ts
git commit -m "fix: preserve governed snapshot compatibility"
```

### Task 5: Verify exact live parity and host locally

**Files:**
- No product files expected.

**Step 1: Run complete verification**

```bash
.venv/bin/python -m pytest pipeline/tests -q
npm test --prefix web
npm run build --prefix web
git diff --check
```

Expected: all pipeline tests, all web tests, production build, and whitespace checks pass.

**Step 2: Start the local preview**

Use the webpack dev bundler because the current machine cannot reach the Google-font runtime endpoint used by Turbopack dev mode:

```bash
cd web
node_modules/.bin/next dev --webpack --hostname 127.0.0.1 --port 3003
```

Expected: `http://127.0.0.1:3003` is ready.

**Step 3: Compare deployed and local portal states**

At the same viewport, capture `https://wattlas.vercel.app` and `http://127.0.0.1:3003`. Verify:

- same header, brand, source-status, search, and methodology placement;
- same filter labels, technology order, switch roles, and default checked states;
- same map frame, zoom controls, cluster treatment, horizon placement, and inspector layout;
- same interactive-element ordering in `agent-browser snapshot -i`;
- no error overlay, hydration mismatch, or console error.

**Step 4: Verify methodology and leave the server running**

Open `http://127.0.0.1:3003/methodology`, confirm 24 governed sources render, return HTTP 200, and show the UTC snapshot timestamp without hydration warnings.

**Step 5: Do not push**

Keep all work local until the user approves the parity preview.
