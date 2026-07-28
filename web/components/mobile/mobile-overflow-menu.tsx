"use client";

import { useState } from "react";

type Props = {
  mode: "radar" | "explorer";
  onModeChange?: (mode: "radar" | "explorer") => void;
  onOpenStatus: () => void;
};

export function MobileOverflowMenu({ mode, onModeChange, onOpenStatus }: Props) {
  const [open, setOpen] = useState(false);
  const chooseMode = (next: "radar" | "explorer") => {
    onModeChange?.(next);
    setOpen(false);
  };
  return (
    <div className="mobile-overflow">
      <button
        className="mobile-overflow-trigger"
        type="button"
        aria-label={open ? "Close mobile navigation" : "Open mobile navigation"}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true">•••</span>
      </button>
      {open && (
        <nav className="mobile-overflow-menu" aria-label="Mobile navigation">
          <button type="button" aria-pressed={mode === "radar"} onClick={() => chooseMode("radar")}>Opportunity Radar</button>
          <button type="button" aria-pressed={mode === "explorer"} onClick={() => chooseMode("explorer")}>Asset Explorer</button>
          <a href="/methodology" aria-label="Methodology and sources">Methodology &amp; Sources</a>
          <button type="button" onClick={() => { onOpenStatus(); setOpen(false); }}>Data refresh details</button>
        </nav>
      )}
    </div>
  );
}
