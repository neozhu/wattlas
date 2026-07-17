from __future__ import annotations

from typing import Any

import httpx

from grid_scope.connectors.http_download import validate_public_http_url


def fetch_arcgis_features(
    client: httpx.Client,
    layer_url: str,
    *,
    page_size: int = 2_000,
    max_features: int = 2_000_000,
) -> list[dict[str, Any]]:
    validate_public_http_url(layer_url)
    if page_size <= 0:
        raise ValueError("ArcGIS page size must be positive")
    endpoint = layer_url.rstrip("/") + "/query"
    features: list[dict[str, Any]] = []
    offset = 0
    while True:
        response = client.get(
            endpoint,
            params={
                "where": "1=1",
                "outFields": "*",
                "returnGeometry": "true",
                "f": "json",
                "resultOffset": offset,
                "resultRecordCount": page_size,
            },
        )
        response.raise_for_status()
        validate_public_http_url(str(response.url))
        payload = response.json()
        if not isinstance(payload, dict) or payload.get("error"):
            raise ValueError("ArcGIS response is invalid")
        page = payload.get("features")
        if not isinstance(page, list) or any(not isinstance(item, dict) for item in page):
            raise ValueError("ArcGIS response has no feature array")
        features.extend(page)
        if len(features) > max_features:
            raise ValueError("ArcGIS result exceeds configured feature limit")
        if not payload.get("exceededTransferLimit") or not page:
            return features
        offset += len(page)

