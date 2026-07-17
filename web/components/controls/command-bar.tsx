import { connectorLabel, formatSnapshotTime } from "@/lib/format";
import type { SnapshotManifest } from "@/lib/snapshot/types";
import { WattlasBrand } from "@/components/branding/wattlas-brand";

type Props = {
  manifest: SnapshotManifest;
  onOpenStatus: () => void;
};

export function CommandBar({ manifest, onOpenStatus }: Props) {
  const unavailable = manifest.connectors.filter(
    (connector) => connector.state === "failed" || connector.state === "not_configured",
  );

  return (
    <header className="command-bar">
      <WattlasBrand />
      <div className="command-context">
        <span>Global</span>
        <span className="command-divider" />
        <span>Opportunity Radar</span>
        <a className="methodology-link" href="/methodology" aria-label="Methodology and sources">Methodology &amp; Sources</a>
      </div>
      <button className="freshness-control" onClick={onOpenStatus} type="button">
        <span className="freshness-dot" aria-hidden="true" />
        <span>
          <strong>Monthly refreshed</strong>
          <small>{formatSnapshotTime(manifest.generatedAt)}</small>
        </span>
        {unavailable.length > 0 && (
          <span className="source-count" title={unavailable.map((item) => connectorLabel(item.id)).join(", ")} aria-label={`${unavailable.length} data ${unavailable.length === 1 ? "source needs" : "sources need"} attention`}>
            <span className="source-count-dot" aria-hidden="true" />
            {unavailable.length} {unavailable.length === 1 ? "source" : "sources"} need attention
          </span>
        )}
      </button>
    </header>
  );
}
