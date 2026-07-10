"use client";

import { useState, type ReactNode } from "react";

import { formatPopulation } from "@/lib/format";
import { PowerBalanceChart } from "@/components/inspector/power-balance-chart";
import { ScoreSparkline } from "@/components/inspector/score-sparkline";
import { availableFacts, driverBarGeometry, fact, inspectorTabLabel, inspectorTabs, peakMaxPoints, unavailableCount, type FacilityFact, type InspectorTabKey } from "@/lib/inspector/inspector-view";
import { geographyEntityType, trackWattlasAction } from "@/lib/analytics";
import type { AssetFeature, EvidenceData, GeneratorFeature, GeneratorOverviewCollection, GeographyFeature, LensKey, RegionalEnergyForecast, RegionalEnergyRow, RegionFeature } from "@/lib/snapshot/types";

const lensLabels: Record<LensKey, string> = {
  infrastructureDemand: "Infrastructure Demand",
  siteAttractiveness: "Site Attractiveness",
  systemRisk: "System Risk",
  powerBalance: "Power Balance",
};

type Props = {
  geography: GeographyFeature | RegionFeature | null;
  asset: AssetFeature | null;
  generator?: GeneratorFeature | null;
  regionalEnergy?: RegionalEnergyRow[];
  generatorOverview?: GeneratorOverviewCollection | null;
  evidence?: EvidenceData;
  regionalEnergyState?: "idle" | "loading" | "ready" | "error" | "unavailable";
  regionalEnergyError?: string | null;
  onRetryRegionalEnergy?: () => void;
  lens: LensKey;
  year: number;
  onOpenEvidence: () => void;
  onAddComparison: () => void;
};

function humanize(value: string): string {
  return value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
}

function formatObserved(value?: string | null): string {
  if (!value) return "Observation date unavailable";
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(value));
}

function formatAddress(address: AssetFeature["properties"]["address"]): string {
  if (!address) return "Full address unavailable";
  const street = [address.houseNumber, address.street].filter(Boolean).join(" ");
  return [street, address.city, address.state, address.postcode, address.country].filter(Boolean).join(", ") || "Full address unavailable";
}

function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? value : null;
  } catch { return null; }
}

const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const metric = (value: { central: number } | null, unit: string) => value ? `${number(value.central)} ${unit}` : "Unavailable";
const signedMetric = (value: number | null | undefined, unit: string, suffix = "") => typeof value === "number" ? `${value >= 0 ? "+" : ""}${number(value)} ${unit}${suffix}` : "Unavailable";

function GoogleSearchLink({ name, entityType, country }: { name: string; entityType: string; country: string }) {
  return <a className="google-search-action" href={`https://www.google.com/search?q=${encodeURIComponent(name)}`} target="_blank" rel="noreferrer" aria-label={`Search Google for ${name}`} onClick={() => trackWattlasAction("google_search_opened", { entity_name: name, entity_type: entityType, country })}>Search <span aria-hidden="true">↗</span></a>;
}

/** Renders only the populated facts and rolls the empty ones into a single muted line. */
function FactGroup({ title, facts, children }: { title: string; facts: FacilityFact[]; children?: ReactNode }) {
  const shown = availableFacts(facts);
  const hidden = unavailableCount(facts);
  return (
    <section className="facility-detail-group">
      <h2>{title}</h2>
      {shown.length > 0 && <div className="facility-facts">{shown.map((item) => <span key={item.label}>{item.label}<strong>{item.value}</strong></span>)}</div>}
      {hidden > 0 && <p className="facts-omitted">{hidden} field{hidden === 1 ? "" : "s"} unavailable</p>}
      {children}
    </section>
  );
}

function retiredGeneratorLabel(overview?: GeneratorOverviewCollection["features"][number]["properties"]): string {
  const retired = (overview?.lifecycleCounts?.retired ?? 0) + (overview?.lifecycleCounts?.decommissioned ?? 0);
  if (!retired) return "Unavailable";
  return `${retired} retired or decommissioned ${retired === 1 ? "record" : "records"}`;
}

