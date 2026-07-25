# Persistent Search and Product Explanations Design

Date: 2026-07-25

## Goal

Make search permanently available, simplify the top navigation, reduce the visual height of the filter rail, and explain Wattlas map modes and analytical views in plain language.

## Approved direction

Use one compact top bar. Keep workspace navigation and the Methodology and Sources link on the left side of the available header space, centre the search control in the viewport, and keep monthly freshness at the extreme right. The header remains one row on desktop.

## Numbered changes

1. Move search to the centre of the top bar and keep it visible when filters are hidden.
2. Remove search from the left filter panel.
3. Remove the source-attention badge from the header.
4. Move Monthly refreshed to the extreme right.
5. Remove the Global label and its divider.
6. Remove the divider between Methodology and Sources and Monthly refreshed.
7. Compact the left rail with reduced spacing and denser control layouts so common 1366 by 768 laptop screens show substantially more filters without scrolling. Scrolling remains a fallback on unusually short screens.
8. Add a methodology explanation that distinguishes Opportunity Radar from Asset Explorer.
9. Add plain-language explanations for Infrastructure Demand, Site Attractiveness, System Risk, and Power Balance.
10. Preserve search usability on narrower screens without allowing it to cover workspace navigation.
11. Run the complete test and production-build checks, verify the interface in a browser, and host it locally on port 3003. Do not push until the user approves.

## Header layout

The Wattlas brand keeps its fixed left column. The remaining header becomes a relative layout containing the workspace switch and Methodology and Sources link, a centred search area, and a compact freshness button at the right edge.

The search component and its existing index remain unchanged. Only its placement changes. Search results continue to appear beneath the input and above the map.

The source-attention count is removed from the header, not from the data-status drawer. Users can still open Monthly refreshed to inspect connector state.

## Filter rail

Removing search immediately returns vertical space to the rail. Additional compaction uses smaller section padding, tighter infrastructure rows, a two-column generator-technology grid, and a two-column view grid. No filter, count, toggle, capacity control, lifecycle control, or analytical view is removed.

## Methodology page

Add a new early section titled How to read Wattlas. It explains:

- Opportunity Radar helps identify where demand, delivery conditions, or constraints deserve attention.
- Asset Explorer is the infrastructure inventory and answers what facilities exist or are planned.
- Infrastructure Demand shows where new electricity use may grow.
- Site Attractiveness shows how practical a location appears for new infrastructure.
- System Risk highlights grid constraints, resilience exposure, and fast demand growth.
- Power Balance compares demand with dependable local generation without treating a local gap as a confirmed shortage.

The writing remains human, direct, and understandable to market-intelligence professionals without requiring modelling knowledge.

## Responsive behaviour

Desktop keeps the one-row centred search. At narrower widths the search shrinks before workspace controls. On mobile the header uses a compact two-row arrangement so the search remains visible rather than disappearing with the command context.

## Verification

- Component tests confirm search moved out of the rail and remains present when the rail is hidden.
- Command-bar tests confirm removed labels and badges are absent.
- Methodology tests confirm the new explanatory content.
- The full test suite and production build must pass.
- Browser verification checks desktop layout, hidden-filter search access, methodology content, and responsive behaviour.
