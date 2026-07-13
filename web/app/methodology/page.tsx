import type { Metadata } from "next";
import Link from "next/link";

import { WattlasBrand } from "@/components/branding/wattlas-brand";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "How Wattlas Works: Data Sources and Methodology",
  description: "Learn how Wattlas combines public data on data centres, water infrastructure, power generation, population, electricity demand, and regional boundaries.",
  alternates: { canonical: "/methodology" },
  robots: { index: true, follow: true },
  openGraph: {
    title: "How Wattlas Works: Data Sources and Methodology",
    description: "Public data sources, evidence rules, scoring methods, refresh controls, and limitations behind the Wattlas Opportunity Radar.",
    type: "website",
    url: "/methodology",
    siteName: "Wattlas",
  },
};

const sections = [
  ["overview", "Overview"],
  ["how-it-works", "How it works"],
  ["data-sources", "Data sources"],
  ["evidence", "Evidence labels"],
  ["refresh-quality", "Refresh and quality"],
  ["limitations", "Limitations"],
] as const;

const processSteps = [
  ["Collect", "Connectors retrieve public datasets and curated evidence from official project publications."],
  ["Normalize", "Records are mapped into common fields for geography, lifecycle, technology, capacity, and source history."],
  ["Validate", "Automated checks review schemas, coordinates, coverage, reconciliation, and source availability."],
  ["Model", "Documented inputs produce regional demand, attractiveness, system risk, and power balance views."],
  ["Publish", "A validated snapshot becomes the public map. The previous snapshot remains available if a refresh fails."],
] as const;

const evidenceLabels = [
  ["Observed", "A directly measured or mapped value from a cited source."],
  ["Reported", "A value published by an operator, authority, company, or dataset owner."],
  ["Estimated", "A calculation based on public inputs and documented assumptions."],
  ["Inherited", "A broader geographic value used when reliable local evidence is unavailable."],
  ["Unavailable", "Public evidence is insufficient, so Wattlas does not replace the missing value with zero."],
] as const;

const sourceGroups = [
  {
    title: "Boundaries and geography",
    description: "Country and regional boundaries support map selection, aggregation, and comparison.",
    sources: [
      ["United Nations Geospatial", "Country geometry and boundary context", "https://www.un.org/geospatial/"],
      ["geoBoundaries", "Global first-level administrative boundaries", "https://www.geoboundaries.org/"],
      ["Eurostat GISCO", "European NUTS regional geometry", "https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics"],
    ],
  },
  {
    title: "Population and cities",
    description: "Population adds regional context and city records support map labels and direct search.",
    sources: [
      ["WorldPop", "Population surfaces used to build regional estimates", "https://www.worldpop.org/"],
      ["Eurostat", "European regional population statistics", "https://ec.europa.eu/eurostat/"],
      ["Natural Earth", "Global populated places with more than one million residents", "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/"],
      ["GeoNames", "German populated places with more than 100,000 residents", "https://www.geonames.org/"],
    ],
  },
  {
    title: "Infrastructure facilities",
    description: "Facility records locate data centres, water infrastructure, and power assets where public evidence is available.",
    sources: [
      ["OpenStreetMap", "Community-mapped data centres, water facilities, and power infrastructure", "https://www.openstreetmap.org/copyright"],
      ["QLever", "Query service used for OpenStreetMap planet extracts", "https://qlever.dev/"],
      ["Official project publications", "Company, utility, government, and planning evidence curated by Wattlas", "https://github.com/ad1tyagupta/wattlas/tree/main/data/curated"],
    ],
  },
  {
    title: "Electricity and power generation",
    description: "Generation and electricity records support the Power Balance view and regional context.",
    sources: [
      ["Global Energy Monitor", "Power plant projects and operating assets", "https://globalenergymonitor.org/projects/global-integrated-power/"],
      ["World Resources Institute", "Global power plant reference data", "https://datasets.wri.org/dataset/globalpowerplantdatabase"],
      ["U.S. Energy Information Administration", "United States electricity and generation statistics", "https://www.eia.gov/opendata/"],
      ["Ember", "Country electricity generation and demand statistics", "https://ember-energy.org/data/yearly-electricity-data/"],
      ["ENTSO-E", "European electricity system data when the connector is configured", "https://transparency.entsoe.eu/"],
    ],
  },
] as const;

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "How Wattlas Works: Data Sources and Methodology",
  description: metadata.description,
  url: "https://wattlas.vercel.app/methodology",
  isPartOf: { "@type": "WebSite", name: "Wattlas", url: "https://wattlas.vercel.app" },
  about: ["data centres", "water infrastructure", "electricity generation", "energy infrastructure", "public data"],
};