function DemandSupplyForecast({ geography, regionalEnergy, generatorOverview, year }: { geography: GeographyFeature | RegionFeature; regionalEnergy: RegionalEnergyRow[]; generatorOverview?: GeneratorOverviewCollection | null; year: number }) {
  const properties = geography.properties;
  const activeEnergy = regionalEnergy.find((row) => row.year === year);
  const metrics = activeEnergy && activeEnergy.metrics !== null ? activeEnergy.metrics : null;
  const overview = generatorOverview?.features.find((feature) => feature.properties.geographyId === properties.id)?.properties;
  const demand = "demandMwByYear" in properties ? properties.demandMwByYear[String(year)] : undefined;
  const hasAnyForecastInput = metrics || overview || demand?.combined || demand?.data_centre || demand?.water_infrastructure;
  if (!hasAnyForecastInput) return null;

  return (
    <section className="forecast-breakdown" aria-label="Demand and supply forecast">
      <div className="section-heading">
        <h2>Demand and supply forecast</h2>
        <small>baseline → new demand → supply → pressure</small>
      </div>
      <div className="forecast-year">
        <span>Forecast horizon</span>
        <strong>{year}</strong>
      </div>
      <div className="forecast-grid">
        <div className="forecast-row baseline"><span>Current baseline demand</span><strong>{metric(metrics?.demandGwh ?? null, "GWh")}</strong><small>{activeEnergy?.valueKind ? `${humanize(activeEnergy.valueKind)} regional electricity demand` : "Regional demand unavailable"}</small></div>
        <div className="forecast-row baseline"><span>Current dependable supply</span><strong>{metric(metrics?.dependableCapacityMw ?? null, "MW")}</strong><small>{metrics?.installedCapacityMw != null ? `${number(metrics.installedCapacityMw)} MW installed capacity` : "Installed capacity unavailable"}</small></div>
        <div className="forecast-row demand"><span>New data-centre demand</span><strong>{signedMetric(demand?.data_centre?.central, "MW")}</strong><small>Mapped and modelled forward load by selected year</small></div>
        <div className="forecast-row demand"><span>New water infrastructure demand</span><strong>{signedMetric(demand?.water_infrastructure?.central, "MW")}</strong><small>Desalination, reuse, pumping, and water assets where public evidence exists</small></div>
        <div className="forecast-row supply"><span>Planned generation capacity</span><strong>{signedMetric(overview?.plannedCapacityMw, "MW", overview?.plannedCapacityMw != null ? " nameplate" : "")}</strong><small>Nameplate capacity is not treated as full dependable supply</small></div>
        <div className="forecast-row retirement"><span>Retiring generation</span><strong>{retiredGeneratorLabel(overview)}</strong><small>Retirements increase pressure when public records tie them to the region</small></div>
        <div className="forecast-row pressure"><span>Forecast pressure</span><strong>{signedMetric(metrics?.localGenerationGapGwh?.central, "GWh", metrics?.localGenerationGapGwh ? " local generation gap" : "")}</strong><small>Positive values indicate demand pressure if dependable supply and grid capacity do not keep pace</small></div>
      </div>
      <p className="method-note">Forecast pressure is not a guaranteed shortage. Wattlas compares baseline demand, mapped new infrastructure load, planned supply, and retirements using public evidence; unavailable values are not treated as zero.</p>
    </section>
  );
}

