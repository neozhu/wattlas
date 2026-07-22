"use client";

import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";

import {
  ALL_GENERATOR_CAPACITIES,
  GENERATOR_CAPACITY_SLIDER_STEPS,
  capacityRangeLabel,
  capacityToSliderPosition,
  formatGeneratorCapacity,
  isAllGeneratorCapacities,
  sliderPositionToCapacity,
  type GeneratorCapacityRange,
} from "@/lib/map/generator-capacity";

type Props = {
  value: GeneratorCapacityRange;
  scaleMaximumMw: number;
  disabled?: boolean;
  catalogueReady: boolean;
  catalogueError?: string | null;
  onRetryCatalogue?: () => void;
  onChange: (value: GeneratorCapacityRange) => void;
};
type ParsedCapacityDraft = { ok: true; value: GeneratorCapacityRange } | { ok: false; error: string };

const inputValue = (value: number): string => Number.isFinite(value) ? String(value) : "0";

export function GeneratorCapacityFilter(props: Props) {
  return <GeneratorCapacityFilterEditor key={`${props.value.minMw}:${props.value.maxMw ?? "unlimited"}`} {...props} />;
}

function GeneratorCapacityFilterEditor({ value, scaleMaximumMw, disabled = false, catalogueReady, catalogueError = null, onRetryCatalogue, onChange }: Props) {
  const [draftMin, setDraftMin] = useState(inputValue(value.minMw));
  const [draftMax, setDraftMax] = useState(value.maxMw == null ? "" : inputValue(value.maxMw));
  const [error, setError] = useState<string | null>(null);
  const scaleMaximum = Math.max(1000, scaleMaximumMw);

  const parsedDraft = (): ParsedCapacityDraft => {
    const minMw = draftMin.trim() === "" ? 0 : Number(draftMin);
    const maxMw = draftMax.trim() === "" ? null : Number(draftMax);
    if (!Number.isFinite(minMw) || minMw < 0 || (maxMw != null && (!Number.isFinite(maxMw) || maxMw < 0))) {
      return { ok: false, error: "Capacity values must be non-negative numbers" };
    }
    if (maxMw != null && maxMw < minMw) return { ok: false, error: "Maximum must be greater than or equal to minimum" };
    return { ok: true, value: { minMw, maxMw } };
  };

  const commitDraft = () => {
    const parsed = parsedDraft();
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onChange(parsed.value);
  };

  const commitOnEnter = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    commitDraft();
  };

  const draftMinimum = Number.isFinite(Number(draftMin)) ? Math.max(0, Number(draftMin)) : value.minMw;
  const draftMaximum = draftMax.trim() === "" ? null : Number.isFinite(Number(draftMax)) ? Math.max(0, Number(draftMax)) : value.maxMw;
  const minimumPosition = capacityToSliderPosition(draftMinimum, scaleMaximum);
  const maximumPosition = draftMaximum == null ? GENERATOR_CAPACITY_SLIDER_STEPS : capacityToSliderPosition(draftMaximum, scaleMaximum);
  const trackStyle = useMemo(() => ({
    "--capacity-min": `${minimumPosition / GENERATOR_CAPACITY_SLIDER_STEPS * 100}%`,
    "--capacity-max": `${maximumPosition / GENERATOR_CAPACITY_SLIDER_STEPS * 100}%`,
  }) as CSSProperties, [maximumPosition, minimumPosition]);

  const setMinimumFromSlider = (position: number) => {
    setDraftMin(inputValue(sliderPositionToCapacity(position, scaleMaximum)));
    setError(null);
  };
  const setMaximumFromSlider = (position: number) => {
    setDraftMax(position >= GENERATOR_CAPACITY_SLIDER_STEPS ? "" : inputValue(sliderPositionToCapacity(position, scaleMaximum)));
    setError(null);
  };

  return (
    <section className={disabled ? "capacity-filter disabled" : "capacity-filter"} aria-label="Generator capacity filter">
      <div className="capacity-filter-heading">
        <span>Plant capacity</span>
        <output aria-label="Active generator capacity range">{capacityRangeLabel(value)}</output>
      </div>
      <div className="capacity-range-track" style={trackStyle}>
        <span aria-hidden="true" />
        <input
          type="range"
          min={0}
          max={GENERATOR_CAPACITY_SLIDER_STEPS}
          step="0.01"
          value={Math.min(minimumPosition, maximumPosition)}
          aria-label="Minimum generator capacity"
          aria-valuetext={formatGeneratorCapacity(draftMinimum)}
          disabled={disabled}
          onChange={(event) => setMinimumFromSlider(Number(event.currentTarget.value))}
          onPointerUp={commitDraft}
          onKeyUp={commitDraft}
          onBlur={commitDraft}
        />
        <input
          type="range"
          min={0}
          max={GENERATOR_CAPACITY_SLIDER_STEPS}
          step="0.01"
          value={Math.max(minimumPosition, maximumPosition)}
          aria-label="Maximum generator capacity"
          aria-valuetext={draftMaximum == null ? "No limit" : formatGeneratorCapacity(draftMaximum)}
          disabled={disabled}
          onChange={(event) => setMaximumFromSlider(Number(event.currentTarget.value))}
          onPointerUp={commitDraft}
          onKeyUp={commitDraft}
          onBlur={commitDraft}
        />
      </div>
      <div className="capacity-number-fields">
        <label>Min MW<input type="number" min="0" step="any" aria-label="Minimum capacity (MW)" value={draftMin} disabled={disabled} onChange={(event) => { setDraftMin(event.currentTarget.value); setError(null); }} onBlur={commitDraft} onKeyDown={commitOnEnter} /></label>
        <span aria-hidden="true">—</span>
        <label>Max MW<input type="number" min="0" step="any" aria-label="Maximum capacity (MW)" placeholder="No limit" value={draftMax} disabled={disabled} onChange={(event) => { setDraftMax(event.currentTarget.value); setError(null); }} onBlur={commitDraft} onKeyDown={commitOnEnter} /></label>
        <button type="button" aria-label="Reset capacity range" disabled={disabled || isAllGeneratorCapacities(value)} onClick={() => onChange(ALL_GENERATOR_CAPACITIES)}>Reset</button>
      </div>
      {error && <p className="capacity-filter-error" role="alert">{error}</p>}
      {catalogueError && <div className="capacity-filter-catalogue-error">
        <p className="capacity-filter-error" role="alert">{catalogueError}</p>
        {onRetryCatalogue && <button type="button" aria-label="Retry generator catalogue" onClick={onRetryCatalogue}>Retry</button>}
      </div>}
      {value.minMw > 0 && <p className="capacity-filter-note">Unknown capacity excluded</p>}
      {!catalogueError && !isAllGeneratorCapacities(value) && !catalogueReady && <p className="capacity-filter-note loading">Preparing matching global plants…</p>}
    </section>
  );
}
