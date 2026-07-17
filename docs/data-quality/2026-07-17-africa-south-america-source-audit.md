# Africa and South America source audit — 2026-07-17

## Decision

Wattlas uses the approved hybrid ingestion policy. A source may affect the public map and scores only when its redistribution terms are confirmed and its records pass normalization, lineage, geography, and reconciliation checks. Credentialled and manual sources remain inactive until configured. Sources with unclear redistribution rights are stored separately as quarantine metadata or captures and cannot enter public artifacts.

## Governed inventory

- 24 expansion sources are registered.
- 3 are publishable: GEM Africa Energy Tracker (manual snapshot, CC BY 4.0), IEA Building-level Electricity Access and Demand Model (manual snapshot, CC BY 4.0), and ANEEL SIGA (automatic, ODbL 1.0).
- 21 remain quarantined pending explicit redistribution confirmation.
- Access modes: 12 automatic, 2 credentialled, 8 manual snapshot, and 2 metadata-only.

Registration is not counted as ingestion. A source contributes public records only when the published snapshot reports a non-zero count for that source.

## Refresh result

Snapshot `2026-07-17T08-25-17Z` passed all atomic-publish gates:

- Country-demand reconciliation: passed.
- Generator artifact reconciliation: passed.
- 3,185 regional-energy series retained.
- 55,967 source power records were normalized from the current OpenStreetMap capture.
- 53,322 generators passed publication geography and coordinate checks.
- 4,348 demand facilities were published: 4,247 data centres and 101 water-infrastructure assets.

The regional baseline visible in this snapshot is:

| Region | Published generators | Countries with generator shards | Demand facilities |
|---|---:|---:|---:|
| Africa | 1,479 | 52 | 82 (77 data centres, 5 water assets) |
| South America | 2,533 | 12 | 164 (157 data centres, 7 water assets) |

These are snapshot counts, not claims of complete real-world coverage.

## Source states and blockers

- ANEEL SIGA timed out from the current network and had no last-known-good ANEEL capture, so it contributed zero records. The failure was isolated and clearly reported; it did not erase other data.
- GEM Africa Energy Tracker is ready for checksum-verified import but no downloaded release was supplied in `GEM_AFRICA_ENERGY_TRACKER_PATH`.
- The IEA building-demand model is ready for checksum-verified import but no release was supplied in `IEA_BUILDING_DEMAND_PATH`.
- Credentialled sources remain inactive until their named keys are configured.
- The other 21 expansion sources remain quarantined and have no effect on scores or map layers.

## Quality interpretation

OpenStreetMap facilities are community-maintained operational context. They support facility discovery and counts but do not automatically become forward demand or official capacity evidence. Official, licensed project registries outrank community records field-by-field when both identify the same facility. Missing capacity or demand remains null and is never inferred from facility existence alone.

The next material coverage increase requires one of three evidence events: a successful ANEEL endpoint response, a governed GEM/IEA manual release, or documented licence clearance for a quarantined source.
