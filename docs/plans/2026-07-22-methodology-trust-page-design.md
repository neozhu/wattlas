# Wattlas Methodology and Sources Trust Page

## Purpose

The Methodology and Sources page is the explanation behind Wattlas. Its main audience works in energy, infrastructure, market intelligence, business development, and grid planning. These readers understand demand, supply, capacity, projects, and markets, but they should not need software or data engineering knowledge to understand the page.

The page must help a reader answer four questions:

1. Why was Wattlas created?
2. What does Wattlas measure?
3. How are the estimates produced?
4. Which sources can the reader check for themselves?

Search visibility is useful, but human clarity and trust come first.

## Writing principles

1. Use short sentences and familiar words.
2. Explain the idea before showing the formula.
3. Keep the existing technical detail, release names, checksums, licences, limitations, and source links.
4. Avoid em dashes and decorative dash punctuation in public copy.
5. Avoid claims that a modelled regional gap is a confirmed electricity shortage.
6. Explain what is observed, what is reported, and what is estimated.
7. State clearly that Wattlas is an independent open source project and not an official Siemens Energy product.

## Page structure

### 1. Navigation and introduction

Keep the return link and page title. Remove the line that reads `PUBLIC DATA · EXPLAINABLE METHODS · 2026–2031`.

The introduction will explain in plain language that Wattlas brings demand projects, power supply, regional context, and public source evidence into one map.

### 2. Why I built Wattlas

Add a personal story near the top of the page. It will explain that Aditya Gupta works in predictive maintenance at Siemens Energy and originally wanted a practical way to find new data centres and desalination plants around the world. The data was scattered across company announcements, planning records, public datasets, and project trackers. Wattlas began as a way to bring those projects onto one map.

The story will then explain how the project expanded into power generation, regional demand, industrial projects, and forecast views after feedback from LinkedIn readers, teammates, and people working in grid planning and market intelligence.

A visible note will state that Wattlas is an independent open source project. It is not an official Siemens Energy product and does not represent the company.

### 3. How Wattlas works

Retain the six core method topics, but rewrite each one in plain language:

1. Demand and capacity use different units.
2. Better evidence takes priority.
3. Regional figures use the best local data available.
4. Future supply follows project timing and status.
5. A local generation gap is not always a shortage.
6. Every published claim keeps its source history.

### 4. Adding more depth to regional data

Rename the current regional section. Explain that early coverage in Africa and South America was less detailed than coverage in Europe, North America, and Asia. Wattlas therefore added more official, regional, and research sources for those places.

Keep the existing details for global generation, Brazil demand, Europe monthly observations, and Africa grid context. Present each source addition as a short answer to three questions:

1. What was missing?
2. What source was added?
3. How does Wattlas use it?

### 5. How planned projects become future electricity demand

Replace the current industrial section title and introduction. Start with a four step explanation:

1. Read the reported project information.
2. Convert the reported project size into an electricity range when a supported method exists.
3. Use project status and timing to decide when it can affect the forecast.
4. Publish a low, central, and high estimate with the source and assumptions.

Retain the exact hydrogen, steel, and cement formulas. Retain release dates, checksums, licences, lifecycle rules, network exclusions, regional assignment rules, and ENTSO E limitations. Place technical details after the plain language explanation.

### 6. Current publication evidence

Keep the live record totals and asset totals. Rewrite labels so readers can distinguish between a source that is approved for use and a source that contributed records to the current snapshot.

### 7. Complete source library

The existing 32 source catalogue is only one part of the source system. The page will combine:

1. 32 governed regional and connector sources.
2. 27 curated project, demand, and modelling sources.
3. 8 early European opportunity sources.

After removing nine overlaps, these files contain 58 distinct named source records. The page will also disclose foundational geography and population sources separately because they are not all represented in the governed expansion catalogue.

The visible source library will separate:

1. Sources contributing to the current snapshot.
2. Supply and generation sources.
3. Demand and industrial project sources.
4. Country and regional sources.
5. Geography, population, and modelling references.
6. Sources waiting for access or licence confirmation.

Global hydrogen, steel, cement, and power sources will receive complete continent metadata so regional filters show every applicable source. Europe must no longer appear to rely on only two inputs.

Each source entry will retain publisher, coverage, use, access method, publication state, licence, and a public link where available.

## Generator capacity control

Remove the quick capacity preset buttons. Keep the two handle range slider, exact minimum and maximum MW inputs, active range label, validation, unknown capacity note, and reset button.

## Visual design

Retain the current Wattlas color system and typography. Apply the trust and authority structure recommended by the referenced UI UX Pro Max repository:

1. Use a readable editorial page width for prose.
2. Use clear section numbers and descriptive headings.
3. Use soft borders and subtle surface changes instead of decorative effects.
4. Keep body line length near 65 to 75 characters where possible.
5. Use at least 1.5 line height for long text.
6. Maintain a minimum 4.5 to 1 contrast ratio for normal text.
7. Keep keyboard focus visible and heading levels sequential.
8. Use restrained transitions and respect reduced motion settings.

## Testing and acceptance

Automated tests will confirm:

1. Capacity presets are absent while the slider and exact inputs still work.
2. The personal story and independence statement are visible.
3. The removed introduction line does not appear.
4. Plain language regional and industrial explanations are present.
5. The source library reports the complete source system rather than only 32 sources.
6. Europe and other continent filters include globally applicable datasets.
7. Existing source filtering, scrolling, live counts, licences, and technical disclosures remain available.

The complete web tests, lint checks, production build, and local browser review must pass. The result will remain local until Aditya approves it for GitHub and Vercel.
