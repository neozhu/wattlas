from __future__ import annotations

from collections.abc import Iterable, Mapping
from datetime import date, datetime
from pathlib import Path
import math
import re
import unicodedata
from typing import Any

from openpyxl import load_workbook


HYDROGEN_PRODUCTION_SOURCE_ID = "iea-hydrogen-production-2026"
HYDROGEN_INFRASTRUCTURE_SOURCE_ID = "iea-hydrogen-infrastructure-2026"


def _key(value: object) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", "_", text.casefold()).strip("_")


def _slug(value: object) -> str:
    return _key(value).replace("_", "-") or "unknown"


def _text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.casefold() in {"n/a", "na", "none", "unknown", "tbc", "-"}:
        return None
    return text


def _number(value: object) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        number = float(value)
    else:
        text = str(value).replace(",", "").strip()
        match = re.search(r"[-+]?\d+(?:\.\d+)?", text)
        if match is None:
            return None
        number = float(match.group())
    if not math.isfinite(number) or number < 0:
        return None
    return number


def _capacity_mwel(value: object) -> float | None:
    number = _number(value)
    if number is None:
        return None
    text = str(value).casefold()
    if "gw" in text and "gwh" not in text:
        number *= 1_000
    elif "kw" in text and "kwh" not in text:
        number /= 1_000
    return round(number, 6)


def _year(value: object) -> int | None:
    if isinstance(value, (date, datetime)):
        return value.year
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        year = int(value)
        return year if 1900 <= year <= 2100 else None
    match = re.search(r"(?:19|20)\d{2}", str(value or ""))
    if match is None:
        return None
    return int(match.group())


def _country(value: object, mapping: Mapping[str, str]) -> str | None:
    code = (_text(value) or "").upper()
    if len(code) == 2:
        return code
    return mapping.get(code)


def _coordinate(value: object, *, latitude: bool) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        match = re.search(r"[-+]?\d+(?:\.\d+)?", str(value).replace(",", "."))
        if match is None:
            return None
        number = float(match.group())
    if not math.isfinite(number):
        return None
    maximum = 90 if latitude else 180
    return number if -maximum <= number <= maximum else None


def _lifecycle(value: object) -> str:
    status = _key(value)
    if not status:
        return "unknown"
    if any(token in status for token in ("decomm", "retired")):
        return "decommissioned"
    if any(token in status for token in ("cancel", "removed")):
        return "cancelled"
    if any(token in status for token in ("dormant", "on_hold", "paused", "mothball", "shelved")):
        return "paused"
    if any(token in status for token in ("operational", "operating")):
        return "operational"
    if any(token in status for token in ("fid", "construction", "under_construction")):
        return "under_construction"
    if any(token in status for token in ("feasibility", "feed", "permit", "planning", "pre_construction")):
        return "pre_construction"
    if any(token in status for token in ("concept", "announced", "demo")):
        return "announced"
    return "unknown"


def _grid_connection(value: object) -> str:
    electricity = _key(value)
    if electricity in {"grid_renewables", "grid_plus_renewables"} or (
        "grid" in electricity and "renew" in electricity
    ):
        return "grid_plus_renewables"
    if "dedicated" in electricity and "renew" in electricity:
        return "dedicated_renewable"
    if "nuclear" in electricity:
        return "nuclear"
    if electricity == "grid" or electricity.startswith("grid_"):
        return "grid"
    return "other_or_unknown"


def _is_electrolysis(technology: object) -> bool:
    text = _key(technology)
    return any(token in text for token in ("electrolysis", "pem", "alk", "soec", "aem"))


def _records(path: Path, sheet_name: str, *, header_row: int) -> Iterable[dict[str, Any]]:
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = workbook[sheet_name]
        header_values = next(
            sheet.iter_rows(min_row=header_row, max_row=header_row, values_only=True)
        )
        headers = [_key(value) if value is not None else "" for value in header_values]
        for values in sheet.iter_rows(min_row=header_row + 1, values_only=True):
            record = {
                header: value
                for header, value in zip(headers, values, strict=False)
                if header and value is not None
            }
            if record:
                yield record
    finally:
        workbook.close()