export default function MethodologyPage() {
  return (
    <main className="methodology-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <a className="methodology-skip-link" href="#methodology-content">Skip to methodology content</a>

      <header className="methodology-header">
        <WattlasBrand href="/" />
        <span className="methodology-header-title">Methodology and sources</span>
        <Link className="methodology-radar-link" href="/">Open Opportunity Radar</Link>
      </header>

      <article className="methodology-article">
        <header className="methodology-hero">
          <p className="methodology-kicker">About the project</p>
          <h1>How Wattlas works</h1>
          <p className="methodology-lede">Wattlas brings public information about data centres, water infrastructure, electricity generation, population, and regional boundaries into one searchable map.</p>
          <p className="methodology-summary">This page explains what the map shows, where its data comes from, and how to interpret values that are measured, reported, or estimated.</p>
        </header>

        <div className="methodology-layout">
          <aside className="methodology-toc">
            <nav aria-label="On this page">
              <p>On this page</p>
              <ol>
                {sections.map(([id, label], index) => (
                  <li key={id}>
                    <a href={`#${id}`}><span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{label}</a>
                  </li>
                ))}
              </ol>
            </nav>
            <p className="methodology-toc-note">Wattlas is an open source research tool. It is not an operational grid control system or investment recommendation.</p>
          </aside>

          <div className="methodology-content" id="methodology-content">
            <section className="methodology-section" id="overview" aria-labelledby="overview-title">
              <p className="methodology-index">01</p>
              <h2 id="overview-title">What Wattlas shows</h2>
              <p>Wattlas helps people explore how infrastructure growth relates to electricity demand, generation, water systems, and population. The default map begins with data centres and water infrastructure. Users can add power generation, regional boundaries, forecasts, and analytical views when they need more context.</p>
              <p>The map is designed for early research. It can help identify regions worth investigating, compare public evidence, and open the source record behind a facility or regional indicator. It does not show live grid conditions or guarantee that a site has available electrical capacity.</p>
            </section>

            <section className="methodology-section" id="how-it-works" aria-labelledby="how-it-works-title">
              <p className="methodology-index">02</p>
              <h2 id="how-it-works-title">How public data reaches the map</h2>
              <p>Wattlas uses a repeatable publication process so that source history and validation remain attached to the map.</p>
              <ol className="methodology-process">
                {processSteps.map(([title, description], index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div><h3>{title}</h3><p>{description}</p></div>
                  </li>
                ))}
              </ol>
            </section>

            <section className="methodology-section" id="data-sources" aria-labelledby="data-sources-title">
              <p className="methodology-index">03</p>
              <h2 id="data-sources-title">Data sources</h2>
              <p>The exact source mix varies by location and map layer. Each published snapshot records source status, observation dates, checksums, evidence links, and known limitations where those details are available.</p>
              <div className="methodology-source-directory">
                {sourceGroups.map((group) => (
                  <section className="methodology-source-group" key={group.title} aria-labelledby={`source-${group.title.toLowerCase().replaceAll(" ", "-")}`}>
                    <h3 id={`source-${group.title.toLowerCase().replaceAll(" ", "-")}`}>{group.title}</h3>
                    <p>{group.description}</p>
                    <ul>
                      {group.sources.map(([name, role, href]) => (
                        <li key={name}>
                          <a href={href} target="_blank" rel="noreferrer">
                            <span><strong>{name}</strong><small>{role}</small></span>
                            <span aria-hidden="true">Visit source ↗</span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </section>

            <section className="methodology-section" id="evidence" aria-labelledby="evidence-title">
              <p className="methodology-index">04</p>
              <h2 id="evidence-title">Evidence labels</h2>
              <p>Wattlas labels the basis of a value so that users can distinguish source data from calculations and missing evidence.</p>
              <dl className="methodology-definitions">
                {evidenceLabels.map(([term, description]) => (
                  <div key={term}><dt>{term}</dt><dd>{description}</dd></div>
                ))}
              </dl>
            </section>

            <section className="methodology-section" id="refresh-quality" aria-labelledby="refresh-quality-title">
              <p className="methodology-index">05</p>
              <h2 id="refresh-quality-title">Refresh and quality controls</h2>
              <p>Wattlas checks upstream sources on a scheduled cycle and publishes only after validation. If a source fails, the site can retain the last successful capture instead of removing a useful layer.</p>
              <ul className="methodology-check-list">
                <li>Schema checks confirm that published records contain the expected fields.</li>
                <li>Coordinate checks catch facilities placed outside valid geographic ranges.</li>
                <li>Coverage and reconciliation checks identify unexpected changes between snapshots.</li>
                <li>The interface reports snapshot freshness and connector status.</li>
              </ul>
              <p>A source being reachable does not mean every geography or field is complete. Observation dates and source notes remain important when comparing records.</p>
            </section>

            <section className="methodology-section" id="limitations" aria-labelledby="limitations-title">
              <p className="methodology-index">06</p>
              <h2 id="limitations-title">Limitations and responsible use</h2>
              <ul className="methodology-limitations">
                <li><strong>Coverage varies.</strong><span>Community-mapped facilities differ in completeness and observation date.</span></li>
                <li><strong>Projects change.</strong><span>Planned capacity, technology, and delivery dates may be revised after publication.</span></li>
                <li><strong>Queues are not headroom.</strong><span>A connection queue does not prove that grid capacity is available.</span></li>
                <li><strong>Some values are estimates.</strong><span>Regional scores are analytical indicators, not measured operating conditions.</span></li>
                <li><strong>Definitions differ.</strong><span>Population, city, facility, and technology definitions vary across source systems.</span></li>
              </ul>
            </section>
          </div>
        </div>

        <footer className="methodology-footer">
          <div><strong>Continue exploring</strong><span>Open the map or inspect the project and its source files.</span></div>
          <Link href="/">Open Opportunity Radar</Link>
          <a href="https://github.com/ad1tyagupta/wattlas" target="_blank" rel="noreferrer">View the open source project</a>
        </footer>
      </article>
    </main>
  );
}
