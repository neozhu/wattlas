# Africa and South America Data Expansion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add governed Africa and South America electricity, generation, project, grid-context, and digital-infrastructure sources; improve ADM1 demand and supply coverage; and expose complete methodology and source status without publishing unlicensed data.

**Architecture:** Extend the Python snapshot pipeline with a machine-readable source catalogue, independent connector-health and publication states, immutable manual and automatic captures, a physically isolated quarantine path, reusable source-family adapters, and claim-level lineage. Run source batches independently, reconcile published demand and supply to official controls, then atomically publish compact browser artifacts plus a methodology catalogue. Preserve the existing map UI and 2026–2031 scoring model.

**Tech Stack:** Python 3.13, Pydantic, httpx, DuckDB, pytest, respx, Shapely, Next.js 16, React 19, TypeScript, Zod, Vitest, Playwright, GitHub Actions, Vercel.

**Approved design:** docs/plans/2026-07-17-africa-south-america-data-expansion-design.md

---

## Delivery rules

- Work test-first. Run the focused RED test before implementation and the focused GREEN test after it.
- Never add credentials, downloaded restricted files, raw captures, quarantine payloads, or DuckDB files to Git.
- Connector health and publication eligibility remain independent.
- Do not bypass forms, CAPTCHAs, click-through terms, robots restrictions, or authentication.
- Do not infer facility MW from PeeringDB, grid proximity, project budget, or facility count.
- Do not label modelled regional allocation as observed.
- Keep raw and quarantine data outside web/public.
- Preserve current uncommitted visual work and stage only files belonging to each task.
- Build and verify locally. Do not push until the user approves the completed local result.

Each batch must pass schema, licence, coordinate, unit, temporal, deduplication, ADM1 assignment, reconciliation, quarantine-leak, and artifact-size gates. A failed batch retains its last valid public capture; the final snapshot still publishes only when all global invariants pass.

---

### Task 1: Add source-governance contracts

**Files:**
- Modify: pipeline/src/grid_scope/models.py
- Modify: pipeline/src/grid_scope/connectors/base.py
- Modify: pipeline/tests/test_models.py
- Modify: pipeline/tests/test_connectors.py

**Steps:**

1. Write failing tests for AccessMode, PublicationState, SourceCategory, SourceDescriptor, and independent connector/publication status.
2. Require source ID, publisher, URL, coverage, access mode, publication state, licence decision, cadence, and credential/manual hints. Reject publishable sources without a reusable licence.
3. Run:

       .venv/bin/python -m pytest pipeline/tests/test_models.py pipeline/tests/test_connectors.py -q

   Expected RED: imports or validation fail.
4. Implement bounded string enums and Pydantic contracts; do not change the meaning of existing ConnectorState.
5. Re-run the focused tests and the full pipeline suite. Expected GREEN.
6. Commit:

       git add pipeline/src/grid_scope/models.py pipeline/src/grid_scope/connectors/base.py pipeline/tests/test_models.py pipeline/tests/test_connectors.py
       git commit -m "feat: model governed source publication"

---

### Task 2: Create the machine-readable source catalogue

**Files:**
- Create: data/curated/source-catalog.json
- Create: pipeline/src/grid_scope/source_catalog.py
- Create: pipeline/tests/test_source_catalog.py
- Modify: pipeline/src/grid_scope/config.py
- Modify: data/curated/source-registry.json

**Steps:**

1. Write failing tests requiring unique stable IDs, publisher and canonical URL, access mode, publication state, licence name/URL/decision date, refresh cadence, environment-variable names, geographic/category coverage, and notes.
2. Require catalogue entries for every approved Batch 1–5 source. SAPP, WAEIS, and any unclear-rights source must begin quarantined.
3. Run pipeline/tests/test_source_catalog.py and verify RED.
4. Implement load_source_catalog() and indexed lookup. Keep evidence source-registry.json, adding aliases where it overlaps the catalogue.
5. Run the focused and full pipeline tests. Expected GREEN.
6. Commit catalogue, loader, config, registry, and test as "feat: register expansion data sources".

---

### Task 3: Add immutable manual imports and quarantine storage

**Files:**
- Modify: pipeline/src/grid_scope/storage.py
- Create: pipeline/src/grid_scope/manual_import.py
- Modify: pipeline/src/grid_scope/cli.py
- Create: pipeline/tests/test_manual_import.py
- Modify: pipeline/tests/test_publisher.py
- Modify: .gitignore
- Create: scripts/import-source-snapshot.sh