function PowerBalancePanel({ geography, regionalEnergy, generatorOverview, evidence, regionalEnergyState, regionalEnergyError, onRetryRegionalEnergy, year }: { geography: GeographyFeature | RegionFeature; regionalEnergy: RegionalEnergyRow[]; generatorOverview?: GeneratorOverviewCollection | null; evidence?: EvidenceData; regionalEnergyState: "idle" | "loading" | "ready" | "error" | "unavailable"; regionalEnergyError?: string | null; onRetryRegionalEnergy?: () => void; year: number }) {
  const properties = geography.properties;
  const activeEnergy = regionalEnergy.find((row) => row.year === year);
  const rankableEnergy = regionalEnergy.filter((row): row is RegionalEnergyForecast => row.metrics !== null);
  const overview = generatorOverview?.features.find((feature) => feature.properties.geographyId === properties.id)?.properties;
  const demand = "demandMwByYear" in properties ? properties.demandMwByYear[String(year)] : undefined;
  const energySources = evidence?.sources.filter((source) => activeEnergy?.sourceIds.includes(source.id)) ?? [];
  const mixTotal = overview ? Object.values(overview.technologyMixMw).reduce((sum, value) => sum + (value ?? 0), 0) : 0;

  return (
    <section className="power-balance-panel" aria-label="Regional power balance">
      <div className="population-context"><strong>{properties.population == null ? "Population unavailable" : `${number(properties.population / 1_000_000)} million residents`}</strong><span>Source year {properties.populationSourceYear ?? "unavailable"} · Forecast growth unavailable · {humanize(properties.populationValueKind ?? properties.valueKind)}</span></div>
      {regionalEnergyState === "loading" ? <p className="empty-evidence" role="status">Loading regional energy data…</p>
      : regionalEnergyState === "error" ? <div className="energy-load-error" role="alert"><p>Could not load regional energy data. {regionalEnergyError || "Please try again."}</p>{onRetryRegionalEnergy && <button type="button" className="secondary-action" onClick={onRetryRegionalEnergy}>Retry regional energy</button>}</div>
      : activeEnergy?.metrics === null ? <div className="empty-evidence" role="status"><p><strong>Country-level data only.</strong> ADM1 demand is unavailable because at least one active region lacks defensible population coverage, so Wattlas does not fabricate regional shares.</p><p>{activeEnergy.countryControl ? `Published national demand control: ${metric(activeEnergy.countryControl.demandGwh, "GWh")}.` : "A national demand control is not currently available."}</p></div>
      : activeEnergy ? <>
        <div className="energy-facts">
          <span>Current demand<strong>{metric(activeEnergy.metrics.demandGwh, "GWh")}</strong></span><span>Peak demand<strong>{metric(activeEnergy.metrics.peakDemandMw, "MW")}</strong></span>
          <span>Local generation<strong>{metric(activeEnergy.metrics.localGenerationGwh, "GWh")}</strong></span><span>Dependable capacity<strong>{metric(activeEnergy.metrics.dependableCapacityMw, "MW")}</strong></span>
          <span>Local generation gap<strong>{metric(activeEnergy.metrics.localGenerationGapGwh, "GWh")}</strong></span>
          {activeEnergy.metrics.netBalanceGwh && <span>Net balance<strong>{metric(activeEnergy.metrics.netBalanceGwh, "GWh")}</strong></span>}
          {activeEnergy.metrics.observedUnmetDemandGwh != null && <span>Observed unmet demand<strong>{number(activeEnergy.metrics.observedUnmetDemandGwh)} GWh reported</strong></span>}
        </div>
        <div className="forward-demand"><span>Data-centre forward demand<strong>{demand?.data_centre ? `${number(demand.data_centre.low)}–${number(demand.data_centre.high)} MW` : "Unavailable"}</strong></span><span>Water forward demand<strong>{demand?.water_infrastructure ? `${number(demand.water_infrastructure.low)}–${number(demand.water_infrastructure.high)} MW` : "Unavailable"}</strong></span></div>
        {overview && <div className="generation-context"><h2>Generation mix and plant lifecycle</h2><div>{Object.entries(overview.technologyMixMw).map(([technology, capacity]) => <span key={technology}>{humanize(technology)} {mixTotal ? Math.round((capacity ?? 0) / mixTotal * 100) : 0}%</span>)}</div><div>{Object.entries(overview.lifecycleCounts ?? {}).map(([status, count]) => <span key={status}>{count} {humanize(status).toLowerCase()}</span>)}</div></div>}
        <PowerBalanceChart forecasts={rankableEnergy} />
        <section className="power-contributions"><div className="section-heading"><span>Power Balance contributions</span><small>{activeEnergy.powerBalance?.coverage ?? activeEnergy.coverage}% coverage</small></div>
          <p className="contribution-summary">{activeEnergy.powerBalance?.status === "rankable" ? "Rankable" : "Not yet rankable"} at {activeEnergy.powerBalance?.coverage ?? activeEnergy.coverage}% coverage · {(activeEnergy.powerBalance?.contributions ?? []).reduce((sum, item) => sum + (item.points ?? 0), 0)} of {(activeEnergy.powerBalance?.contributions ?? []).reduce((sum, item) => sum + (item.points == null ? 0 : item.maxPoints), 0)} available points</p>
          {activeEnergy.powerBalance?.contributions.map((item) => <div className="power-contribution" key={item.id}><div><span>{item.label}</span><small>{item.rawValue == null ? "Raw value unavailable" : `${number(item.rawValue)}${item.unit ? ` ${item.unit}` : ""}`}</small><small>{item.normalization}</small><small>{humanize(item.valueKind)} · {item.methodVersion}</small><small>Sources: {item.sourceIds.length ? item.sourceIds.join(", ") : "unavailable"}</small></div><strong>{item.points == null ? `Unavailable/${item.maxPoints} points` : `${item.points}/${item.maxPoints} points`}</strong></div>)}</section>
        <p className="method-note">Method: {activeEnergy.methodId}. Values marked estimated are modelled ranges, not reported measurements.</p>
        <div className="facility-source-links">{energySources.map((source) => <a key={source.id} href={source.url} target="_blank" rel="noreferrer">{source.name}</a>)}</div>
      </> : <p className="empty-evidence" role="status">Regional energy estimates are unavailable for this year.</p>}
    </section>
  );
}

