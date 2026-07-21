# Wattlas Demand Intelligence and Asset Explorer Design

**Date:** 2026-07-21  
**Status:** Approved  
**Delivery constraint:** Build and verify locally. Do not push to GitHub until the user approves the preview.

## Objective

Strengthen Wattlas as a global Opportunity Radar by connecting explicit future industrial electricity demand with the existing regional demand baseline, planned data centres, water infrastructure, and power-generation pipeline. The portal will also gain a cleaner Asset Explorer and country-level intelligence drill-down inspired by the strongest interaction patterns in Global Energy Monitor, while preserving Wattlas's distinct purpose: explaining where demand growth may outrun dependable supply.

The validated product decisions remain unchanged: the portal is global, public-data-only, monthly refreshed, and covers 2026–2031. Infrastructure Demand remains the primary score. Site Attractiveness, System Risk, and Power Balance remain supporting lenses. National and ADM1/NUTS2 boundaries remain selectable, and India continues to use the Government of India boundary perspective.

## Product architecture

Wattlas has two top-level working modes:

1. **Opportunity Radar** remains the default. It ranks geographies and explains the demand-versus-supply outlook.
2. **Asset Explorer** provides a facility-first view with compact counts, technology and lifecycle filters, smaller map symbols, and detailed project dossiers.

**Country Intelligence** is a drill-down reached from either mode, not a third top-level product. It combines current demand and supply, committed additions and retirements, the 2026–2031 balance, technology mix, project pipeline, data confidence, and source lineage for the selected country.

Search remains global and can jump to a country, state/region, city, demand asset, hydrogen-network project, or generator.

## Visual and interaction direction

- Replace the dark presentation with a calm light map and white interface surfaces.
- Preserve subtle physical geography: water and rivers are blue, vegetation/forest areas are muted green, and terrain detail remains secondary to data.
- Use a rotatable globe at global zoom and transition naturally to the planar regional view when zooming in.
- Use smaller facility dots than the current portal. Renewable generation uses brighter colors; fossil generation uses darker colors.
- Keep the left filter rail compact. Display counts beside asset types, technologies, and lifecycle states.
- Provide five lifecycle filters: Operating, Under construction, Pre-construction, Announced, and Retired. Raw source statuses are normalized into those public groups while the original source status remains available in the dossier.
- Selecting a point opens a compact project summary with name, type, status, capacity or demand, commissioning year, and location. The existing right panel remains the full evidence and forecast dossier.
- Asset Explorer may show many points, but the Opportunity Radar retains a calmer default layer state so first use is not overwhelming.

## Source inputs

The first local release uses the downloaded, versioned workbooks:

- IEA Hydrogen Production Projects Database, June 2026.
- IEA Hydrogen Infrastructure Projects Database, June 2026.
- Global Energy Monitor Global Iron and Steel Tracker, June 2026: plant, steel-unit, and iron-unit files.
- Global Energy Monitor Global Cement and Concrete Tracker, July 2025.

These records are additive. Existing data-centre, water, power-generation, Africa, South America, boundary, population, city, and baseline-demand records are retained. Source binaries enter the existing governed manual-snapshot flow with checksum, observation date, version, licence, and publication decision. Public artifacts contain compact normalized records, not source workbooks.

The existing ENTSO-E connector remains credentialled through `ENTSOE_SECURITY_TOKEN`. Until the approved token is provided, connector health is `not_configured`, the last valid public data remains available, and no regional demand is fabricated.

## Canonical asset model

The asset model gains two categories:

- `industrial_load`: hydrogen production, steel, and cement facilities.
- `hydrogen_infrastructure`: pipelines, blending projects, storage facilities, import terminals, and export terminals.

Each asset may retain reported capacity and unit, annual electricity-demand range, grid-connection class, technology detail, source status, operator/owner, target year, coordinates and precision, source IDs, source record IDs, project page URL, confidence, and demand-method ID.

Hydrogen infrastructure is a contextual network layer. Pipelines, blending, storage, and terminals never create an electricity-demand increment merely because they exist. Any separately reported production equipment must reconcile to a hydrogen-production record before it can affect demand, preventing double counting.

## Lifecycle normalization

The public lifecycle groups are normalized as follows:

