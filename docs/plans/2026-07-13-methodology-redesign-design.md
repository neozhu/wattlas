# Wattlas Methodology Page Redesign

## Goal

Reorganize `/methodology` into a clear, readable reference page that explains Wattlas to first-time visitors, retains useful search content, and uses the exact same brand treatment as the Opportunity Radar.

## Problems to solve

The methodology header currently duplicates the Wattlas wordmark with different styling, so it does not match the homepage. The article also combines five-column steps, card grids, two-column source groups, and a split quality section. Those competing layouts make the reading order unclear and give the page a generated, box-heavy appearance.

## Chosen direction

Use a documentation-style structure with a compact sticky header, a restrained hero, a desktop table of contents, and one primary reading column. The page will keep the dark Wattlas visual language, IBM Plex type system, mint accent, and thin separators, but it will remove the card wall and repeated grid patterns.

The desktop article will have two columns: a narrow sticky navigation column and a readable content column. On smaller screens, the navigation will become a compact horizontal section list above the content and the page will use one column.

## Brand consistency

Extract the existing homepage brand block into a shared component and render that component in both the command bar and methodology header. The shared component will own the `WATTLAS` wordmark and the creator attribution. The methodology header will link the brand back to the map without changing its internal typography or color treatment.

## Information architecture

The page will follow one predictable sequence:

1. Overview: what Wattlas is and what questions it helps users explore.
2. How it works: collect, normalize, validate, model, and publish.
3. Data sources: categorized public datasets with plain descriptions and direct source links.
4. Evidence labels: definitions for observed, reported, estimated, inherited, and unavailable values.
5. Refresh and quality: snapshot publication, validation, freshness, and source failures.
6. Limitations: what the map and regional indicators should not be used to conclude.

Each section will use semantic headings and stable anchor IDs. Paragraphs will stay within a readable line length. Process steps, evidence definitions, and source entries will use simple rows separated by lines instead of individual cards.

## SEO and accessibility

Keep the existing static route, title, description, canonical URL, robots directives, Open Graph metadata, and JSON-LD. Preserve descriptive source names and infrastructure terms in natural language. Add a labeled `On this page` navigation landmark, a skip link, visible keyboard focus styles, and semantic `article`, `nav`, `section`, `ol`, and `dl` elements.

The page must not contain an em dash character.

## Responsive behavior

At desktop widths, the table of contents remains visible while the user reads. Below 800 pixels, the header simplifies, the navigation becomes non-sticky and wraps cleanly, source rows stack, and all content remains readable without horizontal scrolling.

## Acceptance criteria

- The homepage and methodology page render the same shared Wattlas brand component.
- The page follows a single, obvious reading order with six anchored sections.
- The source directory is easy to scan and all external links remain available.
- Existing SEO metadata and JSON-LD remain valid.
- The page contains no em dash character.
- The page scrolls independently on desktop and mobile.
- Focus states and landmarks are accessible.
- All tests and the production build pass.
- Desktop and mobile browser checks show no framework error overlay or horizontal overflow.
