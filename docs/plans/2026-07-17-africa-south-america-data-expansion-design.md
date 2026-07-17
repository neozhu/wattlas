# Wattlas Africa and South America Data Expansion Design

**Date:** 2026-07-17  
**Status:** Approved  
**Scope:** Data ingestion, licensing, reconciliation, publication quality, and methodology transparency. The current map features and interaction design remain unchanged.

## Objective

Improve Wattlas coverage and confidence in Africa and South America by adding public power-generation, electricity-demand, grid-context, planned-project, and digital-infrastructure sources without weakening the existing public-data, provenance, or explainability requirements.

The expansion must preserve the existing product decisions: Wattlas is a global Opportunity Radar; Infrastructure Demand remains the primary score; Site Attractiveness, System Risk, and Power Balance remain supporting lenses; the forecast horizon is 2026–2031; public scores use only redistributable public data; and every published value must remain traceable to its source and method.

## Approved ingestion policy

Wattlas will support all four access paths in one governed system:

1. **Automatic public ingestion.** Stable public endpoints with a clear reusable licence are fetched during the monthly refresh and may publish after validation.
2. **Credentialled ingestion.** Public or account-gated APIs are supported through environment variables and GitHub secrets. Missing credentials produce a visible `not_configured` status and retain the last good capture.
3. **Versioned manual snapshots.** Form-, CAPTCHA-, or click-through-protected releases are imported manually, checksum-pinned, dated, and retained as immutable raw captures. The pipeline never automates around access controls.
4. **Licence quarantine.** Sources with unclear redistribution rights may be captured and normalized for evaluation, but remain quarantined. Their records cannot appear on the public map, affect public scores, or enter public artifacts until the source catalogue records an approved reusable licence.

Connector health and publication eligibility are separate dimensions. A technically successful fetch can still be quarantined, and a temporarily failed connector may continue to serve a previously validated, publishable capture.

## Source batches

### Batch 0 — shared governance and ingestion foundations

- Machine-readable source catalogue and licence registry.
- Publication states: publishable, quarantined, rejected, and superseded.
- Access modes: automatic public endpoint, credentialled API, manual snapshot, and metadata-only catalogue.
- Immutable raw capture storage with checksum, retrieval time, observation time, licence decision, and source version.
- Quarantine storage that is physically excluded from the public artifact builder.
- Reusable REST, CKAN, Socrata, ArcGIS, tabular-download, and manual-snapshot adapters.
- Last-known-good behavior, staged batch validation, and per-source failure isolation.
- Claim-level lineage, source precedence, canonicalization, deduplication, and reconciliation.

### Batch 1 — continental Africa

- Global Energy Monitor Africa Energy Tracker for generation facilities and lifecycle.
- World Bank DRE Atlas for distributed-energy and electrification context.
- World Bank Africa Electricity Grid Map for grid proximity and coverage context.
- IEA Africa GIS Catalogue as a metadata and discovery source, not an automatic claim source by itself.
- IEA building-demand outputs for modelled demand weights where redistribution permits publication.
- AfDB MapAfrica for planned and completed energy-project context.
- PeeringDB for named digital-infrastructure facilities. PeeringDB records never imply a megawatt value unless another source reports one.

### Batch 2 — African regional and national sources

- Southern African Power Pool operational and planning releases.
- Eskom public system, generation, and demand releases.
- ECOWAS WAEIS regional electricity information.
- National portals discovered through the IEA Africa GIS Catalogue.

SAPP and WAEIS content remains quarantined until reuse rights are recorded. National sources are enabled individually through the source catalogue, so one unsupported country cannot block the batch.

### Batch 3 — Brazil

- ANEEL SIGA generation registry.
- EPE WebMap project and infrastructure layers.
- EPE state and monthly electricity-consumption releases.
- ONS system-load and operating data.

### Batch 4 — Chile and Colombia

- Chile Coordinador Eléctrico Nacional API and public releases.
- Chile SEA environmental and desalination-project records.
- Colombia XM/SIMEM plant, generation, and regional-demand data.
- Colombia IPSE data for non-interconnected zones.

Every dataset receives an independent licence decision. Records with unclear terms stay quarantined even if the API is technically accessible.

### Batch 5 — remaining South America

- Peru COES and MINEM.
- Ecuador CENACE.
- Uruguay ADME.
- Argentina official plant and system data, with lower confidence or quarantine where currency and reuse rights are unclear.
- OLADE sieLAC for national validation and control totals, not invented facility points.
- PeeringDB for named digital-infrastructure facilities.

## Processing architecture

The governed data flow is:

```text
Fetch or manual import
  → immutable raw capture
  → licence and publication gate
  → source-family normalization
  → quarantine validation
  → canonical claims and records
  → claim-level deduplication and precedence
  → ADM1 assignment
  → demand and supply reconciliation
  → batch quality gates
  → compact public snapshot
```

