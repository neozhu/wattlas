import json

import httpx
import pytest

from grid_scope.connectors.arcgis import fetch_arcgis_features
from grid_scope.connectors.ckan import select_ckan_resource
from grid_scope.connectors.http_download import validate_public_http_url
from grid_scope.connectors.socrata import fetch_socrata_rows
from grid_scope.connectors.tabular import parse_tabular_bytes


def test_public_url_validator_rejects_private_and_local_hosts() -> None:
    for url in (
        "http://127.0.0.1/data",
        "http://localhost/data",
        "http://10.1.2.3/data",
        "http://169.254.169.254/latest/meta-data",
        "file:///tmp/data.csv",
    ):
        with pytest.raises(ValueError, match="public HTTP"):
            validate_public_http_url(url)

    assert validate_public_http_url("https://data.example.org/file.csv") == (
        "https://data.example.org/file.csv"
    )


def test_ckan_selects_active_resource_by_format() -> None:
    resource = select_ckan_resource({
        "result": {"resources": [
            {"id": "old", "format": "CSV", "state": "deleted", "url": "https://example.org/old.csv"},
            {"id": "json", "format": "JSON", "state": "active", "url": "https://example.org/data.json"},
            {"id": "csv", "format": "CSV", "state": "active", "url": "https://example.org/data.csv"},
        ]},
    }, preferred_formats=("CSV",))

    assert resource["id"] == "csv"


def test_socrata_pages_with_optional_app_token() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        offset = int(request.url.params["$offset"])
        rows = [{"id": offset + index} for index in range(2 if offset == 0 else 1)]
        return httpx.Response(200, json=rows, request=request)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        rows = fetch_socrata_rows(
            client,
            "https://data.example.org/resource/abcd.json",
            page_size=2,
            app_token="token-value",
        )

    assert [row["id"] for row in rows] == [0, 1, 2]
    assert requests[0].headers["X-App-Token"] == "token-value"
    assert requests[1].url.params["$offset"] == "2"


def test_arcgis_pages_until_transfer_limit_clears() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        offset = int(request.url.params["resultOffset"])
        payload = {
            "features": [{"attributes": {"id": offset + 1}}],
            "exceededTransferLimit": offset == 0,
        }
        return httpx.Response(200, json=payload, request=request)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        features = fetch_arcgis_features(
            client,
            "https://services.example.org/FeatureServer/0",
            page_size=1,
        )

    assert [feature["attributes"]["id"] for feature in features] == [1, 2]


def test_tabular_parser_supports_csv_and_json() -> None:
    assert parse_tabular_bytes(
        b"name,capacity\nAlpha,100\n", media_type="text/csv"
    ) == [{"name": "Alpha", "capacity": "100"}]
    assert parse_tabular_bytes(
        json.dumps({"records": [{"name": "Beta"}]}).encode(),
        media_type="application/json",
    ) == [{"name": "Beta"}]
