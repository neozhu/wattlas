# Wattlas Demand Intelligence and Asset Explorer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add governed IEA/GEM industrial and hydrogen-network data, connect defensible future electrical demand to regional forecasts, and deliver the approved light-globe Asset Explorer and Country Intelligence drill-down locally.

**Architecture:** Extend the canonical Python contracts and governed manual-source system, normalize downloaded workbooks into additive assets, calculate annual demand through versioned assumption functions, merge those increments into the existing 2026–2031 regional model, then expose additive snapshot fields through strict Zod contracts. The React/MapLibre portal gains an Opportunity Radar/Asset Explorer mode switch, compact status and technology filters, a light globe map, project summary, and country drill-down while preserving existing search, scores, and evidence.

**Tech Stack:** Python 3.11, Pydantic, openpyxl, Shapely, DuckDB, pytest; Next.js 16, React 19, TypeScript, Zod, MapLibre GL, Vitest/Testing Library, Playwright.

---

### Task 1: Govern and validate the downloaded source releases

**Files:**
- Modify: `data/curated/source-catalog.json`
- Modify: `data/curated/source-registry.json`
- Modify: `pipeline/pyproject.toml`
- Test: `pipeline/tests/test_source_catalog.py`
- Test: `pipeline/tests/test_manual_import.py`

1. Add failing catalogue tests for publishable, CC BY 4.0, manual-snapshot entries for IEA hydrogen production/infrastructure and GEM cement/steel workbooks.
2. Run the focused tests and confirm they fail because the sources are absent.
3. Add source descriptors, evidence descriptors, `openpyxl`, and explicit path-environment names.
4. Run focused catalogue/manual-import tests until green.
5. Import the local source files into the governed raw-capture store with expected SHA-256 values and observation versions.
6. Commit the source-governance batch locally.

### Task 2: Extend canonical asset and snapshot contracts

**Files:**
- Modify: `pipeline/src/grid_scope/models.py`
- Modify: `web/lib/snapshot/schema.ts`
- Modify: `web/lib/snapshot/types.ts`
- Modify: `pipeline/tests/test_models.py`
- Modify: `web/tests/snapshot-schema.test.ts`

1. Add failing Python and TypeScript contract tests for industrial-load and hydrogen-infrastructure assets, public lifecycle groups, annual-demand ranges, reported capacities, grid-connection class, raw status, source record IDs, and project URLs.
2. Verify both focused suites fail for missing schema fields.
3. Add the minimum compatible contract extensions with safe defaults for existing snapshots.
4. Run both focused suites until green and confirm the current production snapshot still parses.
5. Commit the contract batch locally.

### Task 3: Normalize IEA hydrogen workbooks

**Files:**
- Create: `pipeline/src/grid_scope/industrial_demand.py`
- Create: `pipeline/tests/test_industrial_demand.py`
- Create: `pipeline/tests/fixtures/industrial_demand/README.md`

1. Write failing tests using tiny generated workbooks for header discovery, status normalization, coordinate parsing, grid-connected production, dedicated-renewable exclusion, missing capacity, and infrastructure-only records.
2. Confirm failures are caused by missing parser behavior.
3. Implement deterministic production and infrastructure parsers with raw status, source record ID, type, capacity/unit, owner, dates, and source lineage.
4. Implement duplicate guards so infrastructure rows cannot create demand and production rows cannot be double-counted.
5. Run focused tests until green.
6. Commit the hydrogen-normalization batch locally.

### Task 4: Normalize GEM steel and cement workbooks

**Files:**
- Modify: `pipeline/src/grid_scope/industrial_demand.py`
- Modify: `pipeline/tests/test_industrial_demand.py`

1. Add failing tests for joining steel plant/unit IDs, aggregating future EAF capacity, exposing DRI context, excluding BF/BOF-only electrical estimates, parsing cement capacity/status, and preserving GEM wiki URLs.
2. Verify expected failures.
3. Implement plant/unit joins, conservative status mappings, coordinate validation, source-record lineage, and one canonical additive asset per eligible project/phase.
4. Run focused parser tests until green.
5. Commit the GEM-normalization batch locally.

### Task 5: Add auditable industrial-demand assumptions

**Files:**
- Create: `data/curated/industrial-demand-assumptions.json`
- Modify: `pipeline/src/grid_scope/industrial_demand.py`
- Modify: `pipeline/tests/test_industrial_demand.py`

1. Add failing tests for MWel-to-GWh hydrogen ranges, grid share, dedicated supply exclusion, EAF MWh-per-tonne conversion, cement electrical-intensity conversion, range ordering, and missing-input behavior.
2. Verify failures.
3. Add a versioned assumptions file with units, low/central/high values, official/institutional source URLs, applicability, and limitations.
4. Implement pure conversion functions that return no value when applicability is not defensible.
5. Run focused tests until green and commit locally.