**Steps:**

1. Write failing tests: imports require catalogue ID, expected SHA-256, observation date, and local file; checksum mismatches fail; captures are immutable; quarantine has a separate root/table; public builders cannot read quarantine; publisher rejects quarantined source IDs.
2. Test a safe grid_scope.cli import-source command that never prints secret values or restricted bodies.
3. Run:

       .venv/bin/python -m pytest pipeline/tests/test_manual_import.py pipeline/tests/test_publisher.py -q

4. Implement data/raw governed captures, data/quarantine non-public captures, and data/warehouse local indexes. Persist version, checksum, observation/import dates, media type, and licence decision.
5. Re-run tests and commit as "feat: govern manual and quarantined captures".

---

### Task 4: Build reusable source-family adapters

**Files:**
- Create: pipeline/src/grid_scope/connectors/http_download.py
- Create: pipeline/src/grid_scope/connectors/ckan.py
- Create: pipeline/src/grid_scope/connectors/socrata.py
- Create: pipeline/src/grid_scope/connectors/arcgis.py
- Create: pipeline/src/grid_scope/connectors/tabular.py
- Create: pipeline/tests/test_source_family_connectors.py
- Create: pipeline/tests/fixtures/ckan-package-sample.json
- Create: pipeline/tests/fixtures/socrata-page-sample.json
- Create: pipeline/tests/fixtures/arcgis-layer-sample.json

**Steps:**

1. Write failing tests for pagination, deterministic ordering, timeout/retry behavior, response-size and media-type limits, ETag/Last-Modified capture, secret header injection, CKAN resource selection, Socrata token paging, ArcGIS offsets, and CSV/XLSX/JSON decoding.
2. Reject redirects or payload URLs targeting local/private networks.
3. Run the focused test and verify RED.
4. Implement fetch-only adapters; keep source normalization in source modules and use existing last-known-good patterns.
5. Run focused/full tests and commit as "feat: add reusable public data adapters".

---

### Task 5: Add claim-level lineage and publication-safe canonicalization

**Files:**
- Modify: pipeline/src/grid_scope/models.py
- Modify: pipeline/src/grid_scope/canonicalize.py
- Modify: pipeline/src/grid_scope/power_plants.py
- Modify: pipeline/tests/test_canonicalize.py
- Modify: pipeline/tests/test_power_plants.py

**Steps:**

1. Write failing tests requiring source ID/record ID, observed/published/retrieved dates, value kind, method ID, confidence, publication state, and transformation history per claim.
2. Verify field precedence: official observed, official registry/forecast, institutional research, structured community, OSM fallback.
3. Verify weaker sources fill missing fields but cannot overwrite stronger capacity, lifecycle, commissioning, or demand claims; ambiguous colocated assets stay separate.
4. Run focused tests, implement claim objects/provenance maps, exclude non-publishable claims before scoring/artifacts, then re-run tests.
5. Commit as "feat: reconcile claims by source precedence".

---

### Task 6: Implement PeeringDB without invented capacity

**Files:**
- Create: pipeline/src/grid_scope/connectors/peeringdb.py
- Create: pipeline/tests/test_peeringdb.py
- Create: pipeline/tests/fixtures/peeringdb-facilities-sample.json
- Modify: pipeline/src/grid_scope/demand.py

**Steps:**

1. Write failing tests for identity, organization, address, coordinates, website, status, update time, source URL, optional credentials, paging, and conservative OSM deduplication.
2. Require demandMw to remain null unless another supported source reports it.
3. Run focused tests, implement the connector and structured-community provenance, and re-run.
4. Commit as "feat: ingest PeeringDB facilities safely".

---

### Task 7: Ingest continental African generation and project data

**Files:**
- Modify: pipeline/src/grid_scope/connectors/gem_power.py
- Create: pipeline/src/grid_scope/connectors/afdb_mapafrica.py
- Create: pipeline/tests/test_africa_generation_sources.py
- Create: pipeline/tests/fixtures/gem-africa-energy-tracker-sample.csv
- Create: pipeline/tests/fixtures/mapafrica-projects-sample.json

**Steps:**

