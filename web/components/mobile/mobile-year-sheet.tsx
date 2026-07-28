"use client";

import { MobileSheet } from "@/components/mobile/mobile-sheet";

type Props = {
  open: boolean;
  years: number[];
  activeYear: number;
  onChange: (year: number) => void;
  onClose: () => void;
};

export function MobileYearSheet({ open, years, activeYear, onChange, onClose }: Props) {
  return (
    <MobileSheet id="analysis-year" title="Choose analysis year" open={open} size="compact" onClose={onClose}>
      <div className="mobile-year-grid">
        {years.map((year) => (
          <button
            key={year}
            type="button"
            className={year === activeYear ? "active" : ""}
            aria-label={String(year)}
            aria-pressed={year === activeYear}
            onClick={() => { onChange(year); onClose(); }}
          >
            {year}
          </button>
        ))}
      </div>
      <p className="mobile-year-note">Scores update for the selected year. Source records retain their own publication dates.</p>
    </MobileSheet>
  );
}
