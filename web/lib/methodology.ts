import type { SourceDescriptor } from "@/lib/snapshot/types";

export type SourceFilters = {
  continent: string;
  country: string;
  category: string;
  publicationState: string;
};

export function filterSources(
  sources: SourceDescriptor[],
  filters: SourceFilters,
): SourceDescriptor[] {
  return sources.filter((source) =>
    (!filters.continent || source.continents.includes(filters.continent))
    && (!filters.country || source.countries.includes(filters.country))
    && (!filters.category || source.categories.includes(filters.category as SourceDescriptor["categories"][number]))
    && (!filters.publicationState || source.publicationState === filters.publicationState)
  );
}

export function labelToken(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

