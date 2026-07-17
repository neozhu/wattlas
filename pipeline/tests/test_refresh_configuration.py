from pathlib import Path


ROOT = Path(__file__).parents[2]


def test_hosted_refresh_runs_monthly_with_manual_dispatch() -> None:
    workflow = (ROOT / ".github" / "workflows" / "refresh-data.yml").read_text()

    assert 'cron: "0 2 1 * *"' in workflow
    assert 'cron: "0 3 1 * *"' in workflow
    assert "workflow_dispatch:" in workflow
    assert "monthly-public-data-refresh" in workflow
    assert "refresh monthly public snapshot" in workflow
    assert "daily-public-data-refresh" not in workflow
    assert "refresh daily public snapshot" not in workflow


def test_example_environment_lists_governed_source_inputs_without_secrets() -> None:
    values = {}
    for line in (ROOT / ".env.example").read_text().splitlines():
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            values[key] = value

    for key in (
        "GEM_AFRICA_ENERGY_TRACKER_PATH",
        "IEA_BUILDING_DEMAND_PATH",
        "SAPP_DATA_PATH",
        "WAEIS_DATA_PATH",
        "CHILE_COORDINADOR_API_KEY",
        "COLOMBIA_IPSE_PATH",
        "PERU_MINEM_PATH",
        "ECUADOR_CENACE_PATH",
        "ARGENTINA_POWER_PATH",
        "OLADE_SIELAC_API_KEY",
    ):
        assert key in values
        assert values[key] == ""
