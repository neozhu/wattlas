# Methodology Page and Regional City Symbols Implementation Plan

**Goal:** Build the approved SEO methodology page and regional-zoom city symbols without changing the existing Opportunity Radar workflow.

**Architecture:** A static Next.js route owns its metadata, JSON-LD, structured source content, and editorial styles. The existing command bar links to it. MapLibre city sources gain fixed-size dot layers with minimum zoom thresholds while search remains zoom-independent.

### Task 1: Methodology route

- Write a failing route content test.
- Create `web/app/methodology/page.tsx` with metadata, JSON-LD, methodology sections, source directory, limitations, and navigation.
- Add scoped methodology styles to `web/app/globals.css`.
- Verify that rendered copy contains no em dash.

### Task 2: Navigation

- Add a failing command-bar navigation expectation.
- Add a `Methodology & Sources` link to the command bar.
- Verify responsive rendering and existing command-bar tests.

### Task 3: City visibility by zoom

- Add failing MapLibre expectations for fixed-size city dots.
- Add million-plus dots at regional zoom and German large-city dots at closer zoom.
- Keep collision-aware labels and searchable city records.
- Run map tests and browser verification.

### Task 4: Completion verification

- Run all web tests.
- Run the production build.
- Browser-check both `/` and `/methodology` with no error overlay.
- Commit locally without pushing.