type RegionInspectorProps = {
  geography: GeographyFeature | RegionFeature;
  regionalEnergy: RegionalEnergyRow[];
  generatorOverview?: GeneratorOverviewCollection | null;
  evidence?: EvidenceData;
  regionalEnergyState: "idle" | "loading" | "ready" | "error" | "unavailable";
  regionalEnergyError?: string | null;
  onRetryRegionalEnergy?: () => void;
  lens: LensKey;
  year: number;
  onOpenEvidence: () => void;
  onAddComparison: () => void;
};

function RegionInspector({ geography, regionalEnergy, generatorOverview, evidence, regionalEnergyState, regionalEnergyError, onRetryRegionalEnergy, lens, year, onOpenEvidence, onAddComparison }: RegionInspectorProps) {
  const properties = geography.properties;
  const scores = properties.scoresByYear[String(year)] ?? properties.scores;
  const score = scores[lens];
  const contributions = properties.contributionsByYear[String(year)] ?? [];
  const summary = "assetSummary" in properties ? properties.assetSummary : null;
  const activeEnergy = regionalEnergy.find((row) => row.year === year);
  const metrics = activeEnergy && activeEnergy.metrics !== null ? activeEnergy.metrics : null;
  const overview = generatorOverview?.features.find((feature) => feature.properties.geographyId === properties.id)?.properties;
  const demand = "demandMwByYear" in properties ? properties.demandMwByYear[String(year)] : undefined;

  const hasFacilities = !!(summary && summary.total > 0);
  const hasDrivers = lens !== "powerBalance" && contributions.length > 0;
  const hasForecast = !!(metrics || overview || demand?.combined || demand?.data_centre || demand?.water_infrastructure);
  const hasEnergy = lens === "powerBalance" || hasForecast;

  const tabs = inspectorTabs({ hasDrivers, hasEnergy, hasFacilities });
  const [requestedTab, setRequestedTab] = useState<InspectorTabKey>("overview");
  const tab = tabs.includes(requestedTab) ? requestedTab : "overview";
  const peak = peakMaxPoints(contributions);

  return (
    <aside className="region-inspector">
      <div className="inspector-kicker">Selected region · {properties.country}</div>
      <div className="inspector-title-row"><h1>{properties.name}</h1><GoogleSearchLink name={properties.name} entityType={geographyEntityType(properties)} country={properties.country} /></div>
      <p className="region-meta">{properties.id} · {formatPopulation(properties.population)}</p>

      <div className="headline-score">
        <div><span>{score ?? "—"}</span><small>/ 100</small></div>
        <p>{score == null ? "Not yet rankable" : lensLabels[lens]}<small>{year} model view</small></p>
      </div>

      <div className="confidence-strip">
        <span>Confidence <strong>{properties.confidence}%</strong></span>
        <span>Coverage <strong>{properties.coverage}%</strong></span>
        <span className={`value-kind ${properties.valueKind}`}>{properties.valueKind}</span>
      </div>

      <ScoreSparkline scoresByYear={properties.scoresByYear} lens={lens} activeYear={year} label={lensLabels[lens]} />

      <div className="inspector-tabs" role="tablist" aria-label="Region detail sections">
        {tabs.map((key) => (
          <button key={key} type="button" role="tab" id={`inspector-tab-${key}`} aria-selected={tab === key} aria-controls={`inspector-panel-${key}`} className={tab === key ? "inspector-tab active" : "inspector-tab"} onClick={() => setRequestedTab(key)}>{inspectorTabLabel(key)}</button>
        ))}
      </div>

      <div className="inspector-panel" role="tabpanel" id={`inspector-panel-${tab}`} aria-labelledby={`inspector-tab-${tab}`}>
        {tab === "overview" && <>
          <section className="needs-section">
            <div className="section-heading"><span>Potential infrastructure needs</span></div>
            {score == null ? <p className="empty-evidence">Needs are withheld until the region is rankable.</p> : (
              <div className="need-list"><span>Grid reinforcement</span><span>Substations</span><span>Transformers</span><span>Flexible capacity</span><span>Storage</span></div>
            )}
          </section>
          {hasFacilities && summary && <p className="overview-facilities-teaser">{summary.total} facilities mapped · {summary.operational} operational · {summary.planned} planned<button type="button" onClick={() => setRequestedTab("facilities")}>View coverage</button></p>}
          {!hasDrivers && lens !== "powerBalance" && <p className="empty-evidence">Public evidence does not yet support a defensible score for this region.</p>}
        </>}

        {tab === "drivers" && <section className="driver-section">
          <div className="section-heading"><span>Score drivers</span><small>visible arithmetic · bar length is the driver&apos;s weight</small></div>
          {contributions.map((item) => {
            const geometry = driverBarGeometry(item.points ?? null, item.maxPoints, peak);
            return (
              <button className="driver-row" key={item.id} type="button" onClick={onOpenEvidence}>
                <span>{item.label}<small>{item.rawValue} {item.unit}</small></span>
                <span className="driver-bar"><span className="driver-track" style={{ width: `${geometry.track}%` }}><i className="driver-fill" style={{ width: `${geometry.track > 0 ? (geometry.fill / geometry.track) * 100 : 0}%` }} /></span></span>
                <strong>{item.points ?? "—"}<small>/{item.maxPoints}</small></strong>
              </button>
            );
          })}
        </section>}

        {tab === "energy" && <>
          {lens === "powerBalance" && <PowerBalancePanel geography={geography} regionalEnergy={regionalEnergy} generatorOverview={generatorOverview} evidence={evidence} regionalEnergyState={regionalEnergyState} regionalEnergyError={regionalEnergyError} onRetryRegionalEnergy={onRetryRegionalEnergy} year={year} />}
          <DemandSupplyForecast geography={geography} regionalEnergy={regionalEnergy} generatorOverview={generatorOverview} year={year} />
        </>}

        {tab === "facilities" && summary && (
          <section className="facility-summary" aria-label="Facility coverage">
            <strong>{summary.total} facilities</strong>
            <div>
              <span>{summary.operational} operational</span><span>{summary.planned} planned</span>
              <span>{summary.dataCentres} data centres</span><span>{summary.waterInfrastructure} water assets</span>
              <span>{summary.officialVerified} officially verified</span><span>{summary.communityMapped} community mapped</span>
            </div>
          </section>
        )}
      </div>

      <div className="inspector-actions">
        <button type="button" className="primary-action" onClick={onOpenEvidence}>Open evidence dossier</button>
        <button type="button" className="secondary-action" onClick={onAddComparison}>Add to comparison</button>
      </div>
    </aside>
  );
}

