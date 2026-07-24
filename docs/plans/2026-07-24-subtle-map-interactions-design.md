# Subtle Map Interactions Design

## Goal

Make Wattlas feel smoother and easier to navigate without changing its core workflows or visual identity.

## Approved direction

### Map navigation

Use a two-stage MapLibre camera transition when the selected location changes.

1. Pull back to a wider view for roughly 0.9 seconds.
2. Travel to the selected location and settle at the correct zoom for roughly 1.8 seconds.

The full sequence should take about 2.7 seconds. Nearby selections may use a shorter direct move when a full pullback would feel unnecessary. People who prefer reduced motion should receive a short, direct transition.

The same behavior should work for selections made on the map and through search. Countries, states, regions, cities, facilities, and generators should supply either coordinates or bounds to the camera controller.

### Details panel

The right details panel starts open on a fresh visit. A visible Hide details button collapses it and gives the globe more space.

Selecting another item while the panel is hidden does not reopen it. The compact bottom selection summary stays visible and includes a More details button. That button restores the full right panel. The preference is remembered for the current browser session.

### Methodology link

Keep the existing Wattlas styling, but give Methodology & Sources a medium gray outline and a subtle neutral background. Hover and keyboard focus should strengthen the outline without competing with the active workspace tab.

### Asset Explorer summary

The Asset Explorer summary should sit inside the map workspace below the command bar. It must not cover the Opportunity Radar or Asset Explorer tabs. Desktop and tablet layouts should reserve enough top space for the summary while retaining maximum map area.

## Accessibility

- Respect `prefers-reduced-motion`.
- Keep inspector hide and restore controls keyboard accessible.
- Use explicit accessible names and expanded state.
- Preserve visible focus styles.
- Do not rely on animation to communicate the selected location.

## Testing

- Unit test the camera plan for distant, nearby, and reduced-motion selections.
- Component test right-panel hide and restore behavior.
- Verify the Methodology link and Asset Explorer summary layout contracts.
- Run the complete web test, lint, and production build.
- Inspect the local site in a real browser at desktop and tablet widths.