def _pick(record: Mapping[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in record:
            return record[key]
    return None


def parse_hydrogen_production(
    path: Path, *, iso3_to_iso2: Mapping[str, str]
) -> list[dict[str, Any]]:
    assets: list[dict[str, Any]] = []
    for row in _records(path, "Hydrogen production projects", header_row=2):
        reference = _text(_pick(row, "reference"))
        name = _text(_pick(row, "project_name"))
        country = _country(_pick(row, "country_iso_3"), iso3_to_iso2)
        if reference is None or name is None or country is None:
            continue
        capacity = _capacity_mwel(_pick(row, "capacity_mwel"))
        grid_connection = _grid_connection(
            _pick(row, "type_of_electricity_for_electrolysis_projects")
        )
        technology = _text(_pick(row, "technology"))
        latitude = _coordinate(_pick(row, "latitude"), latitude=True)
        longitude = _coordinate(_pick(row, "longitude"), latitude=False)
        year = _year(_pick(row, "date_online"))
        status = _text(_pick(row, "status"))
        assets.append(
            {
                "id": f"iea-h2-production-{_slug(reference)}",
                "name": name,
                "geographyId": "",
                "country": country,
                "category": "industrial_load",
                "subtype": "hydrogen_production",
                "lifecycle": _lifecycle(status),
                "rawStatus": status,
                "targetYear": year if year is not None and 2026 <= year <= 2031 else None,
                "coordinates": [longitude, latitude]
                if longitude is not None and latitude is not None
                else None,
                "locationName": _text(_pick(row, "location")),
                "locationPrecision": "exact"
                if longitude is not None and latitude is not None
                else "city_centroid",
                "reportedCapacity": capacity,
                "reportedCapacityUnit": "MWel" if capacity is not None else None,
                "gridConnectionType": grid_connection,
                "gridDemandEligible": bool(
                    capacity is not None
                    and grid_connection in {"grid", "grid_plus_renewables"}
                    and _is_electrolysis(technology)
                ),
                "gridDemandContribution": False,
                "annualDemandGwh": None,
                "technologyDetail": _text(_pick(row, "technology_details")) or technology,
                "operator": None,
                "demandMw": None,
                "valueKind": "reported",
                "sourceType": "research_verified",
                "sourceIds": [HYDROGEN_PRODUCTION_SOURCE_ID],
                "sourceRecordIds": [reference],
                "externalIds": {"ieaHydrogenReference": reference},
                "confidence": 84 if capacity is not None else 72,
            }
        )
    return sorted(assets, key=lambda asset: asset["id"])


def _network_subtype(sheet_name: str, row: Mapping[str, Any]) -> str:
    if sheet_name == "H2 TRANSMISSION (pipe)":
        return "hydrogen_pipeline"
    if sheet_name == "H2 BLENDING":
        return "hydrogen_blending"
    if sheet_name == "UNDERGROUND H2 STORAGE":
        return "hydrogen_storage"
    trade = _key(_pick(row, "trade", "import_export_bunkering"))
    if "export" in trade and "import" not in trade:
        return "hydrogen_export_terminal"
    return "hydrogen_import_terminal"


def parse_hydrogen_infrastructure(
    path: Path, *, iso3_to_iso2: Mapping[str, str]
) -> list[dict[str, Any]]:
    workbook = load_workbook(path, read_only=True, data_only=True)
    sheet_names = set(workbook.sheetnames)
    workbook.close()
    supported = (
        "H2 TRANSMISSION (pipe)",
        "H2 BLENDING",
        "UNDERGROUND H2 STORAGE",
        "NH3 INFRASTRUCTURE AT PORTS",
        "NH3 CRACKING PLANTS",
        "H2 INFRASTRUCTURE AT PORTS",
        "MeOH INFRASTRUCTURE AT PORTS",
    )
    assets: list[dict[str, Any]] = []
    for sheet_name in supported:
        if sheet_name not in sheet_names:
            continue
        for row in _records(path, sheet_name, header_row=1):
            reference = _text(_pick(row, "ref", "reference"))
            name = _text(_pick(row, "project_name"))
            country = _country(
                _pick(row, "country_1_iso", "country_iso"), iso3_to_iso2
            )
            if reference is None or name is None or country is None:
                continue
            secondary_country = _country(_pick(row, "country_2_iso"), iso3_to_iso2)
            status = _text(_pick(row, "status", "availability"))
            year = _year(_pick(row, "date_online", "announced_start_date"))
            capacity = _capacity_mwel(
                _pick(row, "capacity_mwel", "injection_capacity_mwel")
            )
            location = _text(_pick(row, "location", "port"))
            assets.append(
                {
                    "id": f"iea-h2-network-{_slug(reference)}",
                    "name": name,
                    "geographyId": "",
                    "country": country,
                    "secondaryCountries": [secondary_country]
                    if secondary_country and secondary_country != country
                    else [],
                    "category": "hydrogen_infrastructure",
                    "subtype": _network_subtype(sheet_name, row),
                    "lifecycle": _lifecycle(status),
                    "rawStatus": status,
                    "targetYear": year if year is not None and 2026 <= year <= 2031 else None,
                    "coordinates": None,
                    "locationName": location,
                    "locationPrecision": "city_centroid",
                    "reportedCapacity": capacity,
                    "reportedCapacityUnit": "MWel" if capacity is not None else None,
                    "gridConnectionType": None,
                    "gridDemandEligible": False,
                    "gridDemandContribution": False,
                    "annualDemandGwh": None,
                    "technologyDetail": _text(
                        _pick(row, "technology", "pipeline_type", "repurposed_new")
                    ),
                    "operator": _text(_pick(row, "partners", "participants")),
                    "demandMw": None,
                    "valueKind": "reported",
                    "sourceType": "research_verified",
                    "sourceIds": [HYDROGEN_INFRASTRUCTURE_SOURCE_ID],
                    "sourceRecordIds": [reference],
                    "externalIds": {"ieaHydrogenInfrastructureReference": reference},
                    "confidence": 78 if location else 68,
                }
            )
    return sorted(assets, key=lambda asset: asset["id"])
