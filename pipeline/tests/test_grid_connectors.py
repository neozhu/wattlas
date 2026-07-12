from grid_scope.connectors.entsoe import parse_entsoe_periods
from grid_scope.connectors.neso import parse_neso_congestion, parse_neso_tec


def test_neso_tec_preserves_gate_and_status() -> None:
    body = b"project_id,project,connection_site,connected_mw,status,gate,lat,lon\nTEC-1,North Wind,Creyke Beck,500,Contracted,Gate 2,53.8,-0.4\n"
    records = parse_neso_tec(body, observed_at="2026-07-12T00:00:00Z")
    assert records[0]["properties"]["recordType"] == "connection_queue"
    assert records[0]["properties"]["native"]["gate"] == "Gate 2"


def test_neso_congestion_is_not_a_queue() -> None:
    body = b"boundary_id,boundary,limit_mw,lat,lon\nB6,Scotland England,6200,55,-2\n"
    records = parse_neso_congestion(body, observed_at="2026-07-12T00:00:00Z")
    assert records[0]["properties"]["recordType"] == "congestion"


def test_entsoe_parses_units_and_period_points() -> None:
    xml = b'''<Publication_MarketDocument xmlns="urn:iec62325.351:tc57wg16:451-3:publicationdocument:7:0"><mRID>doc-1</mRID><TimeSeries><mRID>ts-1</mRID><businessType>A53</businessType><quantity_Measure_Unit.name>MAW</quantity_Measure_Unit.name><Period><timeInterval><start>2026-07-12T00:00Z</start></timeInterval><Point><position>1</position><quantity>245</quantity></Point></Period></TimeSeries></Publication_MarketDocument>'''
    records = parse_entsoe_periods(xml, observed_at="2026-07-12T00:00:00Z")
    assert records[0]["properties"]["capacityValue"] == 245
    assert records[0]["properties"]["capacityUnit"] == "MW"