1. Write failing tests for GEM Africa facility/unit identity, fuel, technology, capacity, lifecycle, start/retirement years, operator, coordinates, and licence metadata.
2. Test MapAfrica identity, status, dates, location precision, and project category; project budget cannot become capacity and metadata-only entries cannot become points.
3. Run focused tests, reuse GEM parsing primitives with a distinct source/capture, and normalize only source-supported MapAfrica claims.
4. Re-run and commit as "feat: ingest African generation projects".

---

### Task 8: Add African grid and demand context

**Files:**
- Create: pipeline/src/grid_scope/connectors/africa_grid.py
- Create: pipeline/src/grid_scope/connectors/dre_atlas.py
- Create: pipeline/src/grid_scope/connectors/iea_africa.py
- Modify: pipeline/src/grid_scope/regional_demand.py
- Create: pipeline/tests/test_africa_demand.py
- Create: pipeline/tests/fixtures/africa-grid-sample.geojson
- Create: pipeline/tests/fixtures/dre-atlas-sample.geojson
- Create: pipeline/tests/fixtures/iea-building-demand-sample.csv

**Steps:**

1. Write failing tests for World Bank grid geometry metadata, DRE electrification fields, IEA building-demand units/time basis, and IEA catalogue metadata.
2. Assert that catalogue entries alone create no claims, grid distance is not available capacity, and building demand is estimated.
3. Test the approved demand hierarchy and national reconciliation using mixed observed/model/fallback ADM1 fixture data.
4. Run focused tests, implement compact ADM1 context summaries with no new visible layer, and re-run.
5. Commit as "feat: model African grid and demand context".

---

### Task 9: Add Southern and West African regional sources

**Files:**
- Create: pipeline/src/grid_scope/connectors/africa_regional.py
- Create: pipeline/tests/test_africa_regional.py
- Create: pipeline/tests/fixtures/eskom-demand-sample.csv
- Create: pipeline/tests/fixtures/sapp-sample.csv
- Create: pipeline/tests/fixtures/waeis-sample.csv

**Steps:**

1. Write failing tests for Eskom units/timestamps/geography and separate generation/demand observations.
2. Test SAPP and WAEIS normalization into quarantine, including local inspection/counts but zero effect on public records, scores, and artifacts.
3. Run focused tests, implement catalogue-configured automatic/manual access, and keep national discoveries metadata-only until independently licensed/configured.
4. Re-run and commit as "feat: ingest governed African regional data".

---

### Task 10: Ingest Brazil official sources

**Files:**
- Create: pipeline/src/grid_scope/connectors/brazil.py
- Create: pipeline/tests/test_brazil_sources.py
- Create: pipeline/tests/fixtures/aneel-siga-sample.csv
- Create: pipeline/tests/fixtures/epe-webmap-sample.json
- Create: pipeline/tests/fixtures/epe-consumption-sample.csv
- Create: pipeline/tests/fixtures/ons-load-sample.csv

**Steps:**

1. Write failing tests for ANEEL plant/unit IDs, status, fuel/technology, capacity, municipality/state, coordinates, and dates; EPE mapped projects and state/month consumption; and ONS load.
2. Test Portuguese decimals/dates, state mapping, unit conversion, and no double counting between ONS/EPE controls.
3. Run focused tests, implement official CKAN/ArcGIS/tabular mappings, and preserve all external IDs.
4. Re-run and commit as "feat: ingest Brazil electricity sources".

---

### Task 11: Ingest Chile and Colombia official sources

**Files:**
- Create: pipeline/src/grid_scope/connectors/chile.py
- Create: pipeline/src/grid_scope/connectors/colombia.py
- Create: pipeline/tests/test_chile_colombia_sources.py
- Create: pipeline/tests/fixtures/chile-coordinador-sample.json
- Create: pipeline/tests/fixtures/chile-sea-projects-sample.json
- Create: pipeline/tests/fixtures/colombia-xm-sample.json
- Create: pipeline/tests/fixtures/colombia-ipse-sample.csv

**Steps:**

1. Write failing tests for Chile facilities, generation, demand, commissioning/retirement; SEA desalination/environment projects without treating approval as operation; Colombia XM/SIMEM plants/generation/regional demand; IPSE non-interconnected zones.
2. Test public, credentialled, and quarantined catalogue states and strict unit conversions.
3. Run focused tests, implement mappings, re-run, and commit as "feat: ingest Chile and Colombia electricity data".

---

### Task 12: Ingest remaining South American sources

