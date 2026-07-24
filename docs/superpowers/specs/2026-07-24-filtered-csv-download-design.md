# Filtered CSV Download Design

## Goal

Add an English-language `Download CSV` action that exports the complete global
set of entities matching the current Asset Explorer filters.

## Scope

The export covers the entity layers already available to the client:

- infrastructure assets enabled by the current layer switches;
- generators matching the current technology, lifecycle, and capacity filters.

The export is global, not limited to the current map viewport. It uses the
already-loaded asset collection and generator catalogue, so it does not add an
API route, refetch snapshot files, or depend on MapLibre cluster state.

The feature does not export regions, scores, cities, grid geometry, hidden
layers, or upstream source files.

## User Interface

Add a `Download CSV` button to the filter rail's action area. The button is
available wherever the filter rail is shown and follows the existing control
styling.

The button is disabled while the generator catalogue is still loading when the
generator layer is enabled. It is also disabled when the current filters produce
no rows. Its accessible label includes the exported row count.

Clicking the button downloads a file named:

```text
wattlas-filtered-assets-<YYYY-MM-DD>.csv
```

No modal or configuration step is added.

## Data Selection

Use the same predicates as the map:

- infrastructure category switches select data centres, water infrastructure,
  industrial loads, and hydrogen infrastructure;
- lifecycle selection applies to both infrastructure assets and generators;
- generator technology and capacity filters reuse the existing generator
  matching functions;
- a disabled layer contributes no rows.

The export operates on the full client-side collections rather than the visible
map shards, ensuring that panning and zooming do not change the downloaded
result.

## CSV Schema

Columns are stable and written in this order:

```text
exported_at
snapshot_id
filter_year
id
name
entity_type
category
subtype
country
region_id
latitude
longitude
location_precision
lifecycle
commissioning_year
retirement_year
target_year
technology
primary_fuel
secondary_fuel
total_capacity_mw
operating_capacity_mw
planned_capacity_mw
demand_low_mw
demand_central_mw
demand_high_mw
annual_energy_low_gwh
annual_energy_central_gwh
annual_energy_high_gwh
operator
owner
address
website
value_kind
confidence
source_type
source_ids
source_url
last_observed_at
```

Generator rows use `entity_type=generator` and
`category=power_generation`. Infrastructure rows use
`entity_type=asset`, their snapshot category, and their optional subtype.

Nested values are flattened:

- coordinate pairs become `latitude` and `longitude`;
- low/central/high ranges become separate numeric columns;
- arrays are joined with semicolons;
- address parts are joined into one readable field;
- missing values remain empty and are never converted to zero.

For generators, `annualGenerationGwh` populates annual energy. For
infrastructure assets, `annualDemandGwh` populates the same generic annual
energy columns.

## CSV Safety and Compatibility

The file starts with a UTF-8 byte-order mark so Excel opens non-ASCII text
correctly. Values containing commas, quotes, or line breaks use standard CSV
quoting, with embedded quotes doubled.

Text cells beginning with `=`, `+`, `-`, or `@` are prefixed with an apostrophe
to prevent spreadsheet formula execution. Numeric values remain numeric.

The browser download uses a temporary object URL, triggers one anchor download,
and revokes the URL immediately afterward.

## Architecture

Add a focused, dependency-free CSV module under `web/lib/export/`. It converts
filtered GeoJSON features into normalized rows, serializes those rows, and
builds the download filename. Keeping these pure operations outside React makes
the schema and safety rules directly testable.

`OpportunityRadar` derives the export rows from existing state with `useMemo`
and passes a row count and click handler to `LayerRail`. `LayerRail` only renders
the button and does not own snapshot or filtering logic.

No third-party package is introduced.

## Error Handling

An unavailable generator catalogue disables export only when generators are
part of the requested result. Existing generator retry behavior remains the
source of recovery.

Browser download failures are not hidden. The click handler logs the error and
leaves the application usable; no success message is shown unless a download is
actually triggered.

## Testing

Unit tests cover:

- mapping generator and infrastructure features into the stable schema;
- applying current layer, lifecycle, technology, and capacity filters;
- preserving empty values instead of writing zero;
- coordinates, ranges, arrays, and addresses;
- commas, quotes, newlines, UTF-8 BOM, and formula-injection protection;
- deterministic column order and filename.

Component tests cover:

- the English `Download CSV` control;
- the disabled state while required generator data is loading;
- the disabled state for zero matching rows;
- invoking the supplied handler when enabled.

Verification runs the targeted export and control tests, the full frontend test
suite, lint, and a production build. Pre-existing unrelated test failures, if
they remain, are reported separately rather than masked.
