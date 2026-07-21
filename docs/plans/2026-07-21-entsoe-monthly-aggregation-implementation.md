# ENTSO-E Monthly Aggregation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fetch, normalize, aggregate, publish, and explain authenticated ENTSO-E actual load and generation-by-type data without exposing the API token.

**Architecture:** A credential-backed connector queries one complete UTC month in bounded area/document requests, returns a single normalized JSON capture, and falls back to its source-specific last-known-good capture. A pure aggregation layer converts resolution-aware MW points into GWh and coverage metrics. The snapshot publishes a compact `entsoe-monthly.json` artifact; mappings marked direct are eligible evidence while ambiguous zones remain evidence-only.

**Tech Stack:** Python 3.13, httpx, pytest, immutable JSON snapshots, Next.js 16, TypeScript/Zod, GitHub Actions encrypted secrets.

---

### Task 1: Define area, query, and period contracts

**Files:**
- Create: `data/curated/entsoe-areas.json`
- Modify: `pipeline/src/grid_scope/connectors/entsoe.py`
- Modify: `pipeline/tests/test_grid_connectors.py`

**Step 1: Write failing tests**

Add tests proving that:

- the previous complete month is selected at month and year boundaries;
- load queries use `documentType=A65`, `processType=A16`, and `outBiddingZone_Domain`;
- generation queries use `documentType=A75`, `processType=A16`, and `in_Domain`;
- `securityToken` is supplied only through HTTP query parameters and is redacted from safe diagnostics;
- the registry rejects duplicate EIC codes, unknown Wattlas geography IDs, and invalid mapping modes.

Use an immutable query representation:

```python
@dataclass(frozen=True)
class EntsoeQuery:
    area_code: str
    metric: Literal["actual_load", "actual_generation_by_type"]
    period_start: datetime
    period_end: datetime

    def parameters(self, token: str) -> dict[str, str]: ...
```

**Step 2: Verify the tests fail**

Run:

```bash
.venv/bin/python -m pytest pipeline/tests/test_grid_connectors.py -q
```

Expected: failures for missing period/query/registry functions.

**Step 3: Implement the contracts**

Add:

```python
def previous_complete_month(now: datetime) -> tuple[datetime, datetime]: ...
def load_entsoe_areas(path: Path, *, valid_geography_ids: set[str]) -> list[dict]: ...
def safe_entsoe_error(value: object) -> str: ...
```

The versioned registry must include official EIC area code, display name, ISO2 countries, Wattlas geography IDs, and one of `direct`, `composite`, `overlapping`, or `evidence_only`. Start with supported European country/bidding-zone areas from official ENTSO-E area references; use `evidence_only` whenever the mapping cannot be proven non-overlapping.

**Step 4: Verify the tests pass**

Run the targeted test file and expect zero failures.

**Step 5: Commit**

```bash
git add data/curated/entsoe-areas.json pipeline/src/grid_scope/connectors/entsoe.py pipeline/tests/test_grid_connectors.py
git commit -m "feat: define ENTSO-E monthly query contract"
```

### Task 2: Parse and aggregate ENTSO-E market documents

**Files:**
- Modify: `pipeline/src/grid_scope/connectors/entsoe.py`
- Create: `data/fixtures/entsoe-actual-load.xml`
- Create: `data/fixtures/entsoe-generation-by-type.xml`
- Create: `data/fixtures/entsoe-acknowledgement.xml`
- Modify: `pipeline/tests/test_grid_connectors.py`

**Step 1: Write failing parser tests**

Cover:

- namespaced `TimeSeries`, `Period`, and `Point` elements;
- `PT15M`, `PT30M`, and `PT60M` resolutions;
- period start/end, point position, quantity, area, and PSR type;
- duplicate/higher-revision series handling;
- acknowledgement documents as typed errors rather than empty success;
- PSR technology normalization;
- no interpolation across missing points.

**Step 2: Verify red**

