# Generator Capacity Range Design

## Objective

Add an expert-grade power-generator capacity filter without changing Wattlas's existing technology, lifecycle, search, map, dossier, or ENTSO-E behavior. The control must let users apply common minimum-capacity thresholds quickly and also define a precise minimum/maximum range.

## Approved interaction

- Place the control inside the Power generators filter group.
- Provide minimum-capacity presets for **All, 10, 25, 50, 100, 250, 500 MW, and 1 GW**.
- Provide one synchronized dual-handle range slider plus numeric **Min MW** and **Max MW** fields.
- Treat a blank maximum as **No limit**.
- Presets update the minimum. They preserve the maximum unless the chosen minimum would exceed it, in which case the maximum becomes No limit.
- Include a plant when `capacityMw >= minMw` and, when a maximum exists, `capacityMw <= maxMw`.
- The default range is All capacities: `0 MW` to No limit.
- Published generator records with `capacityMw = 0` represent unknown or unavailable capacity. They remain visible only when the minimum is 0 MW, and the interface discloses when an active positive minimum excludes them.
- Preserve the chosen capacity range when the Power generators layer is temporarily disabled.

## Architecture and data flow

`OpportunityRadar` owns the committed capacity range. `LayerRail` owns only temporary editing state so dragging or typing does not repeatedly re-filter the global catalogue. Preset clicks commit immediately; slider changes commit on release; numeric fields commit on blur or Enter after validation.

The range is passed to `GlobalMap` and the generator search-index builder. The existing generator shard filter applies technology, lifecycle, and capacity predicates together before points and MapLibre clusters are created. A selected generator that leaves the range is dismissed.

At low zoom, Wattlas must not filter a regional aggregate by its total regional capacity and imply that this is a plant-level result. The already-downloaded generator catalogue used for named-asset search will therefore be retained and grouped into a filtered overview after it is available. Until that catalogue is ready, an active non-default capacity range shows no generator overview rather than a misleading unfiltered one. The default range continues using the published overview immediately.

The existing monthly ENTSO-E aggregate remains additive evidence. This feature does not access the ENTSO-E credential, alter the published observation, or recalculate demand and generation baselines.

## Range behavior

The slider uses a logarithmic mapping so that small utility-scale thresholds remain usable while multi-gigawatt plants still fit. Its upper bound follows the largest known published generator capacity, rounded up for a stable scale. The numeric inputs accept exact non-negative MW values and remain the authoritative values.

Invalid edits are corrected without corrupting the active map filter:

- negative values become 0;
- a maximum below the minimum is rejected until corrected, or cleared to No limit by a preset that exceeds it;
- non-numeric text does not commit;
- exact boundary values are included;
- a Reset action restores 0 MW to No limit.

## Presentation and accessibility

The control uses the current light Wattlas rail styling and stays visually subordinate to the map. Presets are compact buttons. The two slider handles expose accessible labels, values, and keyboard behavior. The active summary reads, for example, `10–250 MW`, `100 MW+`, or `All capacities`. A short note states `Unknown capacity excluded` whenever the minimum is positive.

## Verification

Automated tests cover inclusive thresholds, unknown-capacity behavior, combined technology/lifecycle/capacity filtering, preset and numeric synchronization, range validation, selection dismissal, search filtering, and low-zoom overview behavior. The complete web test suite and production build must pass. Browser verification must confirm the control at desktop and narrow widths, India-centred initial loading, ENTSO-E-backed local snapshot availability, generator marker updates, and no regression to the existing filters or dossier links.

## Publication gate

Run the updated application locally for owner review. Do not push the capacity-filter implementation or deploy it to Vercel until the owner explicitly approves the local version.
