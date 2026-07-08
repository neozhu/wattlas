# Google Analytics Integration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add basic global GA4 page-visit tracking to Wattlas.

**Architecture:** Mount Next.js's optimized `GoogleAnalytics` component in the root layout and read the public measurement ID from deployment configuration. Omit the component when the variable is unavailable.

**Tech Stack:** Next.js App Router, `@next/third-parties`, GA4, Vitest, Vercel.

---

### Task 1: Add the analytics dependency and layout integration

**Files:**
- Modify: `web/package.json`
- Modify: `web/package-lock.json`
- Modify: `web/app/layout.tsx`
- Test: `web/tests/layout.test.tsx`

1. Write a failing test for configured and unconfigured measurement IDs.
2. Run the focused test and confirm failure.
3. Install `@next/third-parties` and render `GoogleAnalytics` conditionally in the root layout.
4. Update the metadata description to monthly-refreshed.
5. Run the focused test and confirm success.

### Task 2: Configure and verify production

1. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-6QH4YS3Z6P` to Vercel Production and Preview.
2. Run `git diff --check`, tests, lint, and the production build.
3. Commit and push `HEAD:main`.
4. Wait for Vercel production readiness and verify the public deployment contains the GA measurement ID.