Run the targeted tests and confirm the new cases fail.

**Step 3: Implement pure parsing and aggregation**

Use explicit interval arithmetic:

```python
energy_gwh = sum(point_mw * resolution_hours for point_mw in observed_points) / 1000
coverage = observed_points / expected_points * 100
```

Return one record per area/month:

```python
{
  "areaCode": "...",
  "periodStart": "...",
  "periodEnd": "...",
  "demandGwh": 0.0,
  "peakDemandMw": 0.0,
  "meanDemandMw": 0.0,
  "generationGwh": 0.0,
  "generationMixGwh": {"solar": 0.0},
  "coverage": {"loadPct": 0.0, "generationPct": 0.0},
  "sourceIds": ["entsoe"],
  "valueKind": "reported"
}
```

**Step 4: Verify green**

Run parser tests and expect zero failures.

**Step 5: Commit**

```bash
git add pipeline/src/grid_scope/connectors/entsoe.py pipeline/tests/test_grid_connectors.py data/fixtures/entsoe-*.xml
git commit -m "feat: aggregate ENTSO-E load and generation"
```

### Task 3: Add authenticated fetching and source-specific fallback

**Files:**
- Modify: `pipeline/src/grid_scope/connectors/entsoe.py`
- Modify: `pipeline/tests/test_connectors.py`

**Step 1: Write failing connector tests**

With `httpx.MockTransport`, verify:

- no token returns `not_configured` without an HTTP call;
- each configured area receives load and generation requests;
- responses are packaged as one JSON `FetchPayload`;
- retryable 429/5xx errors use bounded retries;
- 401/403, invalid query acknowledgements, and malformed XML produce safe messages without token text;
- partial area failures are recorded and cannot masquerade as complete coverage;
- the token is absent from the payload and `repr(result)`.

**Step 2: Verify red**

Run:

```bash
.venv/bin/python -m pytest pipeline/tests/test_connectors.py -q
```

**Step 3: Implement the HTTP connector**

Change the connector API to:

```python
def fetch(
    self,
    client: httpx.Client,
    *,
    now: datetime,
    areas: Sequence[Mapping[str, Any]],
) -> ConnectorResult: ...
```

Use the official HTTPS endpoint, a Wattlas user agent, bounded request pacing, deterministic ordering, and secret-free exceptions.

**Step 4: Verify green**

Run both connector test files and expect zero failures.

**Step 5: Commit**

```bash
git add pipeline/src/grid_scope/connectors/entsoe.py pipeline/tests/test_connectors.py
git commit -m "feat: fetch ENTSO-E observations securely"
```

### Task 4: Publish the governed monthly artifact

**Files:**
- Modify: `pipeline/src/grid_scope/cli.py`
- Modify: `pipeline/src/grid_scope/snapshot_builder.py`
- Modify: `pipeline/src/grid_scope/publisher.py`
- Modify: `pipeline/tests/test_cli.py`
- Modify: `pipeline/tests/test_publisher.py`
- Modify: `web/lib/snapshot/schema.ts`
- Modify: `web/lib/snapshot/types.ts`
- Modify: `web/tests/snapshot.test.ts`

**Step 1: Write failing pipeline and schema tests**

Assert that:

- `entsoe-monthly.json` is required when declared and its path is snapshot-contained;
- coverage exposes area/observation/direct-eligible counts;
- the manifest never contains a token or request URL;
- only `direct` records with complete mapping and sufficient coverage are marked eligible;
- `not_configured` retains the empty/last-known-good behavior;
- the TypeScript schema accepts the new artifact and rejects invalid records.

**Step 2: Verify red**

Run targeted Python and Vitest tests and confirm the missing artifact/schema failures.

**Step 3: Wire the connector into refresh**

During refresh:

