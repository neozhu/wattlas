"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { ComparisonDrawer } from "@/components/comparison/comparison-drawer";
import { CommandBar } from "@/components/controls/command-bar";
import { LayerRail, type InfrastructureVisibility } from "@/components/controls/layer-rail";
import { SearchBox } from "@/components/controls/search-box";
import { Timeline } from "@/components/controls/timeline";
import { EvidenceDossier } from "@/components/inspector/evidence-dossier";
import { EntityInspector } from "@/components/inspector/entity-inspector";
import { InspectorResizer } from "@/components/inspector/inspector-resizer";
import { GlobalMap } from "@/components/map/global-map";
import { ProjectSummaryCard } from "@/components/map/project-summary-card";
import { DataStatusDrawer } from "@/components/status/data-status-drawer";
import { CountryIntelligence } from "@/components/intelligence/country-intelligence";
import { AssetExplorerSummary } from "@/components/intelligence/asset-explorer-summary";
import { geographyEntityType, trackWattlasAction } from "@/lib/analytics";
import { buildSearchIndex, type SearchResult } from "@/lib/search";
import { cityFeatureCollectionSchema, geographyFeatureCollectionSchema } from "@/lib/snapshot/schema";
import { loadGeneratorCountry, loadGeneratorIndex, loadGeneratorOverview, loadRegionalEnergy } from "@/lib/snapshot/generators";
import type { AssetFeature, CityCollection, GenerationTechnology, GeneratorFeature, GeneratorIndex, GeneratorOverviewCollection, GeographyCollection, GeographyFeature, LensKey, RegionalEnergyData, RegionFeature, SnapshotData } from "@/lib/snapshot/types";

type Props = { snapshot: SnapshotData };
const INSPECTOR_WIDTH_KEY = "wattlas:inspector-width";
const DEFAULT_INSPECTOR_WIDTH = 368;
const MIN_INSPECTOR_WIDTH = 300;
const MAX_INSPECTOR_WIDTH = 600;

