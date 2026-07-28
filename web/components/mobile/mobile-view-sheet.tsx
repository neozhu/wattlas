"use client";

import { MobileSheet } from "@/components/mobile/mobile-sheet";
import type { LensKey } from "@/lib/snapshot/types";

const views: Array<{ id: LensKey; label: string; description: string }> = [
  { id: "infrastructureDemand", label: "Infrastructure Demand", description: "Where new infrastructure is likely to increase electricity demand." },
  { id: "siteAttractiveness", label: "Site Attractiveness", description: "How practical a location appears for new development." },
  { id: "systemRisk", label: "System Risk", description: "Where grid constraints or fast demand growth may increase risk." },
  { id: "powerBalance", label: "Power Balance", description: "Demand compared with dependable local generation." },
];

type Props = {
  open: boolean;
  activeLens: LensKey;
  onChange: (lens: LensKey) => void;
  onClose: () => void;
};

export function MobileViewSheet({ open, activeLens, onChange, onClose }: Props) {
  return (
    <MobileSheet id="map-view" title="Choose map view" open={open} size="compact" onClose={onClose}>
      <div className="mobile-view-list">
        {views.map((view, index) => (
          <button
            key={view.id}
            type="button"
            className={activeLens === view.id ? "active" : ""}
            aria-label={view.label}
            aria-pressed={activeLens === view.id}
            onClick={() => { onChange(view.id); onClose(); }}
          >
            <span>0{index + 1}</span>
            <strong>{view.label}</strong>
            <small>{view.description}</small>
          </button>
        ))}
      </div>
    </MobileSheet>
  );
}
