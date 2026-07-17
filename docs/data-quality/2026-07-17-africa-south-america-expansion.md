# Africa and South America expansion report — 2026-07-17

## Delivered

The expansion adds a governed source catalogue, four access modes, reusable HTTP/CKAN/Socrata/ArcGIS/tabular adapters, regional normalizers, source-precedence reconciliation, failure isolation, source-coverage metadata, and a public Methodology and sources page.

Regional connector families now cover:

- Africa: GEM Africa Energy Tracker, World Bank grid and distributed-renewable catalogues, IEA demand/GIS products, AfDB MapAfrica, PeeringDB, SAPP, Eskom, and ECOWAS WAEIS.
- Brazil: ANEEL SIGA, EPE generation/consumption, and ONS load.
- Chile and Colombia: Coordinador, SEA, XM/SIMEM, and IPSE.
- Remaining South America: Peru COES/MINEM, Ecuador CENACE, Uruguay ADME, Argentina official releases, and OLADE SIELAC controls.

Every normalized record carries source identity and publication state. Power-plant reconciliation retains field-level provenance, dates, transformations, confidence, and source-record identifiers.

## Demand and supply hierarchy

Regional demand uses the highest available compatible evidence in this order:

1. Observed ADM1 electricity values.
2. Official ADM1 forecasts.
3. Building/electrification model estimates.
4. National controls allocated with validated subnational weights.
5. Population fallback, explicitly labelled as modelled.

Energy is stored as GWh for annual demand/generation and MW for instantaneous capacity or peak load. Current generators contribute to the baseline; planned generators contribute only from their target year; confirmed retirements reduce supply from their retirement year. New data-centre and water-infrastructure demand is added only when a forward project has sourced demand evidence.

## Publication controls

- Automatic sources publish only with a confirmed reusable licence.
- Credentialled connectors run only when their environment variables are set.
- Form/CAPTCHA releases are imported as immutable snapshots with checksum, observation date, and version.
- Quarantined inputs are physically separate and rejected if their source IDs appear in a public artifact.
- One failed optional source cannot stop unrelated sources; the last-known-good capture is used when available.
- Coverage regression, country-demand mismatch, or generator shard mismatch blocks atomic publication.

## Current published outcome

The verified snapshot `2026-07-17T08-25-17Z` contains 53,322 generators, including 1,479 in Africa and 2,533 in South America, plus 4,348 demand facilities globally. It retains 3,185 ADM1 regional-energy series and passes demand and generator reconciliation.

No unlicensed regional source was promoted merely to increase counts. ANEEL was unreachable during this run, while GEM and the IEA model require their manual releases. Their zero-record state is visible rather than silently represented as complete coverage.

## Operator runbook

1. Configure reusable endpoint credentials and manual paths from `.env.example`.
2. For a manual source, verify the upstream version, observation date, and SHA-256 checksum.
3. Import it with `scripts/import-source-snapshot.sh`.
4. Run `make refresh`; never copy source rows directly into a public snapshot.
5. Review `/methodology`, connector states, published counts, and reconciliation gates.
6. Publish only after pipeline tests, web tests, and the production build pass.

The scheduled workflow runs monthly at 04:00 Europe/Berlin on the first day of the month. Manual dispatch remains available for a newly released or corrected source.