- **Operating:** operational or operating assets.
- **Under construction:** construction, FID/construction, and equivalent committed build states.
- **Pre-construction:** permitted, feasibility study, planning filed, and other supported development states beyond a bare announcement.
- **Announced:** concept and announced projects without stronger development evidence.
- **Retired:** retired, decommissioned, and operating-pre-retirement assets once their retirement year is reached.

Cancelled, dormant, shelved, mothballed, and on-hold records remain searchable in Asset Explorer when the source permits, but are excluded from committed forward demand and the five primary status counts. The raw source label remains visible.

## Demand model

All regional electricity quantities use **GWh per year**. Capacity remains **MW**. A project's forecast contribution must be reproducible from a versioned assumption and its reported inputs.

### Hydrogen production

- Only electrolytic production with grid or grid-plus-renewables electricity may affect grid demand.
- A reported electrolyser capacity in MWel is converted to annual electricity using a documented utilization and grid-share range.
- Dedicated-renewable and nuclear-supplied projects remain visible but do not automatically add local grid demand.
- Fossil hydrogen production with carbon capture is not treated as an electrical load unless an explicit electrical input is reported.
- Hydrogen output without defensible electrical capacity may support context but does not receive an invented MW value in this release.

### Steel

- Plant and unit files are joined through GEM identifiers.
- Future electric-arc-furnace capacity may create an annual demand range using a documented MWh-per-tonne intensity.
- Direct-reduced-iron capacity is visible and classified, but electricity demand is added only when the technology and power pathway support a defensible estimate. Hydrogen production already represented elsewhere is not counted twice.
- Blast furnace and basic oxygen furnace production is not naively converted into electrical demand.

### Cement

- Future announced and construction facilities with reported cement capacity may create a conservative electrical demand range for grinding and plant auxiliaries.
- Kiln thermal energy is not mislabeled as electricity.
- Records lacking commissioning year, usable capacity, or location remain visible where possible but do not enter a regional forecast.

### Forecast eligibility

A demand increment affects the 2026–2031 regional forecast only when it has:

1. a publishable source and at least one source ID;
2. a valid ADM1 assignment;
3. a supported commissioning year between 2026 and 2031;
4. an eligible active lifecycle;
5. a non-negative low/central/high annual GWh range; and
6. a versioned demand-method ID.

The right-side forecast explanation separates current baseline demand, existing data/water additions, industrial additions by sector, new generation, retirements, and the resulting demand gap. No current demand observation is overwritten by a project estimate.

## Geographic assignment and reconciliation

Exact project coordinates are assigned to the existing canonical ADM1 geometry. Source-provided country and subnational names are supporting evidence, not substitutes for point-in-polygon assignment. Records outside valid geometry or with ambiguous coordinates are quarantined from regional scoring until resolved.

Country Intelligence sums ADM1 values only after checking reconciliation against the national control. It always labels observed, reported, modelled, inherited, and unavailable values distinctly.

## Provenance, confidence, and quality gates

Every derived demand value stores reported inputs, formula/method version, output range, source IDs, and source record IDs. The pipeline rejects impossible coordinates, reversed ranges, negative capacities, unit mismatches, duplicated facility/unit claims, unknown status mappings, and infrastructure records leaking into demand increments.

Release reporting includes source rows, normalized assets, published assets, forecast-eligible assets, excluded rows by reason, projects assigned to ADM1, demand GWh by sector/year, and coverage by country. Counts in the UI come from the published snapshot rather than hard-coded marketing values.

## Methodology and source disclosure

The Methodology and Sources page will document:

- the four new source families, releases, licences, access paths, and checksums;
- raw-to-public lifecycle mappings;
- hydrogen, steel, and cement demand formulas and their limitations;
- the distinction between capacity MW and annual energy GWh;
- why hydrogen-network assets do not automatically affect demand;
- how ADM1 assignment, deduplication, and double-count prevention work;
- ENTSO-E's credentialled status and the effect of a missing token; and
- before/after published coverage calculated from the local snapshot.

## Completion criteria

The local version is ready for review when all approved workbooks are governed and parsed; existing data remains intact; eligible industrial demand changes regional forecasts with auditable lineage; infrastructure-only hydrogen records do not change demand; the light globe, Asset Explorer, lifecycle filters, compact point summary, and country drill-down work; the methodology matches the snapshot; pipeline and web tests and production build pass; and the portal is hosted locally without a GitHub push.
