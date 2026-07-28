# Wattlas Mobile and Branding Design

**Date:** 2026-07-28

## Purpose

Make Wattlas easier to understand in search results and browser tabs, then provide a purpose-built mobile map experience without changing the existing desktop interface.

## Approved product title

The Wattlas brand remains unchanged. The product descriptor changes from “Global Infrastructure Opportunity Radar” to:

> **Wattlas | Global Energy Infrastructure Map**

The public metadata will use:

- Browser title: `Wattlas | Global Energy Infrastructure Map`
- Search description: `Explore global energy demand, power generation, infrastructure projects and regional electricity opportunities on one interactive map.`
- Social title: `Wattlas | Global Energy Infrastructure Map`
- Social description: `Explore energy demand, generation capacity and infrastructure opportunities across countries and regions worldwide.`

Existing URLs, the GitHub repository name and the visible Wattlas wordmark remain unchanged. The product will not describe itself as live, real-time or complete because its data is refreshed monthly and coverage varies by region.

## Favicon

Replace the current Vercel-style browser icon with a custom Wattlas favicon:

- A single uppercase `W`
- Wattlas green `#167C68`
- Transparent background
- Thick geometric lettering that remains legible at 16 by 16 pixels
- No map detail, surrounding text or decorative effects
- SVG master artwork
- ICO and PNG browser variants
- Apple touch and Android shortcut variants

The icon changes browser tabs, bookmarks and mobile home-screen shortcuts without altering the desktop page layout.

## Mobile experience

### Breakpoint and desktop protection

The mobile presentation activates at 680 pixels and below, matching the existing narrow-screen boundary. Desktop and large-screen presentation above that breakpoint remain unchanged.

Mobile presentation reuses the existing search, filtering, map, selection and inspector state. It must not fork or duplicate scoring and data logic.

### Mobile header

A compact fixed header contains:

- Small Wattlas wordmark
- Full-width search field
- Monthly refresh status as a small control
- Methodology link inside a compact overflow menu

Search remains available while all sheets and panels are closed.

### Map-first canvas

The map occupies most of the viewport below the header. It retains globe navigation, search camera animation, project markers, clustering, city labels, regional labels, national boundaries, subnational boundaries and the existing data-layer colours.

Map controls use touch targets of at least 44 by 44 pixels.

### Mobile control dock

A compact floating dock above the bottom safe area provides:

1. **Layers** for infrastructure and technology filters
2. **View** for Infrastructure Demand, Site Attractiveness, System Risk and Power Balance
3. **Year** for the 2026 to 2031 horizon

Controls display their active state. Layers also displays the active-filter count.

### Filter bottom sheet

The desktop left rail becomes a draggable mobile bottom sheet containing:

- Infrastructure layers
- Generator technologies
- Project status
- Plant capacity
- Score intensity
- Coverage explanation
- Clear all
- Restore defaults
- Persistent Show results action

Compact accordions prevent all controls from appearing simultaneously.

### Selection and details

Selecting a facility or region opens a compact bottom card containing:

- Name and location
- Facility type or regional score
- Status
- Capacity or headline metric
- More details action

More details expands the card into a nearly full-screen sheet containing the same information as the desktop right-side inspector. Closing the sheet preserves the previous map position.

### Interaction requirements

- Direct map selection never changes the camera.
- Search may intentionally move the camera.
- Browser back closes the active mobile sheet before leaving Wattlas.
- Filters and detail sheets retain their state while open.
- Safe-area padding supports modern iOS and Android devices.
- Reduced-motion preferences disable non-essential sheet and map transitions.
- Landscape phones use a compact two-column sheet where space permits.

## Visual direction

Konsta UI informs the mobile-native interaction patterns such as bottom sheets, large touch targets and compact navigation. Sailboat UI informs clean cards, inputs, buttons and accordion styling. Wattlas will not install either library; the existing design system and components will implement the approved patterns without adding production dependencies.

## Accessibility and verification

Mobile controls must have accessible names, visible focus states, correct expanded-state attributes and keyboard support. Sheet focus must be contained while open and restored to its trigger when closed.

Desktop regression viewports:

- 1440 by 900
- 1280 by 800
- 1024 by 768

Mobile verification viewports:

- 390 by 844
- 430 by 932
- 360 by 800
- Representative phone landscape viewport

Testing covers touch interaction, keyboard search, screen-reader labels, sheet dismissal, filter persistence, selected-item inspection and the invariant that direct map clicks preserve camera position.
