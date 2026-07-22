import { labelToken, type MethodologySource } from "@/lib/methodology";

const USE_STATE_LABELS: Record<MethodologySource["useState"], string> = {
  record_contributor: "Contributes current records",
  evidence_reference: "Evidence or model reference",
  registered_option: "Registered source option",
  quarantined: "Not used in public results",
};

function displayText(value: string): string {
  return value.replaceAll("—", ",").replaceAll("–", " to ");
}

export function SourceCatalogTable({ sources }: { sources: MethodologySource[] }) {
  if (!sources.length) return <p role="status">No sources match these filters.</p>;
  return (
    <div className="source-catalog-list">
      {sources.map((source) => (
        <article className="source-catalog-card" key={source.id}>
          <header>
            <div>
              <span className={`source-state ${source.useState}`}>{USE_STATE_LABELS[source.useState]}</span>
              <h3>{displayText(source.name)}</h3>
              <p>{source.publisher}</p>
            </div>
            <a href={source.url} target="_blank" rel="noreferrer">Open source ↗</a>
          </header>
          <dl>
            <div><dt>Role</dt><dd>{labelToken(source.role)}</dd></div>
            <div><dt>Access</dt><dd>{labelToken(source.accessMode)}</dd></div>
            <div><dt>Refresh</dt><dd>{labelToken(source.refreshCadence)}</dd></div>
            <div><dt>Coverage</dt><dd>{[...source.continents, ...source.countries].join(", ") || "Project or source specific"}</dd></div>
            <div><dt>Categories</dt><dd>{source.categories.map(labelToken).join(", ")}</dd></div>
            <div><dt>Licence</dt><dd>{source.licenceUrl ? <a href={source.licenceUrl} target="_blank" rel="noreferrer">{source.licence}</a> : source.licence ?? "Reference link only"}</dd></div>
          </dl>
          {source.notes ? <p className="source-note">{displayText(source.notes)}</p> : null}
        </article>
      ))}
    </div>
  );
}