export function OpportunityRadar({ snapshot }: Props) {
  const [lens, setLens] = useState<LensKey>("infrastructureDemand");
  const [mode, setMode] = useState<"radar" | "explorer">("radar");
  const [year, setYear] = useState(snapshot.manifest.activeYears[0] ?? 2026);
  const initialId = snapshot.countries.features.find((feature) => feature.properties.scores.infrastructureDemand != null)?.properties.id ?? snapshot.countries.features[0]?.properties.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(initialId);
  const [selectedGenerator, setSelectedGenerator] = useState<GeneratorFeature | null>(null);
  const [mapFocusTarget, setMapFocusTarget] = useState<{ nonce: number; coordinates?: [number, number]; bbox?: [number, number, number, number] } | null>(null);
  const [comparisonIds, setComparisonIds] = useState<string[]>([]);
  const [statusOpen, setStatusOpen] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [countryIntelligenceOpen, setCountryIntelligenceOpen] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(true);
  const [inspectorWidth, setInspectorWidth] = useState(DEFAULT_INSPECTOR_WIDTH);
  const inspectorWidthLoaded = useRef(false);
  const [infrastructure, setInfrastructure] = useState<InfrastructureVisibility>({ dataCentres: true, water: true, industrial: true, hydrogen: true, generators: false });
  const [cities, setCities] = useState<CityCollection>({ type: "FeatureCollection", features: [] });
  const [technologies, setTechnologies] = useState<Set<GenerationTechnology>>(() => new Set());
  const [lifecycles, setLifecycles] = useState<Set<string>>(() => new Set(["operational", "under_construction", "pre_construction", "planning_filed", "permitted", "announced", "retired", "decommissioned"]));
  const [generatorOverview, setGeneratorOverview] = useState<GeneratorOverviewCollection | null>(null);
  const [generatorIndex, setGeneratorIndex] = useState<GeneratorIndex | null>(null);
  const [searchGenerators, setSearchGenerators] = useState<GeneratorFeature[]>([]);
  const [regionalEnergyLoad, setRegionalEnergyLoad] = useState<{ path: string | null; state: "loading" | "ready" | "error"; data: RegionalEnergyData; error: string | null }>({ path: null, state: "loading", data: {}, error: null });
  const [regionalEnergyRetry, setRegionalEnergyRetry] = useState(0);
  const regionalEnergyRevision = useRef(0);
  const [admin1, setAdmin1] = useState<GeographyCollection>(snapshot.admin1);
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const cityResponse = snapshot.manifest.artifacts.cities ? await fetch(`/data/${snapshot.manifest.artifacts.cities}`, { signal: controller.signal }) : null;
      if (cityResponse?.ok) setCities(cityFeatureCollectionSchema.parse(await cityResponse.json()));
    };
    void load().catch((error: unknown) => { if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error); });
    return () => controller.abort();
  }, [snapshot.manifest.artifacts.cities]);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = Number(window.localStorage.getItem(INSPECTOR_WIDTH_KEY));
      inspectorWidthLoaded.current = true;
      if (Number.isFinite(saved) && saved >= MIN_INSPECTOR_WIDTH && saved <= MAX_INSPECTOR_WIDTH) setInspectorWidth(saved);
      else window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(DEFAULT_INSPECTOR_WIDTH));
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (inspectorWidthLoaded.current) window.localStorage.setItem(INSPECTOR_WIDTH_KEY, String(inspectorWidth));
  }, [inspectorWidth]);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-width: 680px)");
    const syncMobileRail = () => setFiltersVisible(!media.matches);
    media.addEventListener("change", syncMobileRail);
    const frame = window.requestAnimationFrame(syncMobileRail);
    return () => {
      window.cancelAnimationFrame(frame);
      media.removeEventListener("change", syncMobileRail);
    };
  }, []);
  useEffect(() => {
    if (snapshot.admin1.features.length) return;
    const controller = new AbortController();
    fetch(`/data/${snapshot.manifest.artifacts.admin1}`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`ADM1 snapshot request failed: ${response.status}`);
        return response.json();
      })
      .then((payload) => setAdmin1(geographyFeatureCollectionSchema.parse(payload)))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
      });
    return () => controller.abort();
  }, [snapshot.admin1.features.length, snapshot.manifest.artifacts.admin1]);
  useEffect(() => {
    const overviewPath = snapshot.manifest.artifacts.generatorOverview;
    const indexPath = snapshot.manifest.artifacts.generatorIndex;
    if (!overviewPath || !indexPath) return;
    const controller = new AbortController();
    void Promise.all([loadGeneratorOverview(overviewPath, { signal: controller.signal }), loadGeneratorIndex(indexPath, { signal: controller.signal })]).then(([overview, index]) => {
      if (overview.ok) setGeneratorOverview(overview.data);
      if (index.ok) setGeneratorIndex(index.data);
    });
    return () => controller.abort();
  }, [snapshot.manifest.artifacts.generatorIndex, snapshot.manifest.artifacts.generatorOverview]);
  useEffect(() => {
    if (!generatorIndex || !snapshot.manifest.snapshotId) return;
    const root = `snapshots/${snapshot.manifest.snapshotId}`;
    const countries = Object.keys(generatorIndex.countries).sort();
    const controller = new AbortController();
    let cursor = 0;
    const collected: GeneratorFeature[] = [];
    const concurrency = Math.min(4, countries.length);
    const run = async () => {
      await Promise.all(Array.from({ length: concurrency }, async () => {
        while (!controller.signal.aborted && cursor < countries.length) {
          const country = countries[cursor++];
          const result = await loadGeneratorCountry(root, generatorIndex, country, { signal: controller.signal });
          if (result.ok) collected.push(...result.data.features as GeneratorFeature[]);
        }
      }));
      if (!controller.signal.aborted) setSearchGenerators(collected.filter((feature) => feature.properties.name));
    };
    void run();
    return () => controller.abort();
  }, [generatorIndex, snapshot.manifest.snapshotId]);
  useEffect(() => {
    const path = snapshot.manifest.artifacts.regionalEnergy;
    const revision = ++regionalEnergyRevision.current;
    if (!path) return;
    const controller = new AbortController();
    void loadRegionalEnergy(path, { signal: controller.signal }).then((result) => {
      if (revision !== regionalEnergyRevision.current) return;
      if (result.ok) setRegionalEnergyLoad({ path, state: "ready", data: result.data, error: null });
      else if (result.error.kind !== "aborted") setRegionalEnergyLoad({ path, state: "error", data: {}, error: result.error.message });
    });
    return () => controller.abort();
  }, [regionalEnergyRetry, snapshot.manifest.artifacts.regionalEnergy, snapshot.manifest.snapshotId]);
  const regionalEnergyPath = snapshot.manifest.artifacts.regionalEnergy ?? null;
  const regionalEnergyCurrent = regionalEnergyLoad.path === regionalEnergyPath ? regionalEnergyLoad.data : {};
  const regionalEnergyState = !regionalEnergyPath ? "unavailable" : regionalEnergyLoad.path !== regionalEnergyPath ? "loading" : regionalEnergyLoad.state;
  const selectableGeographies = useMemo(
    () => [...snapshot.countries.features, ...admin1.features, ...snapshot.regions.features] as Array<GeographyFeature | RegionFeature>,
    [admin1.features, snapshot.countries.features, snapshot.regions.features],
  );
  const selectedGeography = useMemo(() => selectableGeographies.find((feature) => feature.properties.id === selectedId) ?? null, [selectableGeographies, selectedId]);
  const selectedAsset = useMemo(() => snapshot.assets.features.find((feature) => feature.properties.id === selectedId) as AssetFeature | undefined ?? null, [snapshot.assets.features, selectedId]);
  const comparisonRegions = useMemo(() => comparisonIds.map((id) => selectableGeographies.find((feature) => feature.properties.id === id)).filter(Boolean) as RegionFeature[], [comparisonIds, selectableGeographies]);
  const searchIndex = useMemo(
    () => buildSearchIndex({ geographies: selectableGeographies, assets: snapshot.assets.features as AssetFeature[], generators: searchGenerators, cities: cities.features }),
    [cities.features, searchGenerators, selectableGeographies, snapshot.assets.features],
  );
  const layerCounts = useMemo(() => ({
    dataCentres: snapshot.manifest.coverage.dataCentres,
    water: snapshot.manifest.coverage.waterInfrastructure,
    industrial: snapshot.manifest.coverage.industrialLoads ?? snapshot.assets.features.filter((feature) => feature.properties.category === "industrial_load").length,
    hydrogen: snapshot.manifest.coverage.hydrogenInfrastructure ?? snapshot.assets.features.filter((feature) => feature.properties.category === "hydrogen_infrastructure").length,
    generators: generatorIndex?.totals.featureCount ?? snapshot.manifest.coverage.publishedPowerPlants,
  }), [generatorIndex?.totals.featureCount, snapshot.assets.features, snapshot.manifest.coverage]);
  const explorerStatuses = useMemo(() => {
    const assets = snapshot.assets.features;
    const generatorStatus = (states: string[]) => (generatorOverview?.features ?? []).reduce((sum, feature) => sum + states.reduce((subtotal, state) => subtotal + (feature.properties.lifecycleCounts?.[state] ?? 0), 0), 0);
    const assetStatus = (states: string[]) => assets.filter((feature) => states.includes(feature.properties.lifecycle)).length;
    return {
      operating: assetStatus(["operational"]) + generatorStatus(["operational"]),
      construction: assetStatus(["under_construction"]) + generatorStatus(["under_construction"]),
      preConstruction: assetStatus(["pre_construction", "planning_filed", "permitted"]) + generatorStatus(["pre_construction", "planning_filed", "permitted"]),
      announced: assetStatus(["announced"]) + generatorStatus(["announced"]),
      retired: assetStatus(["retired", "decommissioned"]) + generatorStatus(["retired", "decommissioned"]),
    };
  }, [generatorOverview?.features, snapshot.assets.features]);

  const addComparison = () => {
    if (!selectedId || selectedAsset || comparisonIds.includes(selectedId)) return;
    if (selectedGeography) trackWattlasAction("comparison_added", { entity_name: selectedGeography.properties.name, entity_type: geographyEntityType(selectedGeography.properties) });
    setComparisonIds((current) => [...current, selectedId]);
  };

  const selectEntity = (id: string) => {
    setCountryIntelligenceOpen(false);
    setSelectedGenerator(null);
    setSelectedId(id);
    const asset = snapshot.assets.features.find((feature) => feature.properties.id === id);
    if (asset) {
      trackWattlasAction("entity_selected", { entity_type: asset.properties.category, entity_name: asset.properties.name, country: asset.properties.country });
      return;
    }
    const geography = selectableGeographies.find((feature) => feature.properties.id === id);
    if (geography) trackWattlasAction("entity_selected", { entity_type: geographyEntityType(geography.properties), entity_name: geography.properties.name, country: geography.properties.country });
  };
  const selectSearchResult = (result: SearchResult) => {
    trackWattlasAction("search_result_selected", { entity_name: result.label, entity_type: result.entityType, country: result.country });
    if (result.coordinates || result.bbox) setMapFocusTarget((current) => ({ nonce: (current?.nonce ?? 0) + 1, coordinates: result.coordinates, bbox: result.bbox }));
    if (result.entityType === "city") return;
    if (result.generator) {
      setSelectedGenerator(result.generator);
      setSelectedId(null);
      trackWattlasAction("entity_selected", { entity_type: "generator", entity_name: result.label, country: result.country, technology: result.generator.properties.technologies.join(",") });
      return;
    }
    selectEntity(result.id);
  };

  return (
    <main className={filtersVisible ? "radar-shell" : "radar-shell filters-hidden"} style={{ "--inspector": `${inspectorWidth}px` } as CSSProperties}>
      <CommandBar manifest={snapshot.manifest} mode={mode} onModeChange={(next) => {
        setMode(next);
        if (next === "explorer") {
          setInfrastructure({ dataCentres: true, water: true, industrial: true, hydrogen: true, generators: true });
          if (technologies.size === 0) setTechnologies(new Set(["solar", "wind", "hydro", "nuclear", "gas", "coal", "oil", "biomass", "geothermal", "other"]));
        }
        trackWattlasAction("workspace_changed", { workspace: next });
      }} onOpenStatus={() => { setStatusOpen(true); trackWattlasAction("data_status_opened"); }} />
      {filtersVisible ? <LayerRail
        activeLens={lens}
        onChange={(next) => { setLens(next); if (next !== lens) trackWattlasAction("lens_changed", { lens: next }); }}
        onHide={() => { setFiltersVisible(false); trackWattlasAction("filters_hidden"); }}
        searchSlot={<SearchBox index={searchIndex} onSelect={selectSearchResult} />}
        onAdvancedOpen={() => trackWattlasAction("advanced_filters_opened")}
        infrastructure={infrastructure}
        counts={layerCounts}
        onInfrastructureChange={(next) => {
          const changed = (Object.keys(next) as Array<keyof InfrastructureVisibility>).find((key) => next[key] !== infrastructure[key]);
          setInfrastructure(next);
          if (changed === "generators") {
            if (!next.generators) { setTechnologies(new Set()); setSelectedGenerator(null); }
            else if (technologies.size === 0) setTechnologies(new Set(["solar", "wind", "hydro", "nuclear", "gas", "coal", "oil", "biomass", "geothermal", "other"]));
          }
          if (changed) trackWattlasAction("filter_changed", { filter_name: changed, filter_value: next[changed] ? "enabled" : "disabled" });
        }}
        technologies={technologies}
        onTechnologiesChange={(next) => {
          const changed = [...new Set([...technologies, ...next])].find((technology) => next.has(technology) !== technologies.has(technology));
          setTechnologies(next);
          setInfrastructure((current) => ({ ...current, generators: next.size > 0 }));
          setSelectedGenerator((current) => current && !current.properties.technologies.some((technology) => next.has(technology)) ? null : current);
          if (changed) trackWattlasAction("filter_changed", { filter_name: "generator_technology", filter_value: `${changed}:${next.has(changed) ? "enabled" : "disabled"}` });
        }}
        lifecycles={lifecycles}
        onLifecyclesChange={(next) => {
          const changed = [...new Set([...lifecycles, ...next])].filter((lifecycle) => next.has(lifecycle) !== lifecycles.has(lifecycle));
          setLifecycles(next);
          setSelectedGenerator((current) => current && !next.has(current.properties.lifecycle ?? "unknown") ? null : current);
          if (changed.length) trackWattlasAction("filter_changed", { filter_name: "generator_lifecycle", filter_value: changed.map((lifecycle) => `${lifecycle}:${next.has(lifecycle) ? "enabled" : "disabled"}`).join(",") });
        }}
      /> : <button className="show-filters" type="button" onClick={() => { setFiltersVisible(true); trackWattlasAction("filters_shown"); }} aria-label="Show filters" aria-expanded="false">Filters <span aria-hidden="true">→</span></button>}
      <GlobalMap countries={snapshot.countries} admin1={admin1} regions={snapshot.regions} assets={snapshot.assets} cities={cities} coverage={snapshot.manifest.coverage} lens={lens} year={year} selectedId={selectedId} focusTarget={mapFocusTarget} onSelect={selectEntity} onSelectGenerator={(generator) => { setSelectedGenerator(generator); setSelectedId(null); trackWattlasAction("entity_selected", { entity_type: "generator", entity_name: generator.properties.name ?? generator.properties.id, country: generator.properties.country, technology: generator.properties.technologies.join(",") }); }} onVisibleGeneratorsChange={(ids) => setSelectedGenerator((current) => current && !ids.has(current.properties.id) ? null : current)} infrastructure={infrastructure} technologies={technologies} lifecycles={lifecycles} generatorOverview={generatorOverview} generatorIndex={generatorIndex} snapshotRoot={snapshot.manifest.snapshotId ? `snapshots/${snapshot.manifest.snapshotId}` : null} />
      {mode === "explorer" && <AssetExplorerSummary coverage={{ countries: snapshot.manifest.coverage.countries, assets: snapshot.manifest.coverage.assets, dataCentres: snapshot.manifest.coverage.dataCentres, waterInfrastructure: snapshot.manifest.coverage.waterInfrastructure, industrialLoads: layerCounts.industrial ?? 0, hydrogenInfrastructure: layerCounts.hydrogen ?? 0, generators: layerCounts.generators ?? 0 }} statuses={explorerStatuses} />}
      <ProjectSummaryCard asset={selectedAsset} generator={selectedGenerator} />
      <InspectorResizer width={inspectorWidth} min={MIN_INSPECTOR_WIDTH} max={MAX_INSPECTOR_WIDTH} onChange={setInspectorWidth} onCommit={(width) => trackWattlasAction("inspector_resized", { panel_width: width })} />
      {countryIntelligenceOpen && selectedGeography && "level" in selectedGeography.properties && selectedGeography.properties.level === "country"
        ? <CountryIntelligence country={selectedGeography as GeographyFeature} regions={admin1.features.filter((feature) => feature.properties.country === selectedGeography.properties.id)} regionalEnergy={regionalEnergyCurrent} generatorOverview={generatorOverview} year={year} onClose={() => setCountryIntelligenceOpen(false)} />
        : <EntityInspector geography={selectedGeography} asset={selectedAsset} generator={selectedGenerator} regionalEnergy={selectedGeography ? regionalEnergyCurrent[selectedGeography.properties.id] : undefined} regionalEnergyState={lens === "powerBalance" ? regionalEnergyState : "idle"} regionalEnergyError={regionalEnergyLoad.error} onRetryRegionalEnergy={() => { setRegionalEnergyLoad({ path: regionalEnergyPath, state: "loading", data: {}, error: null }); setRegionalEnergyRetry((value) => value + 1); }} generatorOverview={generatorOverview} evidence={snapshot.evidence} lens={lens} year={year} onOpenEvidence={() => { setEvidenceOpen(true); if (selectedGeography) trackWattlasAction("evidence_opened", { entity_name: selectedGeography.properties.name, entity_type: geographyEntityType(selectedGeography.properties) }); }} onAddComparison={addComparison} onOpenCountryIntelligence={() => { setCountryIntelligenceOpen(true); trackWattlasAction("country_intelligence_opened", { country: selectedGeography?.properties.country }); }} />}
      <Timeline years={snapshot.manifest.activeYears} activeYear={year} onChange={(next) => { setYear(next); if (next !== year) trackWattlasAction("year_changed", { year: next }); }} />
      <DataStatusDrawer manifest={snapshot.manifest} open={statusOpen} onClose={() => setStatusOpen(false)} />
      <EvidenceDossier region={selectedGeography as RegionFeature | null} evidence={snapshot.evidence} open={evidenceOpen && !selectedAsset} onClose={() => setEvidenceOpen(false)} />
      <ComparisonDrawer regions={comparisonRegions} lens={lens} year={year} regionalEnergy={regionalEnergyCurrent} onClose={() => setComparisonIds([])} onRemove={(id) => setComparisonIds((current) => current.filter((item) => item !== id))} />
      {comparisonIds.length === 1 && <div className="comparison-toast">1 region queued. Select another region and add it to compare.<button type="button" onClick={() => setComparisonIds([])}>Clear</button></div>}
    </main>
  );
}
