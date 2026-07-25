"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SourceCatalogTable } from "@/components/methodology/source-catalog-table";
import { buildMethodologySourceLibrary, filterSources, labelToken, type MethodologySourceRole } from "@/lib/methodology";
import type { EvidenceSource, SourceCatalog, SourceCoverage } from "@/lib/snapshot/types";
import styles from "@/app/methodology/methodology.module.css";

type AssetCoverage = {
  industrialLoads?: number;
  hydrogenInfrastructure?: number;
  forecastIndustrialLoads?: number;
};

const INDUSTRIAL_RELEASES = [
  { name: "IEA Hydrogen Production Projects Database · June 2026", checksum: "89c71ee47267c74b8c051a161c6cbf0e2c8bc914f84a14169663cbe89aadbad6" },
  { name: "IEA Hydrogen Infrastructure Projects Database · June 2026", checksum: "6c21717ea441d488e676bc7e4631f002a4a1887cda8fd23cc29003da85880345" },
  { name: "GEM Global Iron and Steel Tracker · June 2026", checksum: "plants a5768b59…338eb · steel units d5355acd…4d425 · iron units a770dddb…73f6a" },
  { name: "GEM Global Cement and Concrete Tracker · July 2025", checksum: "80cbc6bcb5b9297b048868fb079447ebe1aab35519a34cdf23b20e71c214d066" },
] as const;

const SUPPORTING_REFERENCES = [
  { name: "UN Geospatial boundary data", publisher: "United Nations", use: "Country boundaries", url: "https://www.un.org/geospatial/" },
  { name: "GISCO geographic data", publisher: "Eurostat", use: "European regional boundaries", url: "https://ec.europa.eu/eurostat/web/gisco" },
  { name: "Eurostat regional statistics", publisher: "Eurostat", use: "European regional context", url: "https://ec.europa.eu/eurostat/" },
  { name: "geoBoundaries", publisher: "William and Mary geoLab", use: "Global state and province boundaries", url: "https://www.geoboundaries.org/" },
  { name: "Steel Industry Energy Bandwidth Study", publisher: "United States Department of Energy", use: "Electric arc furnace electricity range", url: "https://www.energy.gov/sites/prod/files/2013/11/f4/steel_profile.pdf" },
  { name: "Cement Production Technology Brief", publisher: "IEA ETSAP", use: "Cement electricity range", url: "https://iea-etsap.org/E-TechDS/PDF/I03_cement_June_2010_GS-gct.pdf" },
  { name: "Electricity use per tonne of cement", publisher: "International Energy Agency", use: "Regional cement intensity check", url: "https://www.iea.org/data-and-statistics/charts/electricity-use-per-tonne-of-cement-in-selected-countries-and-regions-2018" },
  { name: "CCUS in the transition to net zero", publisher: "International Energy Agency", use: "Electrolyser operating hours", url: "https://www.iea.org/reports/ccus-in-clean-energy-transitions/ccus-in-the-transition-to-net-zero-emissions" },
  { name: "Electrolyser capacity factor study", publisher: "National Renewable Energy Laboratory", use: "Hydrogen demand range", url: "https://www.nrel.gov/docs/fy25osti/92575.pdf" },
] as const;

const snapshotDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  hourCycle: "h23", timeZone: "UTC", timeZoneName: "short",
});

const SOURCE_ROLES: Array<{ value: MethodologySourceRole; label: string }> = [
  { value: "supply", label: "Supply and generation" },
  { value: "demand", label: "Demand and industry" },
  { value: "regional", label: "Country and regional data" },
  { value: "project_evidence", label: "Project evidence" },
  { value: "foundation", label: "Map and model foundations" },
];

