import { GENERATOR_COLORS } from "@/lib/map/generator-colors";
import type { GeneratorCapacityRange } from "@/lib/map/generator-capacity";
import type { GenerationTechnology, LensKey } from "@/lib/snapshot/types";
import { useState, type ReactNode } from "react";
import { GeneratorCapacityFilter } from "@/components/controls/generator-capacity-filter";

const lenses: Array<{ id: LensKey; label: string; description: string }> = [
  { id: "infrastructureDemand", label: "Infrastructure Demand", description: "Primary opportunity signal" },
  { id: "siteAttractiveness", label: "Site Attractiveness", description: "Delivery and location conditions" },
  { id: "systemRisk", label: "System Risk", description: "Constraint and resilience exposure" },
  { id: "powerBalance", label: "Power Balance", description: "Demand versus dependable supply" },
];

export type InfrastructureVisibility = {
  dataCentres: boolean;
  water: boolean;
  industrial: boolean;
  hydrogen: boolean;
  generators: boolean;
};
export type LayerCounts = Partial<Record<keyof InfrastructureVisibility, number>>;
type Props = {
  activeLens: LensKey; onChange: (lens: LensKey) => void;
  onHide?: () => void;
  searchSlot?: ReactNode;
  onAdvancedOpen?: () => void;
  infrastructure?: InfrastructureVisibility; onInfrastructureChange?: (value: InfrastructureVisibility) => void;
  technologies?: ReadonlySet<GenerationTechnology>; onTechnologiesChange?: (value: Set<GenerationTechnology>) => void;
  lifecycles?: ReadonlySet<string>; onLifecyclesChange?: (value: Set<string>) => void;
  capacityRange?: GeneratorCapacityRange; onCapacityRangeChange?: (value: GeneratorCapacityRange) => void;
  capacityScaleMaximumMw?: number; generatorCatalogueReady?: boolean;
  generatorCatalogueError?: string | null; onRetryGeneratorCatalogue?: () => void;
  counts?: LayerCounts;
};

const technologyLabels: Record<GenerationTechnology, string> = { solar: "Solar", wind: "Wind", hydro: "Hydro", nuclear: "Nuclear", gas: "Gas", coal: "Coal", oil: "Oil", biomass: "Biomass", geothermal: "Geothermal", other: "Other" };
const lifecycleGroups = {
  operating: { label: "Operating", states: ["operational"] },
  construction: { label: "Under construction", states: ["under_construction"] },
  preConstruction: { label: "Pre-construction", states: ["pre_construction", "planning_filed", "permitted"] },
  announced: { label: "Announced", states: ["announced"] },
  retired: { label: "Retired", states: ["retired", "decommissioned"] },
  other: { label: "Other / unknown", states: ["paused", "cancelled", "shelved", "mothballed", "unknown"] },
} as const;

const layerIcons = {
  dataCentres: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 14 4.75v6.5L8 14.5 2 11.25v-6.5L8 1.5Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M2 4.75 8 8l6-3.25M8 8v6.5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  water: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.8c2.6 3.2 4.4 5.7 4.4 8A4.4 4.4 0 0 1 8 14.2 4.4 4.4 0 0 1 3.6 9.8c0-2.3 1.8-4.8 4.4-8Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  generators: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.2 1.5 3.6 9h3.2l-.9 5.5L11.5 7H8.3l.9-5.5Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  ),
  industrial: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M2 13.5h12M3 13.5V7.8l3 1.7V6.6l3 1.8V4.5h4v9" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M10.5 2.2h2v2.3h-2z" fill="none" stroke="currentColor" strokeWidth="1.1" />
    </svg>
  ),
  hydrogen: (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="4" cy="8" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="4" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="m5.8 7.1 4.4-2.2M5.8 8.9l4.4 2.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  ),
} as const;

function Switch({ checked }: { checked: boolean }) {
  return <span className={checked ? "switch on" : "switch"} aria-hidden="true"><i /></span>;
}

function LayerRow({ id, label, checked, count, onToggle }: { id: keyof InfrastructureVisibility; label: string; checked: boolean; count?: number; onToggle: () => void }) {
  return (
    <button type="button" className={`layer-row ${id}`} role="switch" aria-label={label} aria-checked={checked} onClick={onToggle}>
      <span className="layer-icon">{layerIcons[id]}</span>
      <span className="layer-name">{label}</span>
      {count != null && <span className="layer-count" aria-label={`${count.toLocaleString()} published facilities`}>{count.toLocaleString()}</span>}
      <Switch checked={checked} />
    </button>
  );
}

