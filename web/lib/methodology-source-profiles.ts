import type { MethodologySourceRole } from "@/lib/methodology";
import type { SourceDescriptor } from "@/lib/snapshot/types";

export const ALL_SOURCE_CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];

export type MethodologySourceProfile = {
  name?: string;
  publisher: string;
  url?: string;
  categories: SourceDescriptor["categories"];
  continents: string[];
  countries: string[];
  role: MethodologySourceRole;
  notes?: string;
};

const global = ALL_SOURCE_CONTINENTS;

export const METHODOLOGY_SOURCE_PROFILES: Record<string, MethodologySourceProfile> = {
  "meta-richland-parish-2024": { publisher: "Meta", categories: ["digital_infrastructure", "projects", "demand"], continents: ["North America"], countries: ["US"], role: "project_evidence" },
  "aws-saudi-region-2024": { publisher: "Amazon Web Services", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Asia"], countries: ["SA"], role: "project_evidence" },
  "aws-australia-investment-2025": { publisher: "Amazon Web Services", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Oceania"], countries: ["AU"], role: "project_evidence" },
  "google-india-ai-hub-2025": { publisher: "Google", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Asia"], countries: ["IN"], role: "project_evidence" },
  "china-east-data-west-2022": { publisher: "State Council of China", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Asia"], countries: ["CN"], role: "project_evidence" },
  "microsoft-south-africa-2025": { publisher: "Microsoft", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Africa"], countries: ["ZA"], role: "project_evidence" },
  "scala-ai-city-2025": { publisher: "Scala Data Centers", categories: ["digital_infrastructure", "projects", "demand"], continents: ["South America"], countries: ["BR"], role: "project_evidence" },
  "microsoft-uk-investment-2025": { publisher: "Microsoft", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Europe"], countries: ["GB"], role: "project_evidence" },
  "dewa-hassyan-2024": { publisher: "Dubai Electricity and Water Authority", categories: ["projects", "demand"], continents: ["Asia"], countries: ["AE"], role: "project_evidence" },
  "acciona-casablanca-2025": { publisher: "ACCIONA", categories: ["projects", "demand"], continents: ["Africa"], countries: ["MA"], role: "project_evidence" },
  "pub-tuas-2025": { publisher: "PUB Singapore", categories: ["projects", "demand"], continents: ["Asia"], countries: ["SG"], role: "project_evidence" },
  "watercorp-alkimos-2025": { publisher: "Water Corporation", categories: ["projects", "demand"], continents: ["Oceania"], countries: ["AU"], role: "project_evidence" },
  "pure-water-san-diego-2025": { publisher: "City of San Diego", categories: ["projects", "demand"], continents: ["North America"], countries: ["US"], role: "project_evidence" },
  "swpc-seven-year-plan-2025": { publisher: "Saudi Water Partnership Company", categories: ["projects", "demand"], continents: ["Asia"], countries: ["SA"], role: "project_evidence" },
  "equinix-frankfurt-2025": { publisher: "Equinix", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Europe"], countries: ["DE"], role: "project_evidence" },
  "eirgrid-demand-connections": { publisher: "EirGrid", categories: ["grid_context", "demand"], continents: ["Europe"], countries: ["IE"], role: "regional" },
  "amsterdam-congestion": { publisher: "Municipality of Amsterdam", categories: ["grid_context", "demand"], continents: ["Europe"], countries: ["NL"], role: "regional" },
  "london-energy-infrastructure-2025": { publisher: "London Assembly", categories: ["grid_context", "demand"], continents: ["Europe"], countries: ["GB"], role: "regional" },
  "microsoft-madrid-2024": { publisher: "Microsoft", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Europe"], countries: ["ES"], role: "project_evidence" },
  "microsoft-italy-2024": { publisher: "Microsoft", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Europe"], countries: ["IT"], role: "project_evidence" },
  "equinix-europe-xscale": { publisher: "Equinix", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Europe"], countries: [], role: "project_evidence" },
  "stockholm-data-parks": { publisher: "Stockholm Data Parks", categories: ["digital_infrastructure", "projects", "demand"], continents: ["Europe"], countries: ["SE"], role: "project_evidence" },
  "world-bank-electricity": { publisher: "World Bank", categories: ["demand", "national_control"], continents: global, countries: [], role: "demand" },
  "ember-yearly-electricity-data": { publisher: "Ember", categories: ["generation", "demand", "national_control"], continents: global, countries: [], role: "demand" },
  "nrel-atb-2024": { publisher: "National Renewable Energy Laboratory", categories: ["generation"], continents: global, countries: [], role: "supply", notes: "Technology assumptions used only when adequate observed generation is unavailable." },
  openstreetmap: { name: "OpenStreetMap infrastructure", publisher: "OpenStreetMap contributors", url: "https://www.openstreetmap.org/copyright", categories: ["generation", "digital_infrastructure", "projects"], continents: global, countries: [], role: "foundation", notes: "Community mapped facilities are labelled separately from official and research verified records." },
  "worldpop-global2": { name: "WorldPop Global2 population data", publisher: "WorldPop", url: "https://hub.worldpop.org/Global2", categories: ["demand", "electrification"], continents: global, countries: [], role: "foundation", notes: "Population supports regional allocation only where stronger local electricity data is unavailable." },
  "iea-hydrogen-production-2026": { publisher: "International Energy Agency", categories: ["demand", "projects"], continents: global, countries: [], role: "demand" },
  "iea-hydrogen-infrastructure-2026": { publisher: "International Energy Agency", categories: ["grid_context", "projects"], continents: global, countries: [], role: "regional" },
  "gem-global-cement-concrete-2025": { publisher: "Global Energy Monitor", categories: ["demand", "projects"], continents: global, countries: [], role: "demand" },
  "gem-global-steel-plants-2026": { publisher: "Global Energy Monitor", categories: ["demand", "projects"], continents: global, countries: [], role: "demand" },
  "gem-global-steel-units-2026": { publisher: "Global Energy Monitor", categories: ["demand", "projects"], continents: global, countries: [], role: "demand" },
  "gem-global-iron-units-2026": { publisher: "Global Energy Monitor", categories: ["demand", "projects"], continents: global, countries: [], role: "demand" },
};