export function EntityInspector({ geography, asset, generator, regionalEnergy = [], generatorOverview, evidence, regionalEnergyState = "ready", regionalEnergyError, onRetryRegionalEnergy, lens, year, onOpenEvidence, onAddComparison }: Props) {
  if (generator) {
    const properties = generator.properties;
    const name = typeof properties.name === "string" ? properties.name : properties.id;
    const sourceUrl = safeHttpUrl(properties.sourceUrl);
    return <aside className="region-inspector facility-inspector generator-inspector">
      <div className="inspector-kicker">Selected power generator · {properties.country}</div>
      <div className="inspector-title-row"><h1>{name}</h1><GoogleSearchLink name={name} entityType="generator" country={properties.country} /></div>
      <p className="region-meta">{properties.technologies.map(humanize).join(" · ")}</p>
      <div className="facility-detail-groups">
        <FactGroup title="Plant" facts={[
          fact("Technology", properties.technologies.length ? properties.technologies.map(humanize).join(", ") : "Unavailable"),
          fact("Primary fuel", properties.primaryFuel || "Primary fuel unavailable"),
          fact("Secondary fuel", properties.secondaryFuel || "Secondary fuel unavailable"),
          fact("Capacity", `${number(properties.capacityMw)} MW`),
          fact("Annual generation", properties.annualGenerationGwh ? `${number(properties.annualGenerationGwh.central)} GWh (${number(properties.annualGenerationGwh.low)}–${number(properties.annualGenerationGwh.high)})` : "Generation unavailable"),
          fact("Status", properties.lifecycle ? humanize(properties.lifecycle) : "Status unavailable"),
        ]} />
        <FactGroup title="Dates and ownership" facts={[
          fact("Commissioned", properties.commissioningYear != null ? String(properties.commissioningYear) : "Commissioning date unavailable"),
          fact("Retirement", properties.retirementYear != null ? String(properties.retirementYear) : "Retirement date unavailable"),
          fact("Operator", typeof properties.operator === "string" ? properties.operator : "Operator unavailable"),
          fact("Owner", typeof properties.owner === "string" ? properties.owner : "Owner unavailable"),
        ]} />
        <FactGroup title="Location and evidence" facts={[
          fact("Region", properties.geographyId),
          fact("Coordinates", `${generator.geometry.coordinates[1].toFixed(5)}, ${generator.geometry.coordinates[0].toFixed(5)}`),
          fact("Confidence", typeof properties.confidence === "number" ? `${properties.confidence}%` : "Confidence unavailable"),
          fact("Source IDs", properties.sourceIds.length ? properties.sourceIds.join(", ") : "Source IDs unavailable"),
        ]} />
      </div>
      <div className="inspector-actions single-action">{sourceUrl ? <a className="primary-action" href={sourceUrl} target="_blank" rel="noreferrer">Open source record</a> : <button className="secondary-action" type="button" disabled>Source record unavailable</button>}</div>
    </aside>;
  }
  if (asset) {
    const properties = asset.properties;
    return (
      <aside className="region-inspector facility-inspector">
        <div className="inspector-kicker">Selected facility · {properties.country}</div>
        <div className="inspector-title-row"><h1>{properties.name}</h1><GoogleSearchLink name={properties.name} entityType={properties.category} country={properties.country} /></div>
        <p className="region-meta">{properties.operator || "Operator unavailable"}</p>
        <div className="facility-detail-groups">
          <FactGroup title="Identity" facts={[
            fact("Operator", properties.operator || "Unavailable"),
            fact("Owner", properties.owner || "Unavailable"),
            fact("Facility reference", properties.facilityRef || "Unavailable"),
            fact("Category", properties.category === "data_centre" ? "Data centre" : "Water infrastructure"),
          ]} />
          <FactGroup title="Location" facts={[
            fact("Address", formatAddress(properties.address)),
            fact("Precision", humanize(properties.locationPrecision)),
            fact("Coordinates", `${asset.geometry.coordinates[1].toFixed(5)}, ${asset.geometry.coordinates[0].toFixed(5)}`),
            fact("Region", properties.geographyId),
          ]} />
          <FactGroup title="Operations" facts={[
            fact("Lifecycle", humanize(properties.lifecycle)),
            fact("Start date", properties.startDate || "Unavailable"),
            fact("Opening date", properties.openingDate || "Unavailable"),
            fact("Last observed", formatObserved(properties.lastObservedAt)),
          ]} />
          <FactGroup title="Energy" facts={[
            fact("Reported power", properties.reportedPower || "Not publicly available"),
            fact("Demand MW", properties.demandMw ? `${properties.demandMw.low}–${properties.demandMw.high} MW` : "Not publicly available"),
          ]} />
          <FactGroup title="Sources" facts={[
            fact("Source type", properties.sourceType === "official_verified" ? "Officially verified" : "Community mapped"),
            fact("Public IDs", Object.entries(properties.externalIds).map(([key, value]) => `${key.toUpperCase()} ${value}`).join(" · ") || "Unavailable"),
          ]}>
            <div className="facility-source-links">
              {properties.sourceUrl && <a href={properties.sourceUrl} target="_blank" rel="noreferrer">Source record</a>}
              {properties.website && <a href={properties.website} target="_blank" rel="noreferrer">Facility website</a>}
              {properties.externalIds.wikidata && <a href={`https://www.wikidata.org/wiki/${properties.externalIds.wikidata}`} target="_blank" rel="noreferrer">Wikidata</a>}
            </div>
          </FactGroup>
        </div>
        <p className="facility-note">
          {properties.sourceType === "community_mapped"
            ? "Community-mapped location data provides infrastructure context and does not create future demand by itself."
            : "This project is tied to a curated public announcement or official record."}
        </p>
        <div className="inspector-actions single-action">
          {properties.sourceUrl
            ? <a className="primary-action" href={properties.sourceUrl} target="_blank" rel="noreferrer">Open source record</a>
            : <span className="empty-evidence">Source URL unavailable</span>}
        </div>
      </aside>
    );
  }

  if (!geography) {
    return <aside className="region-inspector empty"><p>Select a country, region, or facility to inspect its evidence.</p></aside>;
  }

  return (
    <RegionInspector
      key={geography.properties.id}
      geography={geography}
      regionalEnergy={regionalEnergy}
      generatorOverview={generatorOverview}
      evidence={evidence}
      regionalEnergyState={regionalEnergyState}
      regionalEnergyError={regionalEnergyError}
      onRetryRegionalEnergy={onRetryRegionalEnergy}
      lens={lens}
      year={year}
      onOpenEvidence={onOpenEvidence}
      onAddComparison={onAddComparison}
    />
  );
}
