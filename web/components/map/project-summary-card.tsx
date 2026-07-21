import type { AssetFeature, GeneratorFeature } from "@/lib/snapshot/types";

type Props = { asset?: AssetFeature | null; generator?: GeneratorFeature | null };

const humanize = (value: string) => value.replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const number = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
const safeHttpUrl = (value: unknown) => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
};

function FullDossierLink({ url }: { url: string | null }) {
  return url
    ? <a href={url} target="_blank" rel="noreferrer" aria-label="Open full dossier">Full dossier <span aria-hidden="true">→</span></a>
    : <a href="#wattlas-dossier" aria-label="Open full dossier">Full dossier <span aria-hidden="true">→</span></a>;
}

export function ProjectSummaryCard({ asset, generator }: Props) {
  if (!asset && !generator) return null;
  if (generator) {
    const properties = generator.properties;
    const generatorName = properties.name || properties.id;
    const dossierUrl = safeHttpUrl(properties.gemWikiUrl)
      ?? safeHttpUrl(properties.sourceUrl)
      ?? `https://www.gem.wiki/Special:Search?search=${encodeURIComponent(generatorName)}`;
    return (
      <section className="project-summary-card" aria-label="Selected project summary">
        <div><small>Power generator · {properties.country}</small><strong>{generatorName}</strong></div>
        <dl><div><dt>Technology</dt><dd>{properties.technologies.map(humanize).join(", ")}</dd></div><div><dt>Capacity</dt><dd>{number(properties.capacityMw)} MW</dd></div><div><dt>Status</dt><dd>{properties.lifecycle ? humanize(properties.lifecycle) : "Unavailable"}</dd></div></dl>
        <FullDossierLink url={dossierUrl} />
      </section>
    );
  }
  const properties = asset!.properties;
  const dossierUrl = safeHttpUrl(properties.projectUrl) ?? safeHttpUrl(properties.sourceUrl);
  const category = properties.category === "industrial_load" ? "Industrial demand" : properties.category === "hydrogen_infrastructure" ? "Hydrogen network" : humanize(properties.category);
  const primaryValue = properties.reportedCapacity != null && properties.reportedCapacityUnit
    ? `${number(properties.reportedCapacity)} ${properties.reportedCapacityUnit}`
    : properties.demandMw
      ? `${number(properties.demandMw.central)} MW demand`
      : "Capacity unavailable";
  return (
    <section className="project-summary-card" aria-label="Selected project summary">
      <div><small>{category} · {properties.country}</small><strong>{properties.name}</strong></div>
      <dl><div><dt>Type</dt><dd>{properties.subtype ? humanize(properties.subtype) : category}</dd></div><div><dt>Capacity / demand</dt><dd>{primaryValue}</dd></div><div><dt>Status</dt><dd>{humanize(properties.lifecycle)}</dd></div><div><dt>Year</dt><dd>{properties.targetYear ?? "—"}</dd></div></dl>
      <FullDossierLink url={dossierUrl} />
    </section>
  );
}
