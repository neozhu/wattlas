from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from grid_scope.connectors.http_download import validate_public_http_url


def select_ckan_resource(
    package_payload: dict[str, Any],
    *,
    preferred_formats: Iterable[str],
) -> dict[str, Any]:
    result = package_payload.get("result")
    resources = result.get("resources") if isinstance(result, dict) else None
    if not isinstance(resources, list):
        raise ValueError("CKAN package response has no resources")
    priorities = [value.strip().upper() for value in preferred_formats]
    for preferred in priorities:
        for resource in resources:
            if not isinstance(resource, dict) or resource.get("state", "active") != "active":
                continue
            if str(resource.get("format", "")).strip().upper() != preferred:
                continue
            validate_public_http_url(str(resource.get("url", "")))
            return resource
    raise ValueError("CKAN package has no active preferred resource")

