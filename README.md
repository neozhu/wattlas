# Wattlas

Wattlas is a global Opportunity Radar for examining where data-centre, water, hydrogen, steel, and cement growth may create electricity demand, opportunity, or constraint from 2026–2031—and how operating, planned, and retiring generation may change the balance.

The working version combines a light physical-geography MapLibre globe, strong national boundaries, 3,229 global ADM1 states/provinces, 334 European NUTS-2 regions, an explainable Infrastructure Demand score, supporting Site Attractiveness and System Risk lenses, an Asset Explorer, a Country Intelligence drill-down, rich facility provenance, source status, evidence dossiers, and regional comparison.

## Run locally

Requirements: Python 3.13 and Node.js 22.

```bash
make setup
make refresh
make dev
```

Open `http://127.0.0.1:3000`.

## Verify

```bash
make test
cd web && npm run build
```


## Monthly governed data model

The browser never queries upstream sources directly. The Python pipeline fetches public sources, validates and scores them, and atomically publishes an immutable JSON/GeoJSON snapshot. The interface always reads `web/public/data/latest.json`, so a connector failure does not erase the last useful map.

The hosted workflow checks for a new snapshot once per month at 04:00 Europe/Berlin on the first day of the month, with manual dispatch available at any time. Its paired UTC schedules and Berlin-time gate preserve the same local hour across daylight-saving changes. The app deliberately says **Monthly refreshed**, not “live”.

Sources follow four governed access paths:

- Reusable public endpoints with confirmed licences can publish automatically.
- Account or API-key sources run only when their named environment variables are configured.
- Form- or CAPTCHA-protected releases enter through checksum-verified, versioned manual snapshots.
- Sources with unclear redistribution rights remain in quarantine and never affect public scores or map layers.

For a governed manual release, first calculate its SHA-256 checksum and record the upstream observation date and version, then run:

```bash
scripts/import-source-snapshot.sh \
  gem-africa-energy-tracker /path/to/release.xlsx <sha256> 2026-07-01 2026-07
```

The published `/methodology` page exposes source category, access mode, licence, update status, and publication state. Quarantined sources remain visible there for transparency but their records are excluded from public artifacts.

The global release uses UN national boundaries, geoBoundaries `gbOpen` ADM1 regions, GISCO/Eurostat European context, curated official project evidence, and community-maintained OpenStreetMap infrastructure queried through QLever. India uses the explicitly attributed Government of India boundary perspective; Jammu and Kashmir, Ladakh, Assam, and Arunachal Pradesh are included in the validation gate.

Regional population uses the checksum-pinned WorldPop Global2 R2025A v1 2025 constrained 1 km raster, with official 100 m country rasters used only for otherwise unavailable tiny regions. The production build covers 3,204 of 3,229 ADM1 geographies. The remaining 25 gaps place 11 countries in an explicit country-level-only mode: all boundaries remain selectable, national electricity controls may be shown, but no ADM1 demand share or Power Balance rank is fabricated. Exact coverage and fingerprints are recorded in `docs/data-quality/2026-07-01-global-adm1-production.md`.

The previous published baseline, snapshot `2026-07-01T15-55-32Z`, contains 3,229 global ADM1 regions across 197 countries, 4,325 demand facilities (4,224 data centres and 101 water-infrastructure assets), and 53,252 deduplicated power generators. Ember's 2026-06-23 public Yearly Electricity Data release supplies 5,388 annual country controls across 214 countries/economies; 3,030 ADM1 regions receive modelled 2026–2031 energy rows, of which 1,895 are currently Power Balance-rankable. Another 155 ADM1 regions are published explicitly as country-level-only, bringing the regional-energy artifact to 3,185 series without fabricating unavailable state values. OpenStreetMap-derived records are attributed under ODbL and visibly labelled `community_mapped`; curated announcements are labelled `official_verified`. Missing evidence is stored as `null`, never as zero.

## Industrial-demand candidate release

Local candidate snapshot `2026-07-21T04-48-33Z` adds the downloaded IEA Hydrogen Production and Hydrogen Infrastructure releases, GEM Global Iron and Steel Tracker, and GEM Global Cement and Concrete Tracker. The source files enter through the same checksum-governed manual-snapshot path as other protected releases; their original rows and fields remain traceable. Existing coverage is retained: the candidate still contains all 4,247 data centres, 101 water assets, 238,395 power-source records, 3,229 ADM1 boundaries, 575 cities, and 60,600 grid features from its immediate baseline.

- Hydrogen production: 2,928 normalized projects; an electricity range is calculated only when coordinates, lifecycle, commissioning year, capacity, and power-supply evidence pass the forecast gates.
- Hydrogen infrastructure: 808 records normalize from the release; 27 have enough public location evidence to publish as context assets in this candidate. Pipelines, storage, blending, and terminals never create electricity demand by themselves.
- Cement: 3,469 mappable projects; only explicitly future, capacity-bearing projects can enter the 2026–2031 demand forecast.
- Steel: 1,825 plant/status records, with electric-arc-furnace and direct-reduced-iron evidence required for forecast eligibility.

The annual-energy calculations are versioned and exposed in every eligible project dossier:

- Hydrogen: `capacity MWel × 8.76 GWh/MW-year × capacity factor × grid share`.
- Steel: `capacity kt/year × electricity intensity MWh/tonne`.
- Cement: `capacity Mt/year × 1,000 × electricity intensity MWh/tonne`.

The candidate publishes 7,694 mappable industrial-load assets and 236 unique project-evidence-eligible 2026–2031 industrial projects. Of those, 233 are applied across 137 supported ADM1 forecasts. Three steel increments in Albania and Namibia remain visible but unapplied because their ADM1 demand baselines are explicitly unavailable. These estimates are published as low, central, and high ranges. They add to the existing baseline; they do not overwrite observed demand and they do not replace any existing data-centre, water, or generator records. The public lifecycle filters use Operating, Under construction, Pre-construction, Announced, and Retired.

The ENTSO-E connector reads `ENTSOE_SECURITY_TOKEN` only from the refresh runtime and retrieves actual total load plus generation by production type for the previous complete UTC month. Resolution-aware MW intervals are converted to monthly GWh, peak and mean demand, generation mix, and completeness coverage. The public snapshot contains only these compact aggregates—never the credential or raw interval responses. Direct bidding-zone mappings are separated from composite and evidence-only areas. Monthly observations are evidence-only until a complete annual series can pass a separate annual-control review, so they do not silently rewrite 2026–2031 forecasts or scores. Failed refreshes retain the last successful source-specific aggregate; if no token or capture exists, the connector reports `not_configured`.

Facility details expose all available public identity, address, operational, energy, and source fields. A reported electrical tag remains separate from Wattlas demand estimates; missing capacity is never inferred.

## Data caution

Operational community-mapped facilities provide context and counts only. They do not create future demand MW. Opportunity scores are provisional analyst indices derived only from forward-looking, demand-backed public evidence; they are not observed regional grid measurements.