1. load and validate the area registry against active geographies;
2. call `_optional_network_result` with source ID `entsoe`;
3. parse the normalized capture;
4. publish `entsoe-monthly.json`;
5. add `artifacts.entsoeMonthly` and ENTSO-E coverage fields;
6. retain connector status in the manifest;
7. do not alter regional forecasts unless an explicitly eligible annual observation exists.

**Step 4: Verify green**

Run targeted pipeline and web schema tests.

**Step 5: Commit**

```bash
git add pipeline/src/grid_scope/cli.py pipeline/src/grid_scope/snapshot_builder.py pipeline/src/grid_scope/publisher.py pipeline/tests web/lib/snapshot web/tests/snapshot.test.ts
git commit -m "feat: publish ENTSO-E monthly evidence"
```

### Task 5: Explain the source and expose truthful evidence

**Files:**
- Modify: `web/components/methodology/methodology-page.tsx`
- Modify: `web/tests/methodology.test.tsx`
- Modify: `README.md`
- Modify: `PROJECT_CONTEXT.md`
- Modify: `data/curated/source-catalog.json`

**Step 1: Write failing methodology tests**

Require text explaining actual load/generation scope, previous-complete-month cadence, resolution-aware MW-to-GWh conversion, bidding-zone mapping limits, last-known-good fallback, and secret privacy.

**Step 2: Verify red**

Run the methodology test and confirm it fails.

**Step 3: Update documentation and source governance**

Mark ENTSO-E as credentialled, monthly, attributed, and publishable only under the approved aggregate policy. State that raw interval data is not shipped to the browser and ambiguous areas do not affect scores.

**Step 4: Verify green**

Run methodology and source-catalog tests.

**Step 5: Commit**

```bash
git add web/components/methodology web/tests/methodology.test.tsx README.md PROJECT_CONTEXT.md data/curated/source-catalog.json
git commit -m "docs: explain ENTSO-E evidence integration"
```

### Task 6: Configure the secret and perform the first authenticated refresh

**Files:**
- No committed secret file.
- Generated: `web/public/data/latest.json`
- Generated: `web/public/data/snapshots/<timestamp>/`

**Step 1: Run secret scans before configuration**

Search tracked files and history for the provided token value without printing it. Expect no matches.

**Step 2: Set the encrypted repository secret**

Use an echo-disabled stdin prompt:

```bash
gh secret set ENTSOE_SECURITY_TOKEN --repo ad1tyagupta/wattlas
```

Confirm only the secret name and update time via `gh secret list`; GitHub never returns the value.

**Step 3: Run a one-time authenticated smoke test**

Pass the token through an echo-disabled process environment. Query one area and a narrow period; print only status, record counts, periods, and coverage.

**Step 4: Run the governed refresh**

Trigger `refresh-data.yml` manually so the authenticated pull occurs inside GitHub Actions. Monitor to completion and download/inspect the resulting public snapshot.

**Step 5: Verify secrecy and data**

Confirm:

- repository and artifact scans contain no token;
- connector state is current or explicitly partial/cached;
- `entsoe-monthly.json` contains records and no query credentials;
- latest snapshot paths and checksums validate.

### Task 7: Full verification and production release

**Files:**
- Commit generated snapshot files only after validation.

**Step 1: Run full verification**

```bash
.venv/bin/python -m pytest pipeline/tests -q
npm --prefix web test
npm --prefix web run lint
npm --prefix web run build
GRID_SCOPE_REUSE_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npm --prefix web run e2e
```

Expected: zero failures; viewport-specific E2E skips remain expected.

**Step 2: Commit generated public artifacts**

Stage only validated source, docs, tests, `latest.json`, and the new immutable snapshot. Re-run `git diff --cached --check` and token scans.

**Step 3: Push `main`**

Fetch origin, require a fast-forward, and push the verified commit to `main`.

**Step 4: Verify Vercel**

Wait for the Git-triggered production deployment, require `READY`, then verify `https://wattlas.vercel.app/data/latest.json`, the new ENTSO-E artifact, the main Opportunity Radar page, and Methodology & Sources.
