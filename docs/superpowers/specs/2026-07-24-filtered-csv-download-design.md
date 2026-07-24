# Download filtered data as CSV

This design adds an English-language **Download CSV** action. It exports every infrastructure asset and generator that matches the current filters, without limiting results to the map viewport.

## Goal and audience

The action helps analysts open filtered Wattlas data in spreadsheet software. It creates a comma-separated values (CSV) file from data already loaded by the browser.

## Export scope

The export includes these client-side entity layers:

- Infrastructure assets enabled by the current layer switches
- Generators matching the current technology, lifecycle, and capacity filters

The export excludes regions, scores, cities, grid geometry, hidden layers, and upstream source files. Panning and zooming do not change the exported results.

The browser uses the loaded asset collection and generator catalogue. The feature does not add an API route, refetch snapshot files, or read MapLibre cluster state.

## Download control

Add a **Download CSV** button to the filter rail’s action area. Show the button wherever the filter rail appears and match the existing control styles.

Disable the button in either condition:

- The current filters produce no rows
- The generator layer is enabled, but the generator catalogue is loading or unavailable

Keep the button enabled when the generator layer is disabled and matching infrastructure assets exist. Include the export row count in the accessible label.

Clicking the button downloads a file with a concrete date:

```text
wattlas-filtered-entities-2026-07-24.csv
```

Build the actual filename from the current local date. Do not add a modal or configuration step.

## Filter matching

Reuse the map’s existing filter predicates:

- Infrastructure switches select data centres, water infrastructure, industrial loads, and hydrogen infrastructure
- Lifecycle selection applies to infrastructure assets and generators
- Generator technology and capacity filters call the existing generator matching functions
- Disabled layers contribute no rows

Apply these predicates to the complete client-side collections. Do not use visible map shards or clusters.

## Stable CSV columns

Write columns in this order:

```text
exported_at
snapshot_id
selected_year
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

The `selected_year` column records the interface context. It does not imply that the year filters assets or generators.

Generator rows use `entity_type=generator` and `category=power_generation`. Infrastructure rows use `entity_type=asset`, the snapshot category, and the optional subtype.

Flatten nested data with these rules:

- Split coordinate pairs into `latitude` and `longitude`
- Split low, central, and high ranges into numeric columns
- Join arrays with semicolons
- Join address parts into one readable field
- Keep missing values empty instead of converting them to zero

Map generator `annualGenerationGwh` values to the annual energy columns. Map infrastructure `annualDemandGwh` values to the same columns.

## Excel compatibility and CSV safety

Start the file with a UTF-8 byte-order mark so Excel opens non-ASCII text correctly. Apply standard CSV quoting to values that contain commas, quotes, or line breaks. Double embedded quotes.

Protect text cells from spreadsheet formula execution. Ignore leading spaces and control characters when checking whether the first meaningful character is `=`, `+`, `-`, or `@`. Prefix unsafe text with an apostrophe. Preserve numeric values, including negative numbers, as numbers.

Create a temporary object URL and click a temporary anchor. Remove the anchor after the click, then schedule `URL.revokeObjectURL` with `setTimeout` so the browser can start reading the URL.

## Client-side architecture

Add a dependency-free CSV module under `web/lib/export/`. Keep row normalization, serialization, filename creation, and safety rules in pure functions.

`OpportunityRadar` uses `useMemo` only for filtered feature collections and the row count. It creates normalized rows and serializes the CSV inside the download click handler. This avoids allocating a second 39-column representation of up to 154,211 generators during render or after every filter change.

`OpportunityRadar` passes the row count, disabled state, and click handler to `LayerRail`. `LayerRail` renders the control without owning snapshot or filtering logic.

Do not add a third-party package.

## Failure behavior

When the generator layer needs an unavailable catalogue, disable the download and rely on the existing generator retry control. Do not block infrastructure-only exports when the generator layer is disabled.

If the browser cannot create or trigger the download, log the error and keep the interface usable. Do not show a success message before the browser receives the download request.

## Test coverage

Unit tests verify:

- Generator and infrastructure mapping into the stable schema
- Layer, lifecycle, technology, and capacity filtering
- Empty values remain empty instead of becoming zero
- Coordinate, range, array, and address flattening
- Comma, quote, newline, and UTF-8 byte-order mark handling
- Formula protection after spaces and control characters
- Negative numeric values remain numeric
- Deterministic column order and filename
- Row construction occurs on demand instead of during render

Component tests verify:

- The English **Download CSV** control
- Disabled state while an enabled generator layer waits for its catalogue
- Enabled state while the generator catalogue loads but the generator layer is disabled
- Disabled state for zero matching rows
- Handler invocation when the button is enabled

Run targeted export and control tests, the full frontend test suite, lint, and a production build. Record the existing `snapshot.test.ts` failures as the pre-change baseline, and do not classify them as feature regressions unless their output changes.
