from pathlib import Path

from openpyxl import Workbook

from grid_scope.industrial_demand import (
    parse_hydrogen_infrastructure,
    parse_hydrogen_production,
)


ISO3_TO_ISO2 = {"DEU": "DE", "NLD": "NL", "AUS": "AU"}


def _production_workbook(path: Path) -> None:
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = "Hydrogen production projects"
    sheet.append(["Technology"])
    sheet.append([
        "Reference", "Project name", "Country\n(ISO-3)", "Date online",
        "Decomission date", "Status", "Technology", "Technology details",
        "Type of electricity (for electrolysis projects)",
        "If dedicated renewables, type of renewable", "Product",
        "Announced Size", "Capacity (MWel)", "Capacity (Nm³ H₂/h)",
        "Capacity\n(kt H2/y)", "Location", "Latitude", "Longitude",
    ])
    sheet.append([
        "H2-1", "Alpha Hydrogen", "DEU", 2029, None, "Feasibility study",
        "PEM", "PEM electrolysis", "Grid+Renewables", None, "H2", "80 MW", 80,
        None, None, "Bavaria", 48.1, 11.6,
    ])
    sheet.append([
        "H2-2", "Wind Hydrogen", "NLD", "2030", None, "Concept",
        "Other Electrolysis", "Alkaline", "Dedicated renewable", "Offshore wind",
        "H2", "100 MW", 100, None, None, "Rotterdam", 51.9, 4.5,
    ])
    sheet.append([
        "H2-3", "Unknown-size Hydrogen", "AUS", "2028", None, "FID/Construction",
        "ALK", "Alkaline", "Grid", None, "H2", "TBC", None, None, 20,
        "Gladstone", -23.8, 151.25,
    ])
    workbook.save(path)


def _infrastructure_workbook(path: Path) -> None:
    workbook = Workbook()
    pipeline = workbook.active
    pipeline.title = "H2 TRANSMISSION (pipe)"
    pipeline.append([
        "Ref", "Project name", "Country_1 (ISO)", "Country_2 (ISO)", "Partners",
        "Announced project date", "Announced start date", "Construction start date",
        "Date online", "Decomission date", "Repurposed_new", "Status",
        "Pipeline_type", "Announced Size", "Capacity_MWel", "Capacity_nm³ H₂/h",
        "Capacity_kt H2/y", "Length_km",
    ])
    pipeline.append([
        "PiP-001", "Alpha Backbone", "DEU", "NLD", "GridCo", None, 2028, None,
        2028, None, "New", "Feasibility study", "Onshore", "10 GW", 10_000,
        None, None, 420,
    ])

    blending = workbook.create_sheet("H2 BLENDING")
    blending.append([
        "Ref", "Project name", "Country (ISO)", "Partners", "Announced project date",
        "Announced start date", "Date online", "Decomission date", "Status",
        "H2_blending (vol)", "Announced Size", "Capacity_MWel", "Capacity_nm³ H₂/h",
        "Capacity_kt H2/y", "Length_km", "Pressure_bar", "Investment costs_MUSD",
        "Location",
    ])
    blending.append([
        "BLE-1", "Community Blend", "AUS", "GasCo", None, 2027, 2027, None,
        "FID/Construction", 0.1, "1.25 MW electrolyser", 1.25, None, None, None,
        None, 15, "Tonsley",
    ])
    workbook.save(path)


def test_hydrogen_production_normalizes_status_location_and_grid_evidence(tmp_path: Path) -> None:
    path = tmp_path / "production.xlsx"
    _production_workbook(path)

    assets = parse_hydrogen_production(path, iso3_to_iso2=ISO3_TO_ISO2)
    by_id = {asset["id"]: asset for asset in assets}

    alpha = by_id["iea-h2-production-h2-1"]
    assert alpha["country"] == "DE"
    assert alpha["lifecycle"] == "pre_construction"
    assert alpha["targetYear"] == 2029
    assert alpha["coordinates"] == [11.6, 48.1]
    assert alpha["reportedCapacity"] == 80
    assert alpha["reportedCapacityUnit"] == "MWel"
    assert alpha["gridConnectionType"] == "grid_plus_renewables"
    assert alpha["gridDemandEligible"] is True
    assert alpha["sourceRecordIds"] == ["H2-1"]

    dedicated = by_id["iea-h2-production-h2-2"]
    assert dedicated["gridConnectionType"] == "dedicated_renewable"
    assert dedicated["gridDemandEligible"] is False

    missing = by_id["iea-h2-production-h2-3"]
    assert missing["lifecycle"] == "under_construction"
    assert missing["reportedCapacity"] is None
    assert missing["gridDemandEligible"] is False
    assert missing["coordinates"] == [151.25, -23.8]


def test_hydrogen_infrastructure_is_context_only_even_with_mwel(tmp_path: Path) -> None:
    path = tmp_path / "infrastructure.xlsx"
    _infrastructure_workbook(path)

    assets = parse_hydrogen_infrastructure(path, iso3_to_iso2=ISO3_TO_ISO2)
    by_id = {asset["id"]: asset for asset in assets}

    pipeline = by_id["iea-h2-network-pip-001"]
    assert pipeline["category"] == "hydrogen_infrastructure"
    assert pipeline["subtype"] == "hydrogen_pipeline"
    assert pipeline["country"] == "DE"
    assert pipeline["secondaryCountries"] == ["NL"]
    assert pipeline["reportedCapacity"] == 10_000
    assert pipeline["reportedCapacityUnit"] == "MWel"
    assert pipeline["annualDemandGwh"] is None
    assert pipeline["gridDemandContribution"] is False

    blend = by_id["iea-h2-network-ble-1"]
    assert blend["subtype"] == "hydrogen_blending"
    assert blend["locationName"] == "Tonsley"
    assert blend["annualDemandGwh"] is None
    assert blend["gridDemandContribution"] is False
