# Search and Progressive Filters Design

## Goal

Make Wattlas easier to enter for new users while preserving the depth needed by infrastructure and energy professionals. The first interaction should feel like “search or choose a view,” not “decode a cockpit.”

## Validated direction

Use a map-jump search with autocomplete suggestions. Users can search countries, states/provinces, regions, facilities, and power generators. Results should match both prefixes and contained text, but rank exact and prefix matches higher than broad contains matches. Selecting a result should select the entity, open the right inspector, and, where map support exists, move the map toward that entity.

Use progressive filter organization. The left rail remains the control home, but the default view exposes only the most important choices: search, view/lens, infrastructure type, and active filters. More specialized controls move into collapsed groups so first-time users are not hit with every generator technology and lifecycle at once.

## Search behavior

Search should appear near the top of the control rail and use a compact combobox pattern:

- input placeholder: “Search places, projects, generators…”
- grouped suggestions: Places, Power generators, Data centres, Water infrastructure
- matching: exact, starts-with, then contains
- selection: update the selected entity and inspector
- analytics: track search submit/selection as meaningful actions
- fallback: show a plain “No matching places or assets” message

If an entity is hidden by a current layer filter, the interface should make the mismatch clear and allow the user to reveal the relevant layer in one click in a later release. For the local trial, selection should still work and the inspector should show the result.

## Filter behavior

The filter rail should be reorganized into clearer sections:

1. **Search**
2. **View**
   - analytical lens
   - active year remains in the timeline
3. **Infrastructure**
   - data centres
   - water infrastructure
   - power generators
4. **Advanced power filters**
   - generator technology
   - lifecycle/status
   - collapsed by default
5. **Map keys**
   - score intensity
   - coverage

Active filter chips should summarize the current state in plain English, such as “All infrastructure,” “Power: all technologies,” or “Power: 8 technologies.” Chips are informational in the local version; removable chips can come later.

## First-load calmness

The interface should reduce perceived intimidation without hiding the product’s analytical seriousness:

- keep the global map visible;
- keep point clustering behavior;
- make advanced filters one click deeper;
- use concise section labels;
- avoid long explanatory text in the rail;
- keep detailed explanations in the inspector and data status drawer.

## Testing

Component tests should verify:

- autocomplete results include country/state/facility/generator matches;
- selecting a search result opens the matching inspector state;
- the advanced power filters are collapsed by default and expandable;
- core infrastructure toggles remain immediately accessible;
- hide/show filter behavior still preserves filter state;
- meaningful analytics fire for search selection and advanced filter expansion.

## Local rollout

This change should be implemented and verified locally first. It should not be pushed to GitHub until the user tests the local version and approves it.
