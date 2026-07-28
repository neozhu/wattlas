"use client";

import { useState } from "react";

import { GeneratorCapacityFilter } from "@/components/controls/generator-capacity-filter";
import type { InfrastructureVisibility } from "@/components/controls/layer-rail";
import { MobileSheet } from "@/components/mobile/mobile-sheet";
import { GENERATOR_COLORS } from "@/lib/map/generator-colors";
import type { GeneratorCapacityRange } from "@/lib/map/generator-capacity";
import type { GenerationTechnology } from "@/lib/snapshot/types";

type Props = {
  open: boolean;
  activeCount: number;
  infrastructure: InfrastructureVisibility;
  technologies: ReadonlySet<GenerationTechnology>;
  lifecycles: ReadonlySet<string>;
  capacityRange: GeneratorCapacityRange;
  capacityScaleMaximumMw: number;
  generatorCatalogueReady: boolean;
  generatorCatalogueError?: string | null;
  onRetryGeneratorCatalogue?: () => void;
  onInfrastructureChange: (value: InfrastructureVisibility) => void;
  onTechnologiesChange: (value: Set<GenerationTechnology>) => void;
  onLifecyclesChange: (value: Set<string>) => void;
  onCapacityRangeChange: (value: GeneratorCapacityRange) => void;
  onClearAll: () => void;
  onRestoreDefaults: () => void;
  onClose: () => void;
};

type SectionName = "infrastructure" | "technologies" | "status" | "capacity" | "coverage";

const infrastructureLabels: Record<keyof InfrastructureVisibility, string> = {
  dataCentres: "Data centres",
  water: "Water infrastructure",
  industrial: "Industrial demand",
  hydrogen: "Hydrogen network",
  generators: "Power generators",
};

const technologyLabels: Record<GenerationTechnology, string> = {
  solar: "Solar",
  wind: "Wind",
  hydro: "Hydro",
  nuclear: "Nuclear",
  gas: "Gas",
  coal: "Coal",
  oil: "Oil",
  biomass: "Biomass",
  geothermal: "Geothermal",
  other: "Other",
};

const lifecycleGroups = [
  { label: "Operating", states: ["operational"] },
  { label: "Under construction", states: ["under_construction"] },
  { label: "Pre-construction", states: ["pre_construction", "planning_filed", "permitted"] },
  { label: "Announced", states: ["announced"] },
  { label: "Retired", states: ["retired", "decommissioned"] },
] as const;

function Toggle({ label, checked, swatch, onClick }: { label: string; checked: boolean; swatch?: string; onClick: () => void }) {
  return (
    <button className="mobile-filter-toggle" type="button" role="switch" aria-label={label} aria-checked={checked} onClick={onClick}>
      {swatch && <span className="mobile-filter-swatch" style={{ backgroundColor: swatch }} aria-hidden="true" />}
      <span>{label}</span>
      <i aria-hidden="true"><b /></i>
    </button>
  );
}

function Section({ id, label, open, onToggle, children }: { id: SectionName; label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <section className="mobile-filter-section">
      <button type="button" className="mobile-filter-section-toggle" aria-expanded={open} aria-controls={`mobile-filter-${id}`} onClick={onToggle}>
        <span>{label}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
      </button>
      {open && <div id={`mobile-filter-${id}`} className="mobile-filter-section-body">{children}</div>}
    </section>
  );
}

export function MobileFilterSheet(props: Props) {
  const [expanded, setExpanded] = useState<Set<SectionName>>(() => new Set(["infrastructure"]));
  const toggleSection = (section: SectionName) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  return (
    <MobileSheet
      id="map-layers"
      title="Map layers"
      open={props.open}
      size="full"
      onClose={props.onClose}
      footer={(
        <div className="mobile-filter-footer">
          <button type="button" className="secondary" onClick={props.onClearAll}>Clear all</button>
          <button type="button" className="secondary" onClick={props.onRestoreDefaults}>Restore defaults</button>
          <button type="button" className="primary" onClick={props.onClose}>Show results</button>
        </div>
      )}
    >
      <p className="mobile-sheet-summary">{props.activeCount} active filters</p>
      <Section id="infrastructure" label="Infrastructure layers" open={expanded.has("infrastructure")} onToggle={() => toggleSection("infrastructure")}>
        {(Object.keys(infrastructureLabels) as Array<keyof InfrastructureVisibility>).map((key) => (
          <Toggle
            key={key}
            label={infrastructureLabels[key]}
            checked={props.infrastructure[key]}
            onClick={() => props.onInfrastructureChange({ ...props.infrastructure, [key]: !props.infrastructure[key] })}
          />
        ))}
      </Section>
      <Section id="technologies" label="Generator technologies" open={expanded.has("technologies")} onToggle={() => toggleSection("technologies")}>
        {(Object.keys(technologyLabels) as GenerationTechnology[]).map((technology) => (
          <Toggle
            key={technology}
            label={technologyLabels[technology]}
            checked={props.technologies.has(technology)}
            swatch={GENERATOR_COLORS[technology]}
            onClick={() => {
              const next = new Set(props.technologies);
              if (next.has(technology)) next.delete(technology);
              else next.add(technology);
              props.onTechnologiesChange(next);
            }}
          />
        ))}
      </Section>
      <Section id="status" label="Project status" open={expanded.has("status")} onToggle={() => toggleSection("status")}>
        {lifecycleGroups.map((group) => {
          const checked = group.states.every((state) => props.lifecycles.has(state));
          return (
            <Toggle
              key={group.label}
              label={group.label}
              checked={checked}
              onClick={() => {
                const next = new Set(props.lifecycles);
                for (const state of group.states) {
                  if (checked) next.delete(state);
                  else next.add(state);
                }
                props.onLifecyclesChange(next);
              }}
            />
          );
        })}
      </Section>
      <Section id="capacity" label="Plant capacity" open={expanded.has("capacity")} onToggle={() => toggleSection("capacity")}>
        <GeneratorCapacityFilter
          value={props.capacityRange}
          scaleMaximumMw={props.capacityScaleMaximumMw}
          catalogueReady={props.generatorCatalogueReady}
          catalogueError={props.generatorCatalogueError}
          onRetryCatalogue={props.onRetryGeneratorCatalogue}
          onChange={props.onCapacityRangeChange}
        />
      </Section>
      <Section id="coverage" label="Coverage and score colours" open={expanded.has("coverage")} onToggle={() => toggleSection("coverage")}>
        <div className="mobile-coverage-explanation">
          <span className="mobile-score-ramp" aria-hidden="true" />
          <p>Scores run from lower opportunity or pressure through yellow to higher opportunity or pressure. Neutral regions remain selectable when evidence is limited.</p>
        </div>
      </Section>
    </MobileSheet>
  );
}
