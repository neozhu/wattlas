from datetime import UTC, datetime

import httpx

from grid_scope.connectors.peeringdb import (
    fetch_peeringdb_facilities,
    normalize_peeringdb_facilities,
)


def test_peeringdb_normalization_preserves_identity_without_inventing_mw() -> None:
    assets = normalize_peeringdb_facilities({"data": [{
        "id": 101,
        "name": "Lagos Carrier Hotel",
        "org_name": "Example Networks",
        "website": "https://facility.example/",
        "address1": "1 Fibre Road",
        "city": "Lagos",
        "state": "Lagos",
        "zipcode": "100001",
        "country": "NG",
        "latitude": 6.45,
        "longitude": 3.39,
        "status": "ok",
        "updated": "2026-06-30T12:00:00Z",
    }]}, retrieved_at=datetime(2026, 7, 17, tzinfo=UTC))

    assert len(assets) == 1
    asset = assets[0]
    assert asset["id"] == "peeringdb-fac-101"
    assert asset["name"] == "Lagos Carrier Hotel"
    assert asset["demandMw"] is None
    assert "capacityMw" not in asset
    assert asset["externalIds"] == {"peeringdb": "fac/101"}
    assert asset["address"]["state"] == "Lagos"
    assert asset["coordinates"] == [3.39, 6.45]


def test_peeringdb_fetch_pages_without_exposing_credentials() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        skip = int(request.url.params["skip"])
        rows = [{"id": 1}, {"id": 2}] if skip == 0 else [{"id": 3}]
        return httpx.Response(200, json={"data": rows}, request=request)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        payload = fetch_peeringdb_facilities(
            client, page_size=2, api_key="private-key"
        )

    assert [row["id"] for row in payload["data"]] == [1, 2, 3]
    assert requests[0].headers["Authorization"] == "Api-Key private-key"
    assert "private-key" not in str(requests[0].url)