export function MethodologyPage({
  catalog,
  evidenceSources = [],
  generatedAt,
  sourceCoverage = null,
  assetCoverage = null,
}: {
  catalog: SourceCatalog;
  evidenceSources?: EvidenceSource[];
  generatedAt: string | null;
  sourceCoverage?: SourceCoverage | null;
  assetCoverage?: AssetCoverage | null;
}) {
  const [continent, setContinent] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [publicationState, setPublicationState] = useState("");
  const [role, setRole] = useState("");
  const sources = useMemo(() => buildMethodologySourceLibrary({
    catalogSources: catalog.sources,
    evidenceSources,
    publishedRecordsBySource: sourceCoverage?.publishedRecordsBySource ?? {},
  }), [catalog.sources, evidenceSources, sourceCoverage?.publishedRecordsBySource]);
  const filtered = useMemo(() => filterSources(sources, { continent, country, category, publicationState, role }), [sources, continent, country, category, publicationState, role]);
  const continents = [...new Set(sources.flatMap((source) => source.continents))].sort();
  const countries = [...new Set(sources.flatMap((source) => source.countries))].sort();
  const categories = [...new Set(sources.flatMap((source) => source.categories))].sort();

  return (
    <main className={`${styles.page} methodology-page`}>
      <nav><Link href="/">← Return to Wattlas</Link><span>Methodology and sources</span></nav>

      <header className={styles.hero}>
        <h1>How Wattlas puts the energy picture together</h1>
        <span>Wattlas brings new infrastructure demand, existing and planned power supply, regional context, and public evidence into one map. This page explains where the information comes from and what the numbers mean.</span>
        {generatedAt ? <small>Source status from snapshot {snapshotDateFormatter.format(new Date(generatedAt))}</small> : null}
      </header>

      <section className={styles.story} aria-labelledby="story-heading">
        <div className={styles.sectionLead}>
          <span>01</span>
          <h2 id="story-heading">Why I built Wattlas</h2>
        </div>
        <div className={styles.storyCopy}>
          <p>I work in market intelligence for a predictive maintenance product at Siemens Energy. Wattlas started with a simple question. Where are new data centres and desalination plants being built around the world?</p>
          <p>Finding an answer was harder than expected. Useful information was spread across company announcements, public records, project trackers, and local datasets. I wanted one place where I could see these projects on a map and open the original source when I needed to check something.</p>
          <p>Once the first map worked, I added the supply side. That meant power plants, their technology, capacity, status, and expected timing. Then I added the demand side so the map could show how new infrastructure may change regional electricity needs.</p>
          <p>The project kept growing through feedback. People contacted me after I shared Wattlas on LinkedIn. I also showed it to teammates and people working in grid planning and market intelligence at Siemens Energy. Their questions helped shape the search, filters, regional views, forecasts, and source page you see today.</p>
        </div>
      </section>

      <section className={styles.methodSection} aria-labelledby="method-heading">
        <div className={styles.sectionLead}>
          <span>02</span>
          <h2 id="method-heading">How Wattlas works</h2>
          <p>The aim is to make the method understandable without hiding the detail.</p>
        </div>
        <div className={styles.methodGrid}>
          <article><b>01</b><h3>Demand and capacity are different</h3><p>Electricity demand is measured in GWh. Plant capacity is measured in MW. Wattlas only compares them after applying time and a clear capacity factor.</p></article>
          <article><b>02</b><h3>Better evidence comes first</h3><p>Observed official data comes before official forecasts, research datasets, community sources, and fallback estimates.</p></article>
          <article><b>03</b><h3>Local data is used when available</h3><p>Wattlas first looks for state or regional electricity data. If it is missing, it uses official forecasts, local models, or population as a clearly labelled fallback.</p></article>
          <article><b>04</b><h3>Future supply follows project timing</h3><p>Operating plants count today. New plants enter when a supported start year is available. Retirements reduce future supply. Cancelled projects add nothing.</p></article>
          <article><b>05</b><h3>A local gap is not always a shortage</h3><p>A region may import electricity from somewhere else. Wattlas does not call a local generation gap a confirmed shortage when grid exchange data is missing.</p></article>
          <article><b>06</b><h3>Every result keeps its source</h3><p>Published records keep their source history. Sources with unclear reuse rights stay outside the public map and do not affect scores.</p></article>
        </div>
      </section>

      <section className={styles.viewGuide} aria-labelledby="view-guide-heading">
        <div className={styles.sectionLead}>
          <span>03</span>
          <h2 id="view-guide-heading">What each Wattlas view is for</h2>
          <p>The map has two workspaces and four ways to read a region. Each one answers a different question.</p>
        </div>
        <div className={styles.workspaceGuide}>
          <article>
            <span>Infrastructure inventory</span>
            <h3>Asset Explorer</h3>
            <strong>What facilities exist or are planned here?</strong>
            <p>Asset Explorer turns on the infrastructure layers together and summarizes facilities by type and project status. Use it when you want to find data centres, water plants, industrial projects, hydrogen infrastructure, or power generators in a place.</p>
          </article>
          <article>
            <span>Regional intelligence</span>
            <h3>Opportunity Radar</h3>
            <strong>Where might the strongest opportunities or constraints be?</strong>
            <p>Opportunity Radar compares regions rather than simply counting facilities. It combines public evidence into explainable scores that help you decide where to look more closely.</p>
          </article>
        </div>
        <div className={styles.viewCards}>
          <article>
            <b>01</b>
            <h3>Infrastructure Demand</h3>
            <p>Shows where electricity demand is likely to grow because of new data centres, industrial projects, water plants, hydrogen projects, and similar infrastructure.</p>
          </article>
          <article>
            <b>02</b>
            <h3>Site Attractiveness</h3>
            <p>Shows how practical a location appears for developing new infrastructure, based on the public evidence and local conditions available to Wattlas.</p>
          </article>
          <article>
            <b>03</b>
            <h3>System Risk</h3>
            <p>Shows where grid constraints, limited resilience, or rapidly increasing electricity demand may create greater risk.</p>
          </article>
          <article>
            <b>04</b>
            <h3>Power Balance</h3>
            <p>Compares electricity demand with dependable local generation. It helps identify areas that may have a power surplus, a comfortable margin, or growing supply pressure.</p>
          </article>
        </div>
      </section>

      <section className={styles.regionalSection} aria-labelledby="regional-heading">
        <div className={styles.sectionLead}>
          <span>04</span>
          <h2 id="regional-heading">Adding more depth to regional data</h2>
          <p>Early versions had stronger detail in Europe, North America, and Asia. Coverage in Africa and South America was more uneven, so I added regional and country sources to close some of those gaps.</p>
        </div>
        <div className={styles.regionalSources}>
          <article><b>Global power projects</b><h3>What was missing</h3><p>A consistent view of operating and planned generation across countries.</p><h3>What was added</h3><p>Global Energy Monitor data for reported power units and projects across 226 countries and areas.</p><h3>How it is used</h3><p>Units are joined into facilities while keeping technology, status, capacity, timing, and source history.</p></article>
          <article><b>Brazil electricity demand</b><h3>What was missing</h3><p>Reliable state level electricity demand in a globally comparable model.</p><h3>What was added</h3><p>Official EPE monthly state consumption across consumer classes and market types.</p><h3>How it is used</h3><p>Complete calendar years set state shares. Those shares are matched to the Ember national total for each forecast year.</p></article>
          <article><b>Europe monthly observations</b><h3>What was missing</h3><p>A recent operating view of demand and generation for European bidding zones.</p><h3>What was added</h3><p>ENTSO E actual load and generation by production type for the previous complete UTC calendar month.</p><h3>How it is used</h3><p>Wattlas converts MW readings into GWh, records peak and average demand, and keeps the original bidding zone identity and coverage.</p></article>
          <article><b>Africa grid context</b><h3>What was missing</h3><p>A broad view of existing and planned electricity lines.</p><h3>What was added</h3><p>The World Bank grid release with 62,001 line features.</p><h3>How it is used</h3><p>Lines provide dated map context. They do not count as available generation, dependable supply, or proof of connection capacity.</p></article>
        </div>
      </section>

      <section className={styles.industrialMethod} aria-labelledby="industrial-heading">
        <header className={styles.sectionLead}>
          <span>05</span>
          <h2 id="industrial-heading">How planned projects become future electricity demand</h2>
          <p>A project only changes the forecast when Wattlas has enough information to connect its size, technology, location, timing, and power source.</p>
        </header>
        <div className={styles.demandSteps} aria-label="Project demand calculation steps">
          <article><b>1</b><h3>Read the reported project information</h3><p>Keep the project name, location, size, technology, status, dates, and original source.</p></article>
          <article><b>2</b><h3>Convert size into electricity use</h3><p>Use a published industry range only when the project technology supports that conversion.</p></article>
          <article><b>3</b><h3>Apply status and timing</h3><p>Operating, construction, planning, and announced projects do not carry the same certainty or start year.</p></article>
          <article><b>4</b><h3>Publish a low, central, and high estimate</h3><p>Show the range with its source, assumptions, confidence, and limits instead of presenting one false exact number.</p></article>
        </div>
        <div className={styles.technicalIntro}><h3>The technical record</h3><p>The details below make every calculation reproducible and open to challenge.</p></div>
        <div className={styles.releaseGrid}>
          {INDUSTRIAL_RELEASES.map((release) => <article key={release.name}><strong>{release.name}</strong><small>SHA 256 · {release.checksum}</small></article>)}
        </div>
        <p className={styles.licenceNote}>All four release families are governed manual snapshots under CC BY 4.0. Release files are retained by checksum so a published result can be reproduced later.</p>
        <div className={styles.formulaGrid}>
          <article><b>Hydrogen production</b><code>capacity in MWel × 8.76 GWh per MW per year × capacity factor × grid share</code><p>Capacity factor and grid share change with project status and power supply evidence. The map shows a range.</p></article>
          <article><b>Iron and steel</b><code>capacity in kt per year × electricity intensity in MWh per tonne</code><p>Only supported electric arc furnace and direct reduced iron evidence enters the forecast. Generic plant records remain context.</p></article>
          <article><b>Cement</b><code>capacity in Mt per year × 1,000 × electricity intensity in MWh per tonne</code><p>A supported start date and reported production capacity are required before a project affects a regional forecast.</p></article>
        </div>
        <div className={styles.methodNotes}>
          <p>Pipelines, storage, blending, and terminals do not create an electricity demand increase by themselves.</p>
          <p>Public lifecycle groups are Operating, Under construction, Pre construction, Announced, and Retired. Cancelled, shelved, mothballed, and unknown records stay available for checks but do not enter public forecasts.</p>
          <p>Projects are assigned to states or regions from their reported coordinates. A project is only applied once and only when the supporting regional demand baseline is available.</p>
          <p>The ENTSO E connector reads its private credential only inside the refresh process. Raw interval data and credentials are not published. Bidding zone boundaries do not always match countries, so direct, combined, overlapping, and evidence only mappings are kept separate. One monthly observation adds evidence but does not alter annual forecasts or Opportunity Radar scores. If a refresh fails, Wattlas keeps the last successful monthly result.</p>
        </div>
      </section>

      {assetCoverage ? (
        <section className={styles.assetCoverage} aria-label="Industrial asset publication status">
          <article><strong>{(assetCoverage.industrialLoads ?? 0).toLocaleString("en-US")}</strong><span>Industrial demand projects published as facilities or context</span></article>
          <article><strong>{(assetCoverage.hydrogenInfrastructure ?? 0).toLocaleString("en-US")}</strong><span>Hydrogen network records kept as context</span></article>
          <article><strong>{(assetCoverage.forecastIndustrialLoads ?? 0).toLocaleString("en-US")}</strong><span>Projects that have enough evidence, timing, and location detail to enter the 2026 to 2031 model</span></article>
        </section>
      ) : null}

      {sourceCoverage ? (
        <section className={styles.publicationSummary} aria-label="Current publication status">
          <article><strong>{sourceCoverage.publishedRecords.toLocaleString("en-US")}</strong><span>Source records currently published on the map</span></article>
          <article><strong>{sourceCoverage.sourcesByPublicationState.publishable ?? 0}</strong><span>Governed sources approved for publication when usable records are available</span></article>
          <article><strong>{sourceCoverage.sourcesByPublicationState.quarantined ?? 0}</strong><span>Sources excluded from the map and scores while reuse rights or access remain unclear</span></article>
          <p>An approved source does not always contribute records to the current snapshot. The live record total is the number that describes what is on the map now.</p>
        </section>
      ) : null}

      <section className={styles.catalog} aria-labelledby="catalog-heading">
        <div className={styles.catalogHeader}>
          <div><h2 id="catalog-heading">{sources.length} source families in one place</h2><p>The earlier 32 source catalogue is only one part of the Wattlas source system. This library combines governed data sources with the project announcements, evidence records, population releases, and modelling references attached to the current snapshot.</p></div>
          <span>{filtered.length} shown</span>
        </div>
        <div className={styles.roleSummary} aria-label="Source library groups">
          {SOURCE_ROLES.map((item) => <article key={item.value}><strong>{sources.filter((source) => source.role === item.value).length}</strong><span>{item.label}</span></article>)}
        </div>
        <div className={styles.filters}>
          <label>Continent<select aria-label="Continent" value={continent} onChange={(event) => setContinent(event.target.value)}><option value="">All</option>{continents.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Country<select aria-label="Country" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All</option>{countries.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Category<select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All</option>{categories.map((value) => <option key={value} value={value}>{labelToken(value)}</option>)}</select></label>
          <label>Source role<select aria-label="Source role" value={role} onChange={(event) => setRole(event.target.value)}><option value="">All</option>{SOURCE_ROLES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <label>Publication state<select aria-label="Publication state" value={publicationState} onChange={(event) => setPublicationState(event.target.value)}><option value="">All</option><option value="publishable">Approved for publication</option><option value="evidence_reference">Evidence reference</option><option value="quarantined">Quarantined</option><option value="rejected">Rejected</option><option value="superseded">Superseded</option></select></label>
        </div>
        <SourceCatalogTable sources={filtered} />
      </section>

      <section className={styles.supportingReferences} aria-labelledby="references-heading">
        <div className={styles.sectionLead}><span>06</span><h2 id="references-heading">Map and method references</h2><p>These sources support boundaries, regional context, and conversion assumptions. They sit outside the {sources.length} project and data source families above.</p></div>
        <div>{SUPPORTING_REFERENCES.map((source) => <article key={source.name}><h3>{source.name}</h3><p>{source.publisher}</p><span>{source.use}</span><a href={source.url} target="_blank" rel="noreferrer">Open source ↗</a></article>)}</div>
      </section>
    </main>
  );
}