**Files:**
- Create: pipeline/src/grid_scope/connectors/south_america.py
- Create: pipeline/tests/test_south_america_sources.py
- Create: pipeline/tests/fixtures/peru-coes-sample.csv
- Create: pipeline/tests/fixtures/ecuador-cenace-sample.csv
- Create: pipeline/tests/fixtures/uruguay-adme-sample.csv
- Create: pipeline/tests/fixtures/argentina-plants-sample.csv
- Create: pipeline/tests/fixtures/olade-controls-sample.csv

**Steps:**

1. Write failing tests for Peru COES/MINEM, Ecuador CENACE, Uruguay ADME, Argentina official records, and OLADE national controls.
2. Test local date/decimal formats, ISO/ADM1 mapping, stale warnings, unclear-licence quarantine, and the rule that OLADE creates no facility points.
3. Run focused tests, implement automatic/credentialled/manual mappings per catalogue, re-run, and commit as "feat: ingest South American electricity sources".

---

### Task 13: Apply the approved demand hierarchy and supply semantics globally

**Files:**
- Modify: pipeline/src/grid_scope/connectors/regional_electricity.py
- Modify: pipeline/src/grid_scope/regional_demand.py
- Modify: pipeline/src/grid_scope/power_balance.py
- Modify: data/curated/regional-demand-methods.json
- Modify: data/curated/generation-assumptions.json
- Modify: pipeline/tests/test_regional_electricity.py
- Modify: pipeline/tests/test_regional_demand.py
- Modify: pipeline/tests/test_power_balance.py

**Steps:**

1. Write failing multi-country tests proving the approved hierarchy: observed ADM1, official forecast, building/electrification model, national electrification-weighted allocation, population fallback.
2. Prove country-year reconciliation, GWh/MW unit guards, operational-only current supply, commissioning additions, retirement subtraction, and separation of local-generation gap from unmet demand.
3. Run focused tests and verify RED.
4. Implement method IDs, per-metric lineage, confidence propagation, and scale-discontinuity rejection.
5. Re-run focused/full tests and commit as "feat: reconcile regional demand and supply sources".

---

### Task 14: Orchestrate independent source batches

**Files:**
- Create: pipeline/src/grid_scope/source_batches.py
- Modify: pipeline/src/grid_scope/cli.py
- Modify: pipeline/src/grid_scope/config.py
- Modify: pipeline/tests/test_cli.py
- Create: pipeline/tests/test_source_batches.py

**Steps:**

1. Write failing tests for Batch 0–5 ordering, independent failure, last-known-good fallback, missing credential/manual status, quarantine counts, duplicate source IDs, and partial-candidate rejection.
2. Verify one source failure cannot erase other valid data and failed global invariants block atomic publication.
3. Run focused tests, refactor orchestration from refresh(), return batch records/status/warnings/metrics, and put existing connectors into the governed result format.
4. Re-run and commit as "feat: orchestrate governed source batches".

---

### Task 15: Publish compact source and coverage artifacts

**Files:**
- Modify: pipeline/src/grid_scope/snapshot_builder.py
- Modify: pipeline/src/grid_scope/generator_artifacts.py
- Modify: pipeline/src/grid_scope/publisher.py
- Modify: pipeline/tests/test_snapshot_builder.py
- Modify: pipeline/tests/test_publisher.py
- Create: pipeline/src/grid_scope/coverage_report.py
- Create: pipeline/tests/test_coverage_report.py

**Steps:**

1. Write failing tests for a public source-catalog artifact without credentials/restricted bodies; source counts by fetched/normalized/publishable/quarantined/rejected/duplicate/published; before/after geography/category/source counts; demand-method and supply coverage; checksums; quarantine-leak scanning; and size limits.
2. Preserve country generator sharding and reject heavy raw data in initial artifacts.
3. Run focused tests, implement manifest paths and Markdown/JSON coverage reporting under docs/data-quality, then re-run.
4. Commit as "feat: publish source coverage metadata".

---

### Task 16: Extend web snapshot contracts

**Files:**
- Modify: web/lib/snapshot/types.ts
- Modify: web/lib/snapshot/schema.ts
- Modify: web/lib/snapshot/client-load.ts
- Modify: web/lib/snapshot/load.ts
- Modify: web/tests/snapshot.test.ts

**Steps:**

1. Write failing tests for access mode, publication state, licence decision, coverage, batch summaries, source-catalog lazy loading, and backward compatibility with the current manifest.
2. Reject a publishable source without licence metadata and reject secret-like keys/quarantine record bodies.
3. Run:

       npm test --prefix web -- --run web/tests/snapshot.test.ts

