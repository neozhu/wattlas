import { GENERATOR_COLORS } from "@/lib/map/generator-colors";
import type { GenerationTechnology, LensKey } from "@/lib/snapshot/types";
import { useState, type ReactNode } from "react";

const lenses: Array<{ id: LensKey; label: string; description: string }> = [
  { id: "infrastructureDemand", label: "Infrastructure Demand", description: "Primary opportunity signal" },
  { id: "siteAttractiveness", label: "Site Attractiveness", description: "Delivery and location conditions" },
  { id: "systemRisk", label: "System Risk", description: "Constraint and resilience exposure" },
  { id: "powerBalance", label: "Power Balance", description: "Demand versus dependable supply" },
];

export type InfrastructureVisibility = { dataCentres: boolean; water: boolean; generators: boolean };
type Props = {
  activeLens: LensKey; onChange: (lens: LensKey) => void;
  onHide?: () => void;
  searchSlot?: ReactNode;
  onAdvancedOpen?: () => void;
  infrastructure?: InfrastructureVisibility; onInfrastructureChange?: (value: InfrastructureVisibility) => void;
  technologies?: ReadonlySet<GenerationTechnology>; onTechnologiesChange?: (value: Set<GenerationTechnology>) => void;
  lifecycles?: ReadonlySet<string>; onLifecyclesChange?: (value: Set<string>) => void;
};

const technologyLabels: Record<GenerationTechnology, string> = { solar: "Solar", wind: "Wind", hydro: "Hydro", nuclear: "Nuclear", gas: "Gas", coal: "Coal", oil: "Oil", biomass: "Biomass", geothermal: "Geothermal", other: "Other" };
const lifecycleGroups = {
  operational: { label: "Operational", states: ["operational"] },
  construction: { label: "Under construction", states: ["under_construction"] },
  planned: { label: "Planned", states: ["announced", "planning_filed", "permitted"] },
  paused: { label: "Paused", states: ["paused"] },
  cancelled: { label: "Cancelled or shelved", states: ["cancelled", "shelved"] },
  retired: { label: "Retired or decommissioned", states: ["retired", "decommissioned"] },
  unknown: { label: "Unknown status", states: ["unknown"] },
} as const;

function infrastructureChip(infrastructure?: InfrastructureVisibility): string {
  if (!infrastructure) return "Infrastructure";
  const active = [infrastructure.dataCentres, infrastructure.water, infrastructure.generators].filter(Boolean).length;
  if (active === 3) return "All infrastructure";
  if (active === 0) return "No infrastructure";
  return [
    infrastructure.dataCentres ? "Data centres" : null,
    infrastructure.water ? "Water" : null,
    infrastructure.generators ? "Power" : null,
  ].filter(Boolean).join(" + ");
}

function powerChip(technologies?: ReadonlySet<GenerationTechnology>, lifecycles?: ReadonlySet<string>): string {
  const totalTechnologies = Object.keys(technologyLabels).length;
  const technologyText = !technologies || technologies.size === totalTechnologies ? "all technologies" : `${technologies.size} technologies`;
  const lifecycleText = !lifecycles || lifecycles.size === Object.values(lifecycleGroups).flatMap((group) => group.states).length ? "all statuses" : `${lifecycles.size} statuses`;
  return `Power: ${technologyText}, ${lifecycleText}`;
}

export function LayerRail({ activeLens, onChange, onHide, searchSlot, onAdvancedOpen, infrastructure, onInfrastructureChange, technologies, onTechnologiesChange, lifecycles, onLifecyclesChange }: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  return (
    <aside className="layer-rail" aria-label="Map controls">
      {onHide && <button className="rail-toggle" type="button" onClick={onHide} aria-label="Hide filters">Hide filters <span aria-hidden="true">←</span></button>}
      {searchSlot && <div className="rail-section search-section">{searchSlot}</div>}
      <div className="rail-section active-filter-summary" aria-label="Active filters">
        <p className="rail-heading">Active view</p>
        <div className="filter-chips">
          <span>{infrastructureChip(infrastructure)}</span>
          {infrastructure?.generators && <span>{powerChip(technologies, lifecycles)}</span>}
        </div>
      </div>
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
      {infrastructure && onInfrastructureChange && <div className="rail-section infrastructure-controls">
        <p className="rail-heading">Infrastructure</p>
        {([['dataCentres', 'Data centres'], ['water', 'Water infrastructure'], ['generators', 'Power generators']] as const).map(([id, label]) => <button key={id} type="button" aria-label={label} aria-pressed={infrastructure[id]} onClick={() => onInfrastructureChange({ ...infrastructure, [id]: !infrastructure[id] })}>{label}</button>)}
        {infrastructure.generators && <button className="advanced-filter-toggle" type="button" aria-expanded={advancedOpen} onClick={() => { const next = !advancedOpen; setAdvancedOpen(next); if (next) onAdvancedOpen?.(); }}>Advanced power filters <span aria-hidden="true">{advancedOpen ? "−" : "+"}</span></button>}
        {infrastructure.generators && advancedOpen && technologies && onTechnologiesChange && <div className="generator-filters" aria-label="Generator technology filters">
          <p>Technology</p>
          {(Object.keys(technologyLabels) as GenerationTechnology[]).map((technology) => <button key={technology} type="button" aria-label={technologyLabels[technology]} aria-pressed={technologies.has(technology)} onClick={() => { const next = new Set(technologies); if (next.has(technology)) next.delete(technology); else next.add(technology); onTechnologiesChange(next); }}><span aria-hidden="true" className="generator-swatch" style={{ backgroundColor: GENERATOR_COLORS[technology] }} />{technologyLabels[technology]}</button>)}
        </div>}
        {infrastructure.generators && advancedOpen && lifecycles && onLifecyclesChange && <div className="generator-filters" aria-label="Generator lifecycle filters">
          <p>Status</p>
          {(Object.entries(lifecycleGroups)).map(([id, group]) => { const pressed = group.states.every((state) => lifecycles.has(state)); return <button key={id} type="button" aria-label={group.label} aria-pressed={pressed} onClick={() => { const next = new Set(lifecycles); for (const state of group.states) { if (pressed) next.delete(state); else next.add(state); } onLifecyclesChange(next); }}>{group.label}</button>; })}
        </div>}
      </div>}
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
