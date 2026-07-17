from __future__ import annotations

from datetime import datetime
import math
from typing import Any

import httpx

from grid_scope.connectors.http_download import validate_public_http_url


PEERINGDB_FACILITY_URL = "https://www.peeringdb.com/api/fac"


def fetch_peeringdb_facilities(
    client: httpx.Client,
    *,
    endpoint: str = PEERINGDB_FACILITY_URL,
    page_size: int = 250,
    api_key: str | None = None,
    max_rows: int = 100_000,
) -> dict[str, list[dict[str, Any]]]:
    validate_public_http_url(endpoint)
    headers = {"Authorization": f"Api-Key {api_key}"} if api_key else {}
    rows: list[dict[str, Any]] = []
    skip = 0
    while True:
        response = client.get(
            endpoint,
            params={"limit": page_size, "skip": skip, "status": "ok"},
            headers=headers,
        )
        response.raise_for_status()
        payload = response.json()
        page = payload.get("data") if isinstance(payload, dict) else None
        if not isinstance(page, list) or any(not isinstance(row, dict) for row in page):
            raise ValueError("PeeringDB response requires a data row array")
        rows.extend(page)
        if len(rows) > max_rows:
            raise ValueError("PeeringDB response exceeds configured row limit")
        if len(page) < page_size:
            return {"data": rows}
        skip += len(page)


def _coordinate(value: Any, *, minimum: float, maximum: float) -> float | None:
    if value is None or isinstance(value, bool):
        return None
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(parsed) or not minimum <= parsed <= maximum:
        return None
    return parsed


def normalize_peeringdb_facilities(
    payload: dict[str, Any],
    *,
    retrieved_at: datetime,
    publication_state: str = "quarantined",
) -> list[dict[str, Any]]:
    rows = payload.get("data")
    if not isinstance(rows, list):
        raise ValueError("PeeringDB payload requires data")
    assets: list[dict[str, Any]] = []
    for row in rows:
        if not isinstance(row, dict) or not row.get("id") or not str(row.get("name", "")).strip():
            continue
        latitude = _coordinate(row.get("latitude"), minimum=-90, maximum=90)
        longitude = _coordinate(row.get("longitude"), minimum=-180, maximum=180)
        if latitude is None or longitude is None:
            continue
        facility_id = str(row["id"]).strip()
        country = str(row.get("country") or "").strip().upper()
        if len(country) != 2:
            continue
        address = {
            "street": str(row.get("address1") or "").strip() or None,
            "city": str(row.get("city") or "").strip() or None,
            "state": str(row.get("state") or "").strip() or None,
            "postcode": str(row.get("zipcode") or "").strip() or None,
            "country": country,
        }
        website = str(row.get("website") or "").strip() or None
        assets.append({
            "id": f"peeringdb-fac-{facility_id}",
            "name": str(row["name"]).strip(),
            "operator": str(row.get("org_name") or "").strip() or None,
            "geographyId": "UNASSIGNED",
            "country": country,
            "category": "data_centre",
            "subtype": "other_data_centre",
            "lifecycle": "operational" if row.get("status") == "ok" else "paused",
            "demandMw": None,
            "coordinates": [longitude, latitude],
            "locationPrecision": "exact",
            "valueKind": "reported",
            "sourceIds": ["peeringdb"],
            "sourceType": "community_mapped",
            "sourceUrl": f"https://www.peeringdb.com/fac/{facility_id}",
            "externalIds": {"peeringdb": f"fac/{facility_id}"},
            "website": website,
            "address": address,
            "lastObservedAt": row.get("updated") or retrieved_at.isoformat(),
            "retrievedAt": retrieved_at.isoformat(),
            "publicationState": publication_state,
            "confidence": 70,
        })
    return sorted(assets, key=lambda asset: asset["id"])