### Task 6: Merge new assets and forecast increments into the monthly pipeline

**Files:**
- Modify: `pipeline/src/grid_scope/cli.py`
- Modify: `pipeline/src/grid_scope/artifacts.py`
- Modify: `pipeline/src/grid_scope/industrial_demand.py`
- Modify: `pipeline/tests/test_refresh.py`
- Modify: `pipeline/tests/test_artifacts.py`

1. Add failing tests proving existing assets are retained, new assets are assigned to ADM1, annual-demand GWh is preferred over MW fallback, infrastructure-only records cannot affect the forecast, future lifecycle/year gates work, and manifest coverage reports each new category.
2. Verify failures.
3. Load latest governed captures, normalize and merge assets, assign ADM1, build eligible increments, preserve previous additions, and extend manifest/source coverage.
4. Add ENTSO-E `not_configured`/configured behavior without embedding the token.
5. Run focused refresh/artifact tests, then all pipeline tests.
6. Commit the pipeline integration locally.

### Task 7: Add web search, filters, counts, and additive data contracts

**Files:**
- Modify: `web/lib/search.ts`
- Modify: `web/components/controls/search-box.tsx`
- Modify: `web/components/controls/layer-rail.tsx`
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/tests/search.test.ts`
- Modify: `web/tests/layer-rail.test.tsx`
- Modify: `web/tests/opportunity-radar.test.tsx`

1. Add failing tests for searching industrial and hydrogen-network projects; infrastructure counts; five public lifecycle filters; select/clear section behavior; and the Opportunity Radar/Asset Explorer switch.
2. Verify failures.
3. Add grouped search entries, compact filter sections, live counts, raw-to-public lifecycle matching, and mode state while preserving existing actions and accessibility.
4. Run focused tests until green and commit locally.

### Task 8: Implement the light globe and compact project selection

**Files:**
- Modify: `web/components/map/global-map.tsx`
- Modify: `web/components/inspector/entity-inspector.tsx`
- Modify: `web/app/globals.css`
- Modify: `web/tests/global-map.test.tsx`
- Modify: `web/tests/entity-inspector.test.tsx`

1. Add failing tests for globe projection, light basemap configuration, small categorized points, public lifecycle filtering, compact project summary fields, and dossier action.
2. Verify failures.
3. Implement the light physical-geography style, globe projection, smaller accessible point layers, renewable/fossil palette, compact selection summary, and detailed inspector fields.
4. Run focused tests until green and commit locally.

### Task 9: Implement Asset Explorer and Country Intelligence drill-down

**Files:**
- Create: `web/components/intelligence/country-intelligence.tsx`
- Create: `web/components/intelligence/asset-explorer-summary.tsx`
- Modify: `web/components/opportunity-radar.tsx`
- Modify: `web/components/inspector/entity-inspector.tsx`
- Create: `web/tests/country-intelligence.test.tsx`
- Create: `web/tests/asset-explorer-summary.test.tsx`

1. Add failing tests for current demand/supply, additions, retirements, technology mix, 2026–2031 outlook, confidence/source disclosure, and navigation from a selected country.
2. Verify failures.
3. Build the facility-first summary and country drill-down from snapshot values only; never synthesize unavailable values in the component.
4. Run focused tests until green and commit locally.

### Task 10: Update Methodology and Sources

**Files:**
- Modify: `web/components/methodology/methodology-page.tsx`
- Modify: `web/tests/methodology-page.test.tsx`
- Modify: `README.md`
- Modify: `PROJECT_CONTEXT.md`

1. Add failing tests for the new sources, releases/licences, industrial formulas, MW-versus-GWh explanation, lifecycle mapping, network exclusion, ENTSO-E credential state, and calculated coverage.
2. Verify failures.
3. Add the disclosures and snapshot-derived counts while preserving page scrolling and current source catalogue views.
4. Run focused tests until green and commit locally.

### Task 11: Build the local candidate snapshot and verify end to end

**Files:**
- Modify only if defects are found, always beginning with a failing regression test.

1. Run the governed import/refresh with the local workbook paths and no ENTSO-E token.
2. Verify before/after counts prove that existing records were retained and new categories were added.
3. Run `make test`, web lint, web production build, and targeted browser flows for Opportunity Radar, Asset Explorer, search, status filters, country drill-down, project dossier, Methodology scrolling, and responsive layout.
4. Inspect console/network errors and snapshot artifact sizes.
5. Start the local server on an available loopback port and verify both `/` and `/methodology` return HTTP 200.
6. Keep all commits local and provide the preview URL and verification summary. Do not push.
