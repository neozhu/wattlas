from grid_scope.connectors.africa_regional import normalize_regional_electricity_rows


def test_eskom_keeps_demand_and_generation_as_separate_observations() -> None:
    rows = normalize_regional_electricity_rows([{
        "region_id": "ZA-GP",
        "year": 2025,
        "demand_gwh": 45000,
        "generation_gwh": 39000,
    }], source_id="eskom", publication_state="quarantined")

    assert rows[0]["demandGwh"] == 45000
    assert rows[0]["generationGwh"] == 39000
    assert rows[0]["demandGwh"] != rows[0]["generationGwh"]
    assert rows[0]["publicationState"] == "quarantined"


def test_sapp_and_waeis_records_remain_quarantined() -> None:
    for source_id in ("sapp", "ecowas-waeis"):
        rows = normalize_regional_electricity_rows([{
            "region_id": "POOL",
            "year": 2025,
            "demand_gwh": 100,
            "generation_gwh": 90,
        }], source_id=source_id, publication_state="quarantined")
        assert rows[0]["sourceIds"] == [source_id]
        assert rows[0]["publicationState"] == "quarantined"
