import type { GeneratorOverviewCollection, GeographyCollection, GeographyFeature, RegionalEnergyData } from "@/lib/snapshot/types";

type Props = {
  country: GeographyFeature;
  regions: GeographyCollection["features"];
  regionalEnergy: RegionalEnergyData;
  generatorOverview?: GeneratorOverviewCollection | null;
  year: number;
  onClose: () => void;
};

const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);

export function CountryIntelligence({ country, regions, regionalEnergy, generatorOverview, year, onClose }: Props) {
  const regionIds = new Set(regions.filter((region) => region.properties.country === country.properties.id).map((region) => region.properties.id));
  const yearly = Array.from({ length: 6 }, (_, index) => 2026 + index).map((forecastYear) => {
    const rows = [...regionIds].flatMap((id) => regionalEnergy[id]?.filter((row) => row.year === forecastYear && row.metrics !== null) ?? []);
    const demand = rows.reduce((sum, row) => sum + (row.metrics?.demandGwh.central ?? 0), 0);
    const generation = rows.reduce((sum, row) => sum + (row.metrics?.localGenerationGwh?.central ?? 0), 0);
    return { year: forecastYear, demand: rows.length ? demand : null, generation: rows.length ? generation : null, sourceIds: rows.flatMap((row) => row.sourceIds) };
  });
  const active = yearly.find((row) => row.year === year)!;
  const plants = generatorOverview?.features.filter((feature) => feature.properties.country === country.properties.id) ?? [];
  const plannedMw = plants.reduce((sum, feature) => sum + feature.properties.plannedCapacityMw, 0);
  const technologyMix = plants.reduce<Record<string, number>>((mix, feature) => {
    for (const [technology, capacity] of Object.entries(feature.properties.technologyMixMw)) mix[technology] = (mix[technology] ?? 0) + (capacity ?? 0);
    return mix;
  }, {});
  const mixTotal = Object.values(technologyMix).reduce((sum, value) => sum + value, 0);
  const retired = plants.reduce((sum, feature) => sum + (feature.properties.lifecycleCounts?.retired ?? 0) + (feature.properties.lifecycleCounts?.decommissioned ?? 0), 0);
  const sourceIds = [...new Set([...country.properties.sourceIds, ...yearly.flatMap((row) => row.sourceIds)])].sort();
  const gap = active.demand != null && active.generation != null ? active.demand - active.generation : null;

  return (
    <aside className="region-inspector country-intelligence" id="wattlas-dossier">
      <div className="country-intelligence-header"><div><small>Country Intelligence · {year}</small><h1>{country.properties.name} intelligence</h1><p>Published national and state evidence, reconciled where coverage permits.</p></div><button type="button" onClick={onClose}>Back to region</button></div>
      <div className="country-kpis">
        <span>Electricity demand<strong>{active.demand == null ? "Unavailable" : `${number(active.demand)} GWh`}</strong></span>
        <span>Local generation<strong>{active.generation == null ? "Unavailable" : `${number(active.generation)} GWh`}</strong></span>
        <span>Demand–generation gap<strong>{gap == null ? "Unavailable" : `${gap >= 0 ? "+" : ""}${number(gap)} GWh`}</strong></span>
        <span>Planned generation<strong>{number(plannedMw)} MW</strong></span>
      </div>
      <section className="country-outlook"><div className="section-heading"><h2>2026–2031 outlook</h2><small>GWh per year</small></div>{yearly.map((row) => <div className="country-year-row" key={row.year}><strong>{row.year}</strong><span>Demand {row.demand == null ? "—" : number(row.demand)}</span><span>Generation {row.generation == null ? "—" : number(row.generation)}</span><i style={{ width: `${Math.min(100, Math.max(4, ((row.demand ?? 0) / Math.max(...yearly.map((item) => item.demand ?? 0), 1)) * 100))}%` }} /></div>)}</section>
      <section className="country-pipeline"><h2>Infrastructure pipeline</h2><div><span>{country.properties.assetSummary.industrialLoads} industrial demand projects</span><span>{country.properties.assetSummary.hydrogenInfrastructure} hydrogen network projects</span><span>{country.properties.assetSummary.dataCentres} data centres</span><span>{country.properties.assetSummary.waterInfrastructure} water assets</span><span>{retired} retired generators</span></div></section>
      <section className="country-mix"><h2>Generation technology mix</h2><div>{Object.entries(technologyMix).sort((a, b) => b[1] - a[1]).map(([technology, capacity]) => <span key={technology}>{technology.replace(/^./, (letter) => letter.toUpperCase())} {mixTotal ? Math.round(capacity / mixTotal * 100) : 0}%</span>)}</div></section>
      <section className="country-lineage"><h2>Confidence and lineage</h2><p>{country.properties.confidence}% confidence · {country.properties.coverage}% coverage</p><p>Source IDs: {sourceIds.length ? sourceIds.join(", ") : "unavailable"}</p></section>
    </aside>
  );
}