4. Implement strict TypeScript/Zod contracts and lazy loading, re-run, and commit as "feat: load governed source metadata".

---

### Task 17: Build the Methodology and sources page

**Files:**
- Create: web/app/methodology/page.tsx
- Create: web/components/methodology/methodology-page.tsx
- Create: web/components/methodology/source-catalog-table.tsx
- Create: web/lib/methodology.ts
- Modify: web/components/status/data-status-drawer.tsx
- Modify: web/app/globals.css
- Create: web/tests/methodology.test.tsx
- Modify: web/tests/responsive-controls.test.ts

**Steps:**

1. Write failing UI tests for definitions/units, precedence, value-kind labels, dedupe, reconciliation, forecast rules, cadence, limitations, source timestamps/licences/access/publication states/counts, and filters by continent/country/category/state.
2. Verify quarantined sources show exclusion reasons but no restricted records. Test keyboard-accessible navigation from the status drawer and responsive layouts.
3. Run focused web tests and verify RED.
4. Implement a compact page in the existing Wattlas language; keep map/filter features unchanged and render live source state from the artifact.
5. Re-run and commit as "feat: add methodology and sources page".

---

### Task 18: Switch operations to monthly and document configuration

**Files:**
- Modify: .github/workflows/refresh-data.yml
- Modify: scripts/refresh-snapshot.sh
- Modify: pipeline/src/grid_scope/cli.py
- Modify: README.md
- Modify: PROJECT_CONTEXT.md
- Create: .env.example
- Create: pipeline/tests/test_refresh_configuration.py

**Steps:**

1. Write failing tests asserting a once-monthly Berlin-time schedule, manual dispatch, monthly concurrency/commit labels, no daily CLI/script text, and secret-free environment examples.
2. Run pipeline/tests/test_refresh_configuration.py and verify RED.
3. Schedule the first day of each month using the existing DST-safe gate. Document automatic, credentialled, manual, quarantine, last-good, import, and secret workflows.
4. Update PROJECT_CONTEXT.md with approved decisions and actual implementation state.
5. Re-run and commit as "chore: operate monthly governed refresh".

---

### Task 19: Run end-to-end fixture refresh and live-source audit

**Files:**
- Modify: pipeline/tests/test_cli.py
- Create: pipeline/tests/fixtures/source-expansion/README.md
- Create: docs/data-quality/2026-07-17-africa-south-america-source-audit.md
- Create: docs/data-quality/2026-07-17-africa-south-america-expansion.md

**Steps:**

1. Add a miniature end-to-end snapshot with African and South American countries, official demand, operating/planned generation, PeeringDB without MW, duplicates, quarantine, failed-with-last-good, and population fallback.
2. Assert manifest counts, reconciliation, precedence, quarantine exclusion, and methodology metadata.
3. Run all pipeline tests.
4. Audit each live source as reachable/publishable, reachable/quarantined, credential-required, manual-required, metadata-only, or unavailable. Record verified licence link, access class, schema date, and required user action. Never represent fixtures as live coverage.
5. Run make refresh with legally available sources. Missing credentials/manual files must yield explicit not_configured statuses, not a failed global refresh.
6. Generate truthful before/after reports from the real resulting counts and commit deterministic fixtures/reports as "test: verify regional source expansion".

---

### Task 20: Final local verification and user review

**Files:** Modify only if verification exposes a scoped defect.

**Steps:**

1. Run:

       .venv/bin/python -m pytest pipeline/tests -q
       npm ci --prefix web
       npm test --prefix web
       npm run build --prefix web
       git diff --check

2. Start local review:

       npm run dev --prefix web -- --hostname 127.0.0.1 --port 3003

3. Verify existing map/search/filter/horizon/inspector interactions; truthful Africa/South America coverage; consistent units/methods; separate health/publication states; methodology counts/filters; zero quarantined data in map/search/scores/public JSON; and responsive layouts.
4. Inspect repository boundaries:

       git status --short
       git ls-files data/raw data/quarantine data/warehouse
       du -sh web/public/data web/.next 2>/dev/null || true

5. Give the user the local URL, source-readiness audit, before/after report, test/build results, and all credential/manual/licence actions together. Do not push.
6. Only after explicit user approval, push the current branch:

       git push origin codex/visual-option-c-concept

