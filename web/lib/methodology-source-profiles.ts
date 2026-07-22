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

export const METHODOLOGY_ADDITIONAL_REFERENCE_IDS = [
  "eia-861",
  "ferc-714",
  "statistics-canada-electricity",
  "cer-energy-future-2026",
  "cea-lgbr-2026-27",
  "entsoe-tyndp-2024",
  "aemo-operational-demand",
  "occto-demand-forecasts",
  "iea-building-demand-model",
] as const;

const global = ALL_SOURCE_CONTINENTS;

export const METHODOLOGY_SOURCE_PROFILES: Record<string, MethodologySourceProfile> = {
  "eia-861": { name: "EIA Form 861", publisher: "U.S. Energy Information Administration", url: "https://www.eia.gov/electricity/data/eia861/", categories: ["demand", "grid_context"], continents: ["North America"], countries: ["US"], role: "demand", notes: "State, sector, balancing authority, customer, demand response, and service territory data." },
  "ferc-714": { name: "FERC Form 714", publisher: "Federal Energy Regulatory Commission", url: "https://www.ferc.gov/industries-data/electric/general-information/electric-industry-forms/form-no-714-annual-electric/overview", categories: ["demand", "grid_context"], continents: ["North America"], countries: ["US"], role: "demand", notes: "Planning area load and demand forecasts." },
  "statistics-canada-electricity": { name: "Statistics Canada electricity supply and disposition", publisher: "Statistics Canada", url: "https://www150.statcan.gc.ca/n1/en/catalogue/2510002101", categories: ["generation", "demand"], continents: ["North America"], countries: ["CA"], role: "demand", notes: "Provincial electricity supply and disposition." },
  "cer-energy-future-2026": { name: "Canada Energy Future 2026", publisher: "Canada Energy Regulator", url: "https://www.cer-rec.gc.ca/en/data-analysis/canada-energy-future/2026/access-and-explore-energy-future-data.html", categories: ["generation", "demand"], continents: ["North America"], countries: ["CA"], role: "demand", notes: "Provincial and territorial energy scenarios through 2050." },
  "cea-lgbr-2026-27": { name: "Load Generation Balance Report 2026 to 2027", publisher: "Central Electricity Authority", url: "https://cea.nic.in/l-g-b-r-report/?lang=en", categories: ["generation", "demand"], continents: ["Asia"], countries: ["IN"], role: "demand", notes: "Official state and regional energy and peak balance forecasts for India." },
  "entsoe-tyndp-2024": { name: "ENTSO E TYNDP 2024", publisher: "ENTSO E", url: "https://www.entsoe.eu/outlooks/tyndp/2024/", categories: ["generation", "demand", "grid_context"], continents: ["Europe"], countries: [], role: "demand", notes: "European bidding zone demand and supply scenarios used where stronger local evidence is available." },
  "aemo-operational-demand": { name: "AEMO operational demand", publisher: "Australian Energy Market Operator", url: "https://aemo.com.au/energy-systems/electricity/national-electricity-market-nem/data-nem/operational-demand-data", categories: ["demand", "grid_context"], continents: ["Oceania"], countries: ["AU"], role: "demand", notes: "Regional actual demand, probabilistic forecasts, and long term scenario traces." },
  "occto-demand-forecasts": { name: "OCCTO demand forecasts", publisher: "Organization for Cross-regional Coordination of Transmission Operators", url: "https://www.occto.or.jp/en/works/no10.html", categories: ["demand", "grid_context"], continents: ["Asia"], countries: ["JP"], role: "demand", notes: "Ten year electricity demand forecasts for each Japanese supply area." },
  "iea-building-demand-model": { name: "IEA building level electricity access and demand model", publisher: "International Energy Agency and MIT", url: "https://www.iea.org/data-and-statistics/data-product/building-level-electricity-access-and-demand-model", categories: ["demand", "electrification"], continents: ["Africa"], countries: ["GH", "SN", "UG"], role: "demand", notes: "Modelled building level electricity access and demand estimates for Ghana, Senegal, and Uganda under CC BY 4.0." },
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
