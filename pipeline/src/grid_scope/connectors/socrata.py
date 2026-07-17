from __future__ import annotations

from typing import Any

import httpx

from grid_scope.connectors.http_download import validate_public_http_url


def fetch_socrata_rows(
    client: httpx.Client,
    endpoint: str,
    *,
    page_size: int = 50_000,
    app_token: str | None = None,
    max_rows: int = 2_000_000,
) -> list[dict[str, Any]]:
    validate_public_http_url(endpoint)
    if page_size <= 0 or max_rows <= 0:
        raise ValueError("Socrata paging limits must be positive")
    headers = {"X-App-Token": app_token} if app_token else {}
    rows: list[dict[str, Any]] = []
    offset = 0
    while True:
        response = client.get(
            endpoint,
            params={"$limit": page_size, "$offset": offset, "$order": ":id"},
            headers=headers,
        )
        response.raise_for_status()
        validate_public_http_url(str(response.url))
        page = response.json()
        if not isinstance(page, list) or any(not isinstance(item, dict) for item in page):
            raise ValueError("Socrata response must be a row array")
        rows.extend(page)
        if len(rows) > max_rows:
            raise ValueError("Socrata result exceeds configured row limit")
        if len(page) < page_size:
            return rows
        offset += len(page)

