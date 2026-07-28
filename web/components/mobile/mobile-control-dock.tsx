"use client";

export type MobileControlSheet = "layers" | "view" | "year";

type Props = {
  activeSheet: MobileControlSheet | "details" | null;
  activeFilterCount: number;
  lensLabel: string;
  year: number;
  onOpen: (sheet: MobileControlSheet) => void;
};

function LayersIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m12 3 8 4.5-8 4.5-8-4.5L12 3Zm-8 9 8 4.5 8-4.5M4 16.5 12 21l8-4.5" />
    </svg>
  );
}

function ViewIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 18V9m5 9V5m6 13v-7m5 7V3" />
    </svg>
  );
}

function YearIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 4h14v16H5zM8 2v4m8-4v4M5 9h14" />
    </svg>
  );
}

export function MobileControlDock({ activeSheet, activeFilterCount, lensLabel, year, onOpen }: Props) {
  const filterLabel = `${activeFilterCount} active ${activeFilterCount === 1 ? "filter" : "filters"}`;
  return (
    <nav className="mobile-control-dock" aria-label="Mobile map controls">
      <button
        type="button"
        aria-label={`Filters, ${filterLabel}`}
        aria-expanded={activeSheet === "layers"}
        onClick={() => onOpen("layers")}
      >
        <LayersIcon />
        <span>Filters</span>
        <small>{activeFilterCount}</small>
      </button>
      <button
        type="button"
        aria-label={`View, ${lensLabel}`}
        aria-expanded={activeSheet === "view"}
        onClick={() => onOpen("view")}
      >
        <ViewIcon />
        <span>View</span>
      </button>
      <button
        type="button"
        aria-label={`Year, ${year}`}
        aria-expanded={activeSheet === "year"}
        onClick={() => onOpen("year")}
      >
        <YearIcon />
        <span>Year</span>
        <small>{year}</small>
      </button>
    </nav>
  );
}
