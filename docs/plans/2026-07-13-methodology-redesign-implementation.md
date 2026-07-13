# Wattlas Methodology Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Wattlas methodology page as a clean, documentation-style reference with shared homepage branding and a clear six-section reading flow.

**Architecture:** A shared server-rendered brand component will replace the duplicated wordmark markup in both headers. The static methodology route will use semantic sections, anchor navigation, definition lists, and source rows. Scoped vanilla CSS will provide a sticky desktop table of contents and a one-column mobile layout while preserving the page's independent scroll container.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, vanilla CSS, Vitest, Testing Library

---

### Task 1: Lock down the information architecture

**Files:**
- Modify: `web/tests/methodology-page.test.tsx`
- Test: `web/tests/methodology-page.test.tsx`

**Step 1: Write the failing test**

Add assertions for a labeled `On this page` navigation landmark, its six anchor links, the creator attribution, and the plain-language section headings. Keep the existing SEO and no-em-dash assertions.

```tsx
const navigation = screen.getByRole("navigation", { name: "On this page" });
expect(within(navigation).getByRole("link", { name: "Overview" })).toHaveAttribute("href", "#overview");
expect(screen.getByRole("heading", { name: "How Wattlas works" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Data sources" })).toBeInTheDocument();
expect(screen.getByRole("heading", { name: "Evidence labels" })).toBeInTheDocument();
```

**Step 2: Run the test to verify it fails**

Run: `npm test -- methodology-page.test.tsx`

Expected: FAIL because the current page has no `On this page` navigation and uses the old section structure.

**Step 3: Leave the test red for Task 3**

Do not change production code in this task.

### Task 2: Share the Wattlas brand between both pages

**Files:**
- Create: `web/components/branding/wattlas-brand.tsx`
- Modify: `web/components/controls/command-bar.tsx`
- Modify: `web/app/methodology/page.tsx`
- Test: `web/tests/methodology-page.test.tsx`

**Step 1: Extend the failing test**

Assert that the methodology page contains the same wordmark and creator attribution exposed by the homepage brand block.

```tsx
expect(screen.getByLabelText("Wattlas home")).toHaveAttribute("href", "/");
expect(screen.getByRole("link", { name: "An open source project by Aditya Gupta" })).toBeInTheDocument();
```

**Step 2: Run the focused test to verify it fails**

Run: `npm test -- methodology-page.test.tsx`

Expected: FAIL because the methodology header currently renders a separate wordmark and no creator attribution.

**Step 3: Implement the shared component**

Create a server component that renders `.brand-block`, `.wordmark`, and `.project-byline`. Accept an optional `href`; when present, render the wordmark as a home link with `aria-label="Wattlas home"`. Replace the command bar markup and use the component in the methodology header.

**Step 4: Run the focused test**

Run: `npm test -- methodology-page.test.tsx`

Expected: The brand assertions pass. The information architecture assertions remain red until Task 3.

### Task 3: Rebuild the page into one reading flow

**Files:**
- Modify: `web/app/methodology/page.tsx`
- Modify: `web/app/globals.css`
- Test: `web/tests/methodology-page.test.tsx`

**Step 1: Replace the page structure**

Keep the route metadata and JSON-LD. Add a skip link, compact sticky header, restrained hero, labeled anchor navigation, and six semantic sections with these IDs:

```tsx
const sections = [
  ["overview", "Overview"],
  ["how-it-works", "How it works"],
  ["data-sources", "Data sources"],
  ["evidence", "Evidence labels"],
  ["refresh-quality", "Refresh and quality"],
  ["limitations", "Limitations"],
];
```

Render process steps as an ordered list, evidence labels as a definition list, and source groups as stacked sections with simple linked rows. Use direct, concrete sentences and verify the source file contains no em dash character.

**Step 2: Replace the old grid-heavy styles**

Remove `.methodology-steps` five-column cards, `.evidence-grid`, `.source-groups` two-column card rules, and `.methodology-split`. Add a two-column documentation shell with a sticky navigation rail, a readable article width, row separators, visible focus styles, and responsive rules below 800 pixels.

**Step 3: Run the focused test to verify green**

Run: `npm test -- methodology-page.test.tsx`

Expected: PASS.

**Step 4: Run related frontend tests**

Run: `npm test -- methodology-page.test.tsx opportunity-radar.test.tsx`

Expected: PASS with the command bar and methodology route both rendering the shared brand correctly.

**Step 5: Commit the implementation**

```bash
git add web/app/methodology/page.tsx web/app/globals.css web/components/branding/wattlas-brand.tsx web/components/controls/command-bar.tsx web/tests/methodology-page.test.tsx
git commit -m "refine: reorganize methodology page"
```

### Task 4: Verify the complete local experience

**Files:**
- Verify: `web/app/methodology/page.tsx`
- Verify: `web/app/globals.css`

**Step 1: Run the complete test suite**

Run: `npm test`

Expected: 17 test files and 130 or more tests pass with zero failures.

**Step 2: Run the production build**

Run: `npm run build`

Expected: Exit code 0 and static `/methodology` route output.

**Step 3: Start the local development server**

Run: `npm run dev -- --hostname 127.0.0.1`

Expected: Next.js reports a local URL and remains running.

**Step 4: Verify in a browser**

Check `/` and `/methodology` at desktop and mobile viewport widths. Confirm the shared brand treatment, readable order, sticky navigation, working anchor links, vertical scrolling, no horizontal overflow, and no Next.js error overlay.

**Step 5: Leave the server running for review**

Report the local URL to the user. Do not push until the user approves the local page.
