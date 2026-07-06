# Map Controls and Contextual Search Design

## Goal

Make Wattlas's analytical canvas less cluttered while keeping controls recoverable, and let users research any selected named entity directly through Google.

## Validated interaction design

The left filter rail gains a compact **Hide filters** button. Collapsing it removes the rail from the layout and expands the map into the released space. A persistent **Show filters** control remains beside the map so the action is always reversible. The controls expose their expanded state to assistive technology and preserve the user's active filters while hidden.

Every selected named entity—generator, data centre, water facility, country, state, or region—gets a small Google Search action beside its title. Queries use the exact entity name plus useful available context such as country, geography, technology, or infrastructure category. Links open a new tab with `noopener`/`noreferrer` protection and descriptive accessible labels.

The large attribution panel below the map is removed. Required map attribution remains in MapLibre's compact attribution control. A subtle linked line reading **An open-source project by Aditya Gupta** appears below the Wattlas wordmark in the command bar.

## Components and state

- `OpportunityRadar` owns a `filtersVisible` boolean so the rail and map layout change together without resetting filter state.
- `LayerRail` receives an `onHide` callback and renders the hide control.
- A small restore control is rendered when the rail is collapsed.
- `EntityInspector` derives a safely encoded Google query for the currently selected entity and renders one consistent title-level action.
- `CommandBar` owns the relocated project attribution.
- `GlobalMap` removes the custom attribution block but keeps MapLibre attribution enabled.

## Responsive behavior

Desktop and tablet layouts release the rail column when collapsed. Mobile retains a reachable show/hide control with a minimum 44px target. The title-level search action wraps cleanly without covering long names.

## Testing

Component tests verify hide/show state preservation, contextual Google URLs for all entity categories, safe new-tab behavior, relocated attribution, and removal of the custom map attribution panel. Responsive and end-to-end checks verify that the canvas remains usable at desktop, in-app-pane, and mobile widths.

