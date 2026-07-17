"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { SourceCatalogTable } from "@/components/methodology/source-catalog-table";
import { filterSources } from "@/lib/methodology";
import type { SourceCatalog } from "@/lib/snapshot/types";
import styles from "@/app/methodology/methodology.module.css";

export function MethodologyPage({ catalog, generatedAt }: { catalog: SourceCatalog; generatedAt: string | null }) {
  const [continent, setContinent] = useState("");
  const [country, setCountry] = useState("");
  const [category, setCategory] = useState("");
  const [publicationState, setPublicationState] = useState("");
  const sources = catalog.sources;
  const filtered = useMemo(() => filterSources(sources, { continent, country, category, publicationState }), [sources, continent, country, category, publicationState]);
  const continents = [...new Set(sources.flatMap((source) => source.continents))].sort();
  const countries = [...new Set(sources.flatMap((source) => source.countries))].sort();
  const categories = [...new Set(sources.flatMap((source) => source.categories))].sort();

  return (
    <main className={styles.page}>
      <nav><Link href="/">← Return to Wattlas</Link><span>Methodology and sources</span></nav>
      <header className={styles.hero}>
        <p>PUBLIC DATA · EXPLAINABLE METHODS · 2026–2031</p>
        <h1>How Wattlas builds the Opportunity Radar</h1>
        <span>Infrastructure Demand is the primary score. Site Attractiveness, System Risk, and Power Balance are supporting lenses.</span>
        {generatedAt ? <small>Source status from snapshot {new Date(generatedAt).toLocaleString()}</small> : null}
      </header>

      <section className={styles.methodGrid}>
        <article><b>01</b><h2>Demand</h2><p>Demand is measured in GWh. Capacity is measured in MW; the two are never compared without an explicit time or capacity-factor conversion.</p></article>
        <article><b>02</b><h2>Source hierarchy</h2><p>Official observed measurements outrank official forecasts, institutional research, structured community sources, and OpenStreetMap fallback.</p></article>
        <article><b>03</b><h2>Regional allocation</h2><p>Wattlas uses observed ADM1 data first, then official forecasts, electrified building or settlement models, electrification-adjusted national allocation, and population fallback.</p></article>
        <article><b>04</b><h2>Supply forecast</h2><p>Only operational generators count today. Supported commissioning dates add future supply, while retirements reduce future supply. Cancelled facilities contribute nothing.</p></article>
        <article><b>05</b><h2>Power balance</h2><p>Local generation gaps are not labelled definitive shortages when imports, exports, or grid interchange are unavailable.</p></article>
        <article><b>06</b><h2>Publication safety</h2><p>Every claim keeps lineage. Unclear reuse rights stay quarantined and cannot affect the map, search, scores, or public facility totals.</p></article>
      </section>

      <section className={styles.catalog}>
        <div className={styles.catalogHeader}>
          <div><p>SOURCE REGISTER</p><h2>{sources.length} governed sources</h2></div>
          <span>{filtered.length} shown</span>
        </div>
        <div className={styles.filters}>
          <label>Continent<select aria-label="Continent" value={continent} onChange={(event) => setContinent(event.target.value)}><option value="">All</option>{continents.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Country<select aria-label="Country" value={country} onChange={(event) => setCountry(event.target.value)}><option value="">All</option>{countries.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Category<select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)}><option value="">All</option>{categories.map((value) => <option key={value}>{value}</option>)}</select></label>
          <label>Publication state<select aria-label="Publication state" value={publicationState} onChange={(event) => setPublicationState(event.target.value)}><option value="">All</option><option value="publishable">Publishable</option><option value="quarantined">Quarantined</option><option value="rejected">Rejected</option><option value="superseded">Superseded</option></select></label>
        </div>
        <SourceCatalogTable sources={filtered} />
      </section>
    </main>
  );
}

