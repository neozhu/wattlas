# Live interface parity design

## Goal

Restore the local Wattlas map portal to the exact visual and interaction design currently deployed from `origin/main`, while retaining the newly implemented governed ingestion architecture, refreshed data snapshot, and Methodology and Sources page.

## Reference of record

The interface reference is commit `1360a0a` on `origin/main` and the deployed portal at `https://wattlas.vercel.app`. The live portal defines the header, branding, search placement, filter rail, map styling, inspector composition, horizon control, typography, spacing, default layer state, and responsive behavior.

## Architecture

Portal presentation files will be restored from `origin/main` rather than manually approximated. Data contracts and source-governance additions will then be reconciled at the narrowest integration boundaries so the restored portal can read the new snapshot without adopting the discarded futuristic styling.

The new Methodology and Sources route remains in place. Its link will use the placement and treatment already present in the live portal. Pipeline, source catalogue, connector, audit, and refresh-workflow code is outside the visual restoration scope.

## Interaction contract

- The main portal must visually match the deployed site.
- The live default layer state is preserved: data centres and water infrastructure enabled; power generators disabled until selected.
- Search, filter hiding/restoration, power technology toggles, map selection, inspector tabs, evidence actions, resizing, and the 2026–2031 horizon retain live behavior.
- The refreshed Africa and South America records remain available through the same live interaction model.
- Source freshness remains monthly and the Methodology and Sources page remains reachable.

## Data compatibility

The local `latest.json` and its immutable snapshot remain the data source. Any schema additions used by the methodology/source catalogue are retained. Portal components may ignore additive metadata, but must not alter or discard it.

## Verification

- Compare local and deployed screenshots at the same desktop viewport.
- Compare interactive-element snapshots for labels, roles, checked states, and ordering.
- Run the complete web test suite and production build.
- Verify `/` and `/methodology` return HTTP 200 with no error overlay or hydration failure.
- Keep the result local; do not push to GitHub until the user approves the preview.