export function LayerRail({ activeLens, onChange, onHide, searchSlot, onAdvancedOpen, infrastructure, onInfrastructureChange, technologies, onTechnologiesChange, lifecycles, onLifecyclesChange, capacityRange, onCapacityRangeChange, capacityScaleMaximumMw = 25_000, generatorCatalogueReady = false, generatorCatalogueError = null, onRetryGeneratorCatalogue, counts = {} }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <aside className="layer-rail" aria-label="Map controls">
      {onHide && <button className="rail-toggle" type="button" onClick={onHide} aria-label="Hide filters">Hide filters <span aria-hidden="true">←</span></button>}
      {searchSlot && <div className="rail-section search-section">{searchSlot}</div>}
      {infrastructure && onInfrastructureChange && <div className="rail-section infrastructure-controls">
        <p className="rail-heading">Infrastructure layers</p>
        <div className="layer-list">
          <LayerRow id="dataCentres" label="Data centres" count={counts.dataCentres} checked={infrastructure.dataCentres} onToggle={() => onInfrastructureChange({ ...infrastructure, dataCentres: !infrastructure.dataCentres })} />
          <LayerRow id="water" label="Water infrastructure" count={counts.water} checked={infrastructure.water} onToggle={() => onInfrastructureChange({ ...infrastructure, water: !infrastructure.water })} />
          <LayerRow id="industrial" label="Industrial demand" count={counts.industrial} checked={infrastructure.industrial} onToggle={() => onInfrastructureChange({ ...infrastructure, industrial: !infrastructure.industrial })} />
          <LayerRow id="hydrogen" label="Hydrogen network" count={counts.hydrogen} checked={infrastructure.hydrogen} onToggle={() => onInfrastructureChange({ ...infrastructure, hydrogen: !infrastructure.hydrogen })} />
          <LayerRow id="generators" label="Power generators" count={counts.generators} checked={infrastructure.generators} onToggle={() => onInfrastructureChange({ ...infrastructure, generators: !infrastructure.generators })} />
          {technologies && onTechnologiesChange && <div className="tech-tree" aria-label="Generator technology filters">
            {(Object.keys(technologyLabels) as GenerationTechnology[]).map((technology) => (
              <button key={technology} type="button" className="tech-row" role="switch" aria-label={technologyLabels[technology]} aria-checked={technologies.has(technology)} onClick={() => { const next = new Set(technologies); if (next.has(technology)) next.delete(technology); else next.add(technology); onTechnologiesChange(next); }}>
                <span aria-hidden="true" className="generator-swatch" style={{ backgroundColor: GENERATOR_COLORS[technology] }} />
                <span className="tech-name">{technologyLabels[technology]}</span>
                <Switch checked={technologies.has(technology)} />
              </button>
            ))}
          </div>}
          {capacityRange && onCapacityRangeChange && <GeneratorCapacityFilter value={capacityRange} scaleMaximumMw={capacityScaleMaximumMw} catalogueReady={generatorCatalogueReady} catalogueError={generatorCatalogueError} onRetryCatalogue={onRetryGeneratorCatalogue} onChange={onCapacityRangeChange} />}
          <button className="advanced-filter-toggle" type="button" aria-label="Project status · Advanced power filters" aria-expanded={advancedOpen} onClick={() => { const next = !advancedOpen; setAdvancedOpen(next); if (next) onAdvancedOpen?.(); }}>Project status <span aria-hidden="true">{advancedOpen ? "−" : "+"}</span></button>
          {advancedOpen && lifecycles && onLifecyclesChange && <div className="tech-tree lifecycle-tree" aria-label="Generator lifecycle filters">
            <div className="filter-section-actions"><span>Lifecycle</span><button type="button" onClick={() => onLifecyclesChange(new Set())}>Clear</button></div>
            {(Object.entries(lifecycleGroups)).map(([id, group]) => { const pressed = group.states.every((state) => lifecycles.has(state)); return (
              <button key={id} type="button" className="tech-row" role="switch" aria-label={group.label} aria-checked={pressed} onClick={() => { const next = new Set(lifecycles); for (const state of group.states) { if (pressed) next.delete(state); else next.add(state); } onLifecyclesChange(next); }}>
                <span className="tech-name">{group.label}</span>
                <Switch checked={pressed} />
              </button>
            ); })}
          </div>}
        </div>
      </div>}
      <div className="rail-section">
        <p className="rail-heading">View</p>
        <div className="lens-list">
          {lenses.map((lens, index) => (
            <button
              key={lens.id}
              className={activeLens === lens.id ? "lens-button active" : "lens-button"}
              onClick={() => onChange(lens.id)}
              type="button"
              aria-pressed={activeLens === lens.id}
              aria-label={lens.label}
            >
              <span className="lens-index">0{index + 1}</span>
              <span>
                <strong>{lens.label}</strong>
                <small>{lens.description}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
      <div className="rail-section map-legend">
        <p className="rail-heading">Score intensity</p>
        <div className={`legend-ramp ${activeLens}`} />
        <div className="legend-labels">
          <span>{activeLens === "powerBalance" ? "Comfortable margin" : "Low"}</span>
          <span>{activeLens === "powerBalance" ? "Severe pressure" : "High"}</span>
        </div>
        <p className="legend-note">
          {activeLens === "powerBalance"
            ? "Slate indicates broad balance or uncertainty. Unavailable regions remain selectable."
            : "Neutral regions are not yet rankable. They remain selectable."}
        </p>
      </div>
      <div className="rail-section coverage-key">
        <p className="rail-heading">Coverage</p>
        <p><span className="key-mark estimated" /> Provisional analyst estimate</p>
        <p><span className="key-mark unavailable" /> Insufficient public evidence</p>
      </div>
    </aside>
  );
}
