# Wattlas Methodology and Sources Page Design

## Goal

Add a static `/methodology` page that explains Wattlas, its data flow, evidence rules, source categories, refresh model, limitations, and licensing while providing strong search engine metadata and internal navigation.

## Page structure

The page uses the existing Wattlas visual language but reads as a structured editorial reference. It contains a compact header, clear introduction, methodology steps, evidence vocabulary, categorized source directory, refresh and quality controls, limitations, and a final link back to the Opportunity Radar.

The page is server rendered and force static. Metadata includes a descriptive title, search-oriented description, canonical path, Open Graph fields, robots directives, and JSON-LD for a `WebPage` about an open infrastructure data methodology. Copy must not contain em dash characters.

## Sources

Source groups reflect the implemented pipeline: boundaries and geography, population and cities, infrastructure facilities, electricity and generation, regional scoring inputs, and curated official project evidence. Each entry states its role and limitation and links to an authoritative source page.

## Navigation

The existing command bar gains a `Methodology & Sources` link. The methodology page provides a persistent `Open Opportunity Radar` link. Navigation must remain usable on narrow screens.

## City presentation

Million-plus and German large-city records remain searchable at every zoom. City symbols are hidden at global zoom, then appear as fixed-size dots with collision-managed labels at regional zoom. Population does not affect dot size.

## Acceptance

- `/methodology` builds statically with metadata and JSON-LD.
- The page contains no em dash character.
- Source links and core methodology headings are accessible.
- City dots and labels have minimum zoom thresholds and fixed sizes.
- Existing tests and production build pass.
