from datetime import UTC, datetime
import json
from pathlib import Path

import pytest

from grid_scope.connectors import entsoe
from grid_scope.connectors.neso import parse_neso_congestion, parse_neso_tec


FIXTURES = Path(__file__).parents[2] / "data" / "fixtures"


def test_neso_tec_preserves_gate_and_status() -> None:
    body = b"project_id,project,connection_site,connected_mw,status,gate,lat,lon\nTEC-1,North Wind,Creyke Beck,500,Contracted,Gate 2,53.8,-0.4\n"
    records = parse_neso_tec(body, observed_at="2026-07-12T00:00:00Z")
    assert records[0]["properties"]["recordType"] == "connection_queue"
    assert records[0]["properties"]["native"]["gate"] == "Gate 2"


def test_neso_congestion_is_not_a_queue() -> None:
    body = b"boundary_id,boundary,limit_mw,lat,lon\nB6,Scotland England,6200,55,-2\n"
    records = parse_neso_congestion(body, observed_at="2026-07-12T00:00:00Z")
    assert records[0]["properties"]["recordType"] == "congestion"


def test_previous_complete_month_handles_year_boundary() -> None:
    start, end = entsoe.previous_complete_month(datetime(2026, 1, 15, tzinfo=UTC))

    assert start == datetime(2025, 12, 1, tzinfo=UTC)
    assert end == datetime(2026, 1, 1, tzinfo=UTC)


def test_entsoe_query_uses_document_specific_area_parameter() -> None:
    start = datetime(2026, 6, 1, tzinfo=UTC)
    end = datetime(2026, 7, 1, tzinfo=UTC)

    load = entsoe.EntsoeQuery("10YBE----------2", "actual_load", start, end)
    generation = entsoe.EntsoeQuery(
        "10YBE----------2", "actual_generation_by_type", start, end
    )

    assert load.parameters("secret") == {
        "securityToken": "secret",
        "documentType": "A65",
        "processType": "A16",
        "outBiddingZone_Domain": "10YBE----------2",
        "periodStart": "202606010000",
        "periodEnd": "202607010000",
    }
    assert generation.parameters("secret") == {
        "securityToken": "secret",
        "documentType": "A75",
        "processType": "A16",
        "in_Domain": "10YBE----------2",
        "periodStart": "202606010000",
        "periodEnd": "202607010000",
    }
    assert "secret" not in repr(load)


def test_entsoe_area_registry_validates_mapping_and_geographies(tmp_path) -> None:
    path = tmp_path / "areas.json"
    path.write_text(json.dumps({
        "schemaVersion": "1.0.0",
        "areas": [{
            "areaCode": "10YBE----------2",
            "name": "Belgium",
            "countries": ["BE"],
            "geographyIds": ["BE"],
            "mappingMode": "direct",
        }],
    }))

    areas = entsoe.load_entsoe_areas(path, valid_geography_ids={"BE"})

    assert areas[0]["areaCode"] == "10YBE----------2"


def test_entsoe_area_registry_rejects_duplicate_codes(tmp_path) -> None:
    area = {
        "areaCode": "10YBE----------2",
        "name": "Belgium",
        "countries": ["BE"],
        "geographyIds": ["BE"],
        "mappingMode": "direct",
    }
    path = tmp_path / "areas.json"
    path.write_text(json.dumps({"schemaVersion": "1.0.0", "areas": [area, area]}))

    with pytest.raises(ValueError, match="duplicate ENTSO-E area code"):
        entsoe.load_entsoe_areas(path, valid_geography_ids={"BE"})


def test_entsoe_aggregates_resolution_aware_load_and_generation() -> None:
    area = {
        "areaCode": "10YBE----------2",
        "name": "Belgium",
        "countries": ["BE"],
        "geographyIds": ["BE"],
        "mappingMode": "direct",
    }

    record = entsoe.aggregate_entsoe_area(
        (FIXTURES / "entsoe-actual-load.xml").read_bytes(),
        (FIXTURES / "entsoe-generation-by-type.xml").read_bytes(),
        area=area,
        retrieved_at="2026-07-21T08:00:00Z",
    )

    assert record["periodStart"] == "2026-06-01T00:00:00Z"
    assert record["periodEnd"] == "2026-06-01T04:00:00Z"
    assert record["demandGwh"] == pytest.approx(0.4)
    assert record["peakDemandMw"] == 200
    assert record["meanDemandMw"] == pytest.approx(400 / 3)
    assert record["generationGwh"] == pytest.approx(0.4)
    assert record["generationMixGwh"] == pytest.approx({"gas": 0.26, "solar": 0.14})
    assert record["coverage"]["loadPct"] == 75
    assert record["coverage"]["generationPct"] == 100
    assert record["mappingMode"] == "direct"
    assert record["scoreEligible"] is False


def test_entsoe_acknowledgement_is_not_parsed_as_empty_success() -> None:
    with pytest.raises(entsoe.EntsoeAcknowledgementError, match="No matching data"):
        entsoe.parse_entsoe_document(
            (FIXTURES / "entsoe-acknowledgement.xml").read_bytes(),
            metric="actual_load",
        )


@pytest.mark.parametrize(
    ("resolution", "minutes"),
    [("PT15M", 15), ("PT30M", 30), ("PT60M", 60)],
)
def test_entsoe_resolution_minutes(resolution: str, minutes: int) -> None:
    assert entsoe.resolution_minutes(resolution) == minutes