Raw source files and quarantine material remain outside the Next.js and Vercel deployment. The browser receives only compact public summaries, existing country generator shards, evidence, connector status, and the methodology source catalogue.

## Canonical claims and precedence

Source precedence applies to individual claims rather than replacing whole records:

1. Official observed measurements.
2. Official registries and forecasts.
3. Global Energy Monitor and institutional research.
4. PeeringDB and other structured community sources.
5. OpenStreetMap fallback.

Each claim retains source IDs, source record IDs, observed or published time, retrieval time, value kind, method ID, confidence, licence decision, and transformation history. A lower-ranked source may fill a missing field but cannot overwrite a stronger reported value with an estimate.

Deduplication uses stable external identifiers first, then conservative country, name, operator, technology, location, and capacity matching. Ambiguous facilities remain separate. Raw counts and net-new public map points are reported independently because deduplication will reduce the published total.

## Demand model

The ADM1 demand hierarchy is:

1. Observed ADM1 or utility/service-area electricity consumption.
2. Official regional demand forecast.
3. Electrified-settlement or building-demand model.
4. National control total allocated using electrification-adjusted regional weights.
5. Existing population allocation, clearly labelled as the final fallback.

Every country reconciles back to its national control total within tolerance. Energy values remain in GWh and capacity values remain in MW; the pipeline rejects implausible unit conversions and scale discontinuities. Modelled values remain estimates and must never be presented as meter observations.

## Supply and forecast model

Supply keeps these measures separate:

- nameplate capacity;
- operating capacity;
- dependable or available capacity;
- actual generation;
- planned additions; and
- retirements.

Only operational facilities contribute to current supply. A planned unit enters the forecast in its supported commissioning year. Retired and cancelled units contribute no future supply, and a known retirement reduces future supply in the recorded year. Grid proximity is contextual evidence, not proof of available connection capacity.

## Quality and publication gates

Each source and each batch must pass schema, licence, coordinate, unit, temporal, deduplication, ADM1 assignment, reconciliation, and artifact-size checks. A candidate snapshot publishes atomically only when all required global invariants pass. Otherwise Wattlas continues serving the previous validated snapshot.

The release report records, before and after, by continent, country, source, and category:

- fetched and normalized records;
- publishable, quarantined, rejected, duplicate, and published records;
- countries and ADM1 regions with observed demand;
- countries and ADM1 regions using each fallback method;
- generators with known capacity, lifecycle, and commissioning year;
- reconciliation errors and quality warnings; and
- artifact counts, checksums, and sizes.

## Refresh and failure behavior

The public refresh cadence is monthly. Automatic and credentialled sources are checked monthly. Manual sources retain their last verified version until a new snapshot is explicitly imported. Unavailable sources do not erase valid historical data. Connector status exposes current, cached, stale, failed, or not configured; publication status separately exposes publishable, quarantined, rejected, or superseded.

## Product and methodology changes

The map, filters, scoring lenses, and interactions do not change in this expansion. Existing detail panels gain only the additional source lineage and data coverage generated by the pipeline.

A dedicated **Methodology and sources** page will document:

- every connector, publisher, URL, licence, licence decision, and access method;
- refresh cadence, last check, last successful capture, and observation date;
- geographic and temporal coverage;
- source precedence and claim-level merge behavior;
- demand and supply definitions and units;
- observed, reported, estimated, inherited, and unavailable labels;
- deduplication, ADM1 assignment, reconciliation, and forecast rules;
- known gaps, stale sources, unavailable credentials, and quarantined sources;
- public record counts and before/after coverage; and
- filtering by continent, country, source category, and publication state.

The page may describe quarantined sources and why they are excluded, but must not expose quarantined records or restricted raw data.

## Security and repository boundaries

- Credentials live only in local environment variables and GitHub/Vercel secrets.
- Raw captures, manual source files, and warehouse databases remain gitignored unless a source explicitly permits redistribution and the compact snapshot is intentionally versioned.
- Manual imports require expected checksums and source-catalogue entries.
- Endpoint URLs and response bodies are treated as untrusted input.
- The publisher rejects path traversal, symlinks, malformed geographies, duplicate IDs, invalid coordinates, and quarantine leakage.

## Completion criteria

The expansion is complete when:

- all approved sources have an automatic, credentialled, manual, metadata-only, or quarantine path;
- every available reusable source produces validated normalized records;
- inaccessible sources visibly report the credential, manual file, or licence decision required;
- no quarantined record can affect public artifacts or scores;
- Africa and South America coverage reports show the resulting change without overstating inaccessible data;
- national totals reconcile to ADM1 outputs within the approved tolerance;
- the compact snapshot remains within deployment budgets;
- the Methodology and sources page matches the published manifest and source catalogue;
- pipeline, web, schema, browser, and production-build checks pass locally; and
- no GitHub push occurs until the user approves the verified local result.

