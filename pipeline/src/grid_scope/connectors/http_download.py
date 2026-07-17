from __future__ import annotations

import ipaddress
from urllib.parse import urlparse

import httpx


def validate_public_http_url(url: str) -> str:
    parsed = urlparse(str(url))
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("source URL must be a public HTTP URL")
    hostname = parsed.hostname.rstrip(".").lower()
    if hostname == "localhost" or hostname.endswith(".localhost"):
        raise ValueError("source URL must be a public HTTP URL")
    try:
        address = ipaddress.ip_address(hostname)
    except ValueError:
        return str(url)
    if not address.is_global:
        raise ValueError("source URL must be a public HTTP URL")
    return str(url)


def fetch_public_bytes(
    client: httpx.Client,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    max_bytes: int = 100 * 1024 * 1024,
) -> tuple[bytes, httpx.Headers]:
    validate_public_http_url(url)
    response = client.get(url, headers=headers)
    response.raise_for_status()
    validate_public_http_url(str(response.url))
    if len(response.content) > max_bytes:
        raise ValueError("source response exceeds configured size limit")
    return response.content, response.headers

