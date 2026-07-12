import type { Metadata } from "next";
import Link from "next/link";

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

const sourceGroups = [
  {
    title: "Boundaries and geography",
    description: "Country and regional geometry supports selection, aggregation, and comparison. Boundary sources do not determine political claims made by Wattlas.",
    sources: [
      ["United Nations Geospatial", "Country geometry and boundary context", "https://www.un.org/geospatial/"],
      ["geoBoundaries", "Global first-level administrative boundaries", "https://www.geoboundaries.org/"],
      ["Eurostat GISCO", "European NUTS regional geometry", "https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics"],
    ],
  },
  {
    title: "Population and cities",
    description: "Population provides regional context and helps normalize demand. City records support map labels and direct search navigation.",
    sources: [
      ["WorldPop", "Population surfaces used to build regional estimates", "https://www.worldpop.org/"],
      ["Eurostat", "European regional population statistics", "https://ec.europa.eu/eurostat/"],
      ["Natural Earth", "Global million-plus populated places", "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-populated-places/"],
      ["GeoNames", "German populated places above 100,000 residents", "https://www.geonames.org/"],
    ],
  },
  {
    title: "Infrastructure facilities",
    description: "Facility points show data centres and electrically material water infrastructure. Community mapping provides coverage, while official records provide stronger project evidence.",
    sources: [
      ["OpenStreetMap", "Community-mapped data centres, water facilities, and power infrastructure", "https://www.openstreetmap.org/copyright"],
      ["QLever", "Query service used for OpenStreetMap planet extracts", "https://qlever.dev/"],
      ["Official project publications", "Curated company, utility, government, and planning evidence", "https://github.com/ad1tyagupta/wattlas/tree/main/data/curated"],
    ],
  },
  {
    title: "Electricity and power generation",
    description: "Generation and electricity records support the Power Balance view. Technology, lifecycle, capacity, and source lineage remain attached to each record where available.",
    sources: [
      ["Global Energy Monitor", "Power plant projects and operating assets", "https://globalenergymonitor.org/projects/global-integrated-power/"],
      ["World Resources Institute", "Global power plant reference data", "https://datasets.wri.org/dataset/globalpowerplantdatabase"],
      ["U.S. Energy Information Administration", "United States electricity and generation statistics", "https://www.eia.gov/opendata/"],
      ["Ember", "Country electricity generation and demand statistics", "https://ember-energy.org/data/yearly-electricity-data/"],
      ["ENTSO-E", "Optional European electricity system data when configured", "https://transparency.entsoe.eu/"],
    ],
  },
];

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
      <header className="methodology-header">
        <Link className="methodology-wordmark" href="/">WATTLAS</Link>
        <span>Methodology &amp; Sources</span>
        <Link className="methodology-radar-link" href="/">Open Opportunity Radar</Link>
      </header>

      <article className="methodology-article">
        <section className="methodology-hero">
          <p className="methodology-kicker">PUBLIC DATA · EXPLAINABLE METHODS · GLOBAL COVERAGE</p>
          <h1>How Wattlas works</h1>
          <p className="methodology-lede">Wattlas is a global infrastructure Opportunity Radar. It brings public information about data centres, water infrastructure, electricity generation, demand, population, and geography into one map for regional exploration.</p>
          <p>It is designed to help users ask where infrastructure growth may create electrical demand, delivery opportunity, or system pressure. Wattlas is an analytical research tool, not an operational grid control system or investment recommendation.</p>
        </section>

        <section className="methodology-section" aria-labelledby="process-title">
          <p className="methodology-index">01 · PROCESS</p>
          <h2 id="process-title">From public records to the map</h2>
          <ol className="methodology-steps">
            <li><strong>Collect</strong><span>Connectors retrieve public datasets and curated official evidence.</span></li>
            <li><strong>Normalize</strong><span>Records are mapped into common geography, lifecycle, technology, capacity, and provenance fields.</span></li>
            <li><strong>Validate</strong><span>Schema, coordinate, coverage, reconciliation, and source checks run before publication.</span></li>
            <li><strong>Model</strong><span>Transparent inputs produce regional demand, attractiveness, system risk, and power balance views.</span></li>
            <li><strong>Publish</strong><span>An immutable snapshot is served until a newer validated snapshot succeeds.</span></li>
          </ol>
        </section>

        <section className="methodology-section" aria-labelledby="evidence-title">
          <p className="methodology-index">02 · EVIDENCE</p>
          <h2 id="evidence-title">What the value labels mean</h2>
          <div className="evidence-grid">
            <div><strong>Observed</strong><p>A directly measured or mapped value from a cited source.</p></div>
            <div><strong>Reported</strong><p>A value published by an operator, authority, company, or dataset owner.</p></div>
            <div><strong>Estimated</strong><p>A transparent calculation based on public inputs and documented assumptions.</p></div>
            <div><strong>Inherited</strong><p>A broader geographic value used when reliable local evidence is unavailable.</p></div>
            <div><strong>Unavailable</strong><p>Public evidence is insufficient, so Wattlas does not substitute a zero.</p></div>
          </div>
        </section>

        <section className="methodology-section" aria-labelledby="sources-title">
          <p className="methodology-index">03 · SOURCES</p>
          <h2 id="sources-title">Data sources</h2>
          <p className="section-intro">The source mix changes by geography and layer. Each published snapshot records connector status, observation dates, checksums, evidence links, and known limitations.</p>
          <div className="source-groups">
            {sourceGroups.map((group) => (
              <section className="source-group" key={group.title}>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
                <ul>
                  {group.sources.map(([name, role, href]) => <li key={name}><a href={href} target="_blank" rel="noreferrer"><strong>{name}</strong><span>{role}</span></a></li>)}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="methodology-section methodology-split" aria-labelledby="quality-title">
          <div>
            <p className="methodology-index">04 · QUALITY</p>
            <h2 id="quality-title">Refresh and quality controls</h2>
            <p>Wattlas checks upstream sources on a scheduled cycle and publishes only after validation. If an upstream source fails, the site can retain the last successful capture instead of deleting a useful layer.</p>
            <p>The interface reports snapshot freshness and connector state. A source being reachable does not mean every geography or field is complete.</p>
          </div>
          <div>
            <p className="methodology-index">05 · LIMITS</p>
            <h2>Limitations</h2>
            <ul className="limitations-list">
              <li>Community-mapped facilities vary in completeness and observation date.</li>
              <li>Planned project capacity and delivery dates can change.</li>
              <li>Connection queues do not equal available grid headroom.</li>
              <li>Cooling technology is not presented as observed without facility-level evidence.</li>
              <li>Regional scores are analytical indicators, not measured grid operating conditions.</li>
              <li>Population and city definitions differ across source systems.</li>
            </ul>
          </div>
        </section>

        <footer className="methodology-footer">
          <p>Explore the evidence in context.</p>
          <Link href="/">Open Opportunity Radar</Link>
          <a href="https://github.com/ad1tyagupta/wattlas" target="_blank" rel="noreferrer">View the open source project</a>
        </footer>
      </article>
    </main>
  );
}
