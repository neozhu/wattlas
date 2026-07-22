import { ALL_SOURCE_CONTINENTS, METHODOLOGY_SOURCE_PROFILES } from "@/lib/methodology-source-profiles";
import type { EvidenceSource, SourceDescriptor } from "@/lib/snapshot/types";

export type MethodologySourceRole = "supply" | "demand" | "regional" | "foundation" | "project_evidence";
export type MethodologySource = Omit<SourceDescriptor, "accessMode" | "publicationState" | "refreshCadence" | "licenceDecidedAt" | "requiredEnv" | "manualPathEnv"> & {
  accessMode: SourceDescriptor["accessMode"] | "public_reference";
  publicationState: SourceDescriptor["publicationState"] | "evidence_reference";
  refreshCadence: SourceDescriptor["refreshCadence"] | "source_release";
  role: MethodologySourceRole;
  useState: "record_contributor" | "evidence_reference" | "registered_option" | "quarantined";
  tier: EvidenceSource["tier"] | null;
};

export type SourceFilters = {
  continent: string;
  country: string;
  category: string;
  publicationState: string;
  role: string;
};

const SOURCE_ID_ALIASES: Record<string, string> = {
  "gem-gipt": "gem-global-integrated-power-tracker",
  "gem_power": "gem-global-integrated-power-tracker",
  "openstreetmap-infrastructure": "openstreetmap",
  "openstreetmap-power": "openstreetmap",
  "osm_power": "openstreetmap",
};

function sourceFamilyId(id: string): string {
  if (id.startsWith("worldpop-global2-")) return "worldpop-global2";
  return SOURCE_ID_ALIASES[id] ?? id;
}

function inferredRole(source: SourceDescriptor): MethodologySourceRole {
  if (source.categories.includes("generation")) return "supply";
  if (source.categories.includes("demand")) return "demand";
  if (source.categories.includes("digital_infrastructure") || source.categories.includes("projects")) return "project_evidence";
  if (source.categories.includes("electrification") || source.categories.includes("source_catalogue")) return "foundation";
  return "regional";
}

export function buildMethodologySourceLibrary({
  catalogSources,
  evidenceSources,
  publishedRecordsBySource = {},
}: {
  catalogSources: SourceDescriptor[];
  evidenceSources: EvidenceSource[];
  publishedRecordsBySource?: Record<string, number>;
}): MethodologySource[] {
  const evidenceByFamily = new Map<string, EvidenceSource[]>();
  for (const source of evidenceSources) {
    const id = sourceFamilyId(source.id);
    evidenceByFamily.set(id, [...(evidenceByFamily.get(id) ?? []), source]);
  }
  const publishedByFamily = new Map<string, number>();
  for (const [id, count] of Object.entries(publishedRecordsBySource)) {
    const family = sourceFamilyId(id);
    publishedByFamily.set(family, (publishedByFamily.get(family) ?? 0) + count);
  }
  const catalogByFamily = new Map(catalogSources.map((source) => [sourceFamilyId(source.id), source]));
  const familyIds = new Set([...catalogByFamily.keys(), ...evidenceByFamily.keys()]);
  const sources: MethodologySource[] = [];

  for (const id of familyIds) {
    const governed = catalogByFamily.get(id);
    const evidenceGroup = evidenceByFamily.get(id) ?? [];
    const evidence = evidenceGroup[0];
    const profile = METHODOLOGY_SOURCE_PROFILES[id];
    if (!governed && !evidence) continue;
    const globalProfile = profile?.continents === ALL_SOURCE_CONTINENTS || profile?.continents?.length === ALL_SOURCE_CONTINENTS.length;
    const continents = profile?.continents?.length
      ? [...profile.continents]
      : governed?.continents.length
        ? [...governed.continents]
        : globalProfile ? [...ALL_SOURCE_CONTINENTS] : [];
    const categories = profile?.categories?.length ? [...profile.categories] : governed?.categories ?? ["projects"];
    const recordCount = publishedByFamily.get(id) ?? 0;
    const publicationState = governed?.publicationState ?? "evidence_reference";
    const useState = recordCount > 0
      ? "record_contributor"
      : publicationState === "quarantined"
        ? "quarantined"
        : evidenceGroup.length
          ? "evidence_reference"
          : "registered_option";
    sources.push({
      id,
      name: profile?.name ?? governed?.name ?? evidence!.name,
      publisher: governed?.publisher ?? profile?.publisher ?? "Public source",
      url: profile?.url ?? governed?.url ?? evidence!.url,
      categories,
      continents,
      countries: profile?.countries?.length ? [...profile.countries] : governed?.countries ?? [],
      accessMode: governed?.accessMode ?? "public_reference",
      publicationState,
      refreshCadence: governed?.refreshCadence ?? "source_release",
      licence: governed?.licence ?? evidence?.licence ?? null,
      licenceUrl: governed?.licenceUrl ?? evidence?.licenceUrl ?? null,
      notes: governed?.notes ?? profile?.notes ?? null,
      role: profile?.role ?? (governed ? inferredRole(governed) : "project_evidence"),
      useState,
      tier: evidence?.tier ?? null,
    });
  }
  const order: Record<MethodologySource["useState"], number> = { record_contributor: 0, evidence_reference: 1, registered_option: 2, quarantined: 3 };
  return sources.sort((left, right) => order[left.useState] - order[right.useState]
    || left.role.localeCompare(right.role)
    || left.publisher.localeCompare(right.publisher)
    || left.name.localeCompare(right.name));
}

export function filterSources(
  sources: MethodologySource[],
  filters: SourceFilters,
): MethodologySource[] {
  return sources.filter((source) =>
    (!filters.continent || source.continents.includes(filters.continent))
    && (!filters.country || source.countries.includes(filters.country))
    && (!filters.category || source.categories.includes(filters.category as MethodologySource["categories"][number]))
    && (!filters.publicationState || source.publicationState === filters.publicationState)
    && (!filters.role || source.role === filters.role)
  );
}

export function labelToken(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
