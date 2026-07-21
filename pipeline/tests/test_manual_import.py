from datetime import date
from hashlib import sha256
from pathlib import Path

import pytest

from grid_scope.manual_import import GovernedCaptureStores, import_source_snapshot
from grid_scope import cli
from grid_scope.source_catalog import load_source_catalog
from grid_scope.storage import RawCaptureStore


PROJECT_ROOT = Path(__file__).resolve().parents[2]


def stores(tmp_path: Path) -> GovernedCaptureStores:
    return GovernedCaptureStores(
        public=RawCaptureStore(tmp_path / "raw", tmp_path / "public.duckdb"),
        quarantine=RawCaptureStore(
            tmp_path / "quarantine", tmp_path / "quarantine.duckdb"
        ),
    )


def test_manual_import_rejects_checksum_mismatch(tmp_path: Path) -> None:
    source_path = tmp_path / "gem.csv"
    source_path.write_bytes(b"facility,capacity\nAlpha,100\n")
    catalog = load_source_catalog(
        PROJECT_ROOT / "data" / "curated" / "source-catalog.json"
    )

    with pytest.raises(ValueError, match="checksum"):
        import_source_snapshot(
            catalog=catalog,
            source_id="gem-africa-energy-tracker",
            input_path=source_path,
            expected_checksum="0" * 64,
            observation_date=date(2026, 3, 1),
            stores=stores(tmp_path),
            source_version="2026-03",
        )


def test_publishable_manual_import_is_public_and_versioned(tmp_path: Path) -> None:
    source_path = tmp_path / "gem.csv"
    body = b"facility,capacity\nAlpha,100\n"
    source_path.write_bytes(body)
    catalog = load_source_catalog(
        PROJECT_ROOT / "data" / "curated" / "source-catalog.json"
    )
    governed = stores(tmp_path)

    result = import_source_snapshot(
        catalog=catalog,
        source_id="gem-africa-energy-tracker",
        input_path=source_path,
        expected_checksum=sha256(body).hexdigest(),
        observation_date=date(2026, 3, 1),
        stores=governed,
        source_version="2026-03",
    )

    assert result.publication_state == "publishable"
    assert result.source_version == "2026-03"
    assert result.observation_date == date(2026, 3, 1)
    assert governed.public.latest_capture("gem-africa-energy-tracker") is not None
    assert governed.quarantine.latest_capture("gem-africa-energy-tracker") is None
    metadata = governed.public.latest_import("gem-africa-energy-tracker")
    assert metadata is not None
    assert metadata.observation_date == date(2026, 3, 1)


def test_industrial_workbook_import_is_public_and_versioned(tmp_path: Path) -> None:
    source_path = tmp_path / "hydrogen.xlsx"
    body = b"PK\x03\x04synthetic-workbook"
    source_path.write_bytes(body)
    catalog = load_source_catalog(
        PROJECT_ROOT / "data" / "curated" / "source-catalog.json"
    )
    governed = stores(tmp_path)

    result = import_source_snapshot(
        catalog=catalog,
        source_id="iea-hydrogen-production-2026",
        input_path=source_path,
        expected_checksum=sha256(body).hexdigest(),
        observation_date=date(2026, 6, 18),
        stores=governed,
        source_version="2026-06",
    )

    assert result.publication_state == "publishable"
    assert result.capture.media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    assert governed.public.latest_capture("iea-hydrogen-production-2026") is not None
    assert governed.quarantine.latest_capture("iea-hydrogen-production-2026") is None


def test_quarantined_manual_import_is_physically_isolated(tmp_path: Path) -> None:
    source_path = tmp_path / "sapp.csv"
    body = b"region,demand\nSAPP,1\n"
    source_path.write_bytes(body)
    catalog = load_source_catalog(
        PROJECT_ROOT / "data" / "curated" / "source-catalog.json"
    )
    governed = stores(tmp_path)

    result = import_source_snapshot(
        catalog=catalog,
        source_id="sapp",
        input_path=source_path,
        expected_checksum=sha256(body).hexdigest(),
        observation_date=date(2026, 6, 1),
        stores=governed,
        source_version="2026-Q2",
    )

    assert result.publication_state == "quarantined"
    assert governed.public.latest_capture("sapp") is None
    capture = governed.quarantine.latest_capture("sapp")
    assert capture is not None
    assert tmp_path / "quarantine" in capture.path.parents


def test_cli_import_source_reports_metadata_without_payload(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, capsys: pytest.CaptureFixture[str]
) -> None:
    source_path = tmp_path / "sapp-secret.csv"
    body = b"sensitive-evaluation-record"
    source_path.write_bytes(body)
    monkeypatch.setattr(cli, "RAW_DIR", tmp_path / "raw")
    monkeypatch.setattr(cli, "WAREHOUSE_PATH", tmp_path / "public.duckdb")
    monkeypatch.setattr(cli, "QUARANTINE_DIR", tmp_path / "quarantine")
    monkeypatch.setattr(
        cli, "QUARANTINE_WAREHOUSE_PATH", tmp_path / "quarantine.duckdb"
    )

    assert cli.main([
        "import-source",
        "--source-id", "sapp",
        "--file", str(source_path),
        "--sha256", sha256(body).hexdigest(),
        "--observation-date", "2026-06-01",
        "--source-version", "2026-Q2",
    ]) == 0

    output = capsys.readouterr().out
    assert "sapp" in output
    assert "quarantined" in output
    assert body.decode() not in output
