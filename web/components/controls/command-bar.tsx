import { type ReactNode } from "react";

import { formatSnapshotTime } from "@/lib/format";
import type { SnapshotManifest } from "@/lib/snapshot/types";
import { WattlasBrand } from "@/components/branding/wattlas-brand";
import { MobileOverflowMenu } from "@/components/mobile/mobile-overflow-menu";

type Props = {
  manifest: SnapshotManifest;
  onOpenStatus: () => void;
  mode?: "radar" | "explorer";
  onModeChange?: (mode: "radar" | "explorer") => void;
  searchSlot?: ReactNode;
};

export function CommandBar({ manifest, onOpenStatus, mode = "radar", onModeChange, searchSlot }: Props) {
  return (
    <header className="command-bar">
      <WattlasBrand />
      <div className="command-context">
        <nav className="mode-switch" aria-label="Wattlas workspace">
          <button type="button" aria-pressed={mode === "radar"} onClick={() => onModeChange?.("radar")}>Opportunity Radar</button>
          <button type="button" aria-pressed={mode === "explorer"} onClick={() => onModeChange?.("explorer")}>Asset Explorer</button>
        </nav>
        {mode === "explorer" && <span className="mode-summary">{manifest.coverage.assets.toLocaleString()} published facilities</span>}
        <a className="methodology-link" href="/methodology" aria-label="Methodology and sources">Methodology &amp; Sources</a>
      </div>
      {searchSlot && <div className="command-search">{searchSlot}</div>}
      <button className="freshness-control" onClick={onOpenStatus} type="button">
        <span className="freshness-dot" aria-hidden="true" />
        <span>
          <strong>Monthly refreshed</strong>
          <small>{formatSnapshotTime(manifest.generatedAt)}</small>
        </span>
      </button>
      <MobileOverflowMenu mode={mode} onModeChange={onModeChange} onOpenStatus={onOpenStatus} />
    </header>
  );
}
