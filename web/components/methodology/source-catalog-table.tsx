import { labelToken } from "@/lib/methodology";
import type { SourceDescriptor } from "@/lib/snapshot/types";

export function SourceCatalogTable({ sources }: { sources: SourceDescriptor[] }) {
  if (!sources.length) return <p role="status">No sources match these filters.</p>;
  return (
    <div className="source-catalog-list">
      {sources.map((source) => (
        <article className="source-catalog-card" key={source.id}>
          <header>
            <div>
              <span className={"source-state " + source.publicationState}>{source.publicationState === "publishable" ? "Eligible for publication" : labelToken(source.publicationState)}</span>
              <h3>{source.name}</h3>
              <p>{source.publisher}</p>
            </div>
            <a href={source.url} target="_blank" rel="noreferrer">Source ↗</a>
          </header>
          <dl>
            <div><dt>Access</dt><dd>{labelToken(source.accessMode)}</dd></div>
            <div><dt>Refresh</dt><dd>{labelToken(source.refreshCadence)}</dd></div>
            <div><dt>Coverage</dt><dd>{[...source.continents, ...source.countries].join(", ") || "Global"}</dd></div>
            <div><dt>Categories</dt><dd>{source.categories.map(labelToken).join(", ")}</dd></div>
            <div><dt>Licence</dt><dd>{source.licenceUrl ? <a href={source.licenceUrl} target="_blank" rel="noreferrer">{source.licence}</a> : "Pending confirmation"}</dd></div>
          </dl>
          {source.notes ? <p className="source-note">{source.notes}</p> : null}
        </article>
      ))}
    </div>
  );
}
