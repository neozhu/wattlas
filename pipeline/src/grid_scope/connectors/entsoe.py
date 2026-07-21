from __future__ import annotations

import xml.etree.ElementTree as ET

from dataclasses import dataclass
from datetime import UTC, datetime
import json
from pathlib import Path
import re
import time
from typing import Any, Literal, Mapping, Sequence

import httpx

from grid_scope.connectors.base import ConnectorResult, FetchPayload
from grid_scope.models import ConnectorState


EntsoeMetric = Literal["actual_load", "actual_generation_by_type"]
_MAPPING_MODES = {"direct", "composite", "overlapping", "evidence_only"}


def previous_complete_month(now: datetime) -> tuple[datetime, datetime]:
    current = now.astimezone(UTC)
    end = datetime(current.year, current.month, 1, tzinfo=UTC)
    if end.month == 1:
        start = datetime(end.year - 1, 12, 1, tzinfo=UTC)
    else:
        start = datetime(end.year, end.month - 1, 1, tzinfo=UTC)
    return start, end


@dataclass(frozen=True)
class EntsoeQuery:
    area_code: str
    metric: EntsoeMetric
    period_start: datetime
    period_end: datetime

    def parameters(self, token: str) -> dict[str, str]:
        if self.period_start >= self.period_end:
            raise ValueError("ENTSO-E query period must end after it starts")
        document_type, area_parameter = (
            ("A65", "outBiddingZone_Domain")
            if self.metric == "actual_load"
            else ("A75", "in_Domain")
        )
        return {
            "securityToken": token,
            "documentType": document_type,
            "processType": "A16",
            area_parameter: self.area_code,
            "periodStart": self.period_start.astimezone(UTC).strftime("%Y%m%d%H%M"),
            "periodEnd": self.period_end.astimezone(UTC).strftime("%Y%m%d%H%M"),
        }


def load_entsoe_areas(
    path: Path, *, valid_geography_ids: set[str]
) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    areas = payload.get("areas") if isinstance(payload, dict) else None
    if not isinstance(areas, list):
        raise ValueError("ENTSO-E area registry requires an areas array")
    normalized: list[dict] = []
    area_codes: set[str] = set()
    for index, raw in enumerate(areas, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"ENTSO-E area {index} must be an object")
        area_code = str(raw.get("areaCode") or "").strip()
        if not re.fullmatch(r"[A-Z0-9-]{16}", area_code):
            raise ValueError(f"ENTSO-E area {index} has an invalid EIC code")
        if area_code in area_codes:
            raise ValueError(f"duplicate ENTSO-E area code: {area_code}")
        area_codes.add(area_code)
        name = str(raw.get("name") or "").strip()
        countries = raw.get("countries")
        geography_ids = raw.get("geographyIds")
        mapping_mode = raw.get("mappingMode")
        if not name:
            raise ValueError(f"ENTSO-E area {area_code} requires a name")
        if not isinstance(countries, list) or not countries or any(
            re.fullmatch(r"[A-Z]{2}", str(value)) is None for value in countries
        ):
            raise ValueError(f"ENTSO-E area {area_code} has invalid countries")
        if not isinstance(geography_ids, list) or any(
            str(value) not in valid_geography_ids for value in geography_ids
        ):
            raise ValueError(f"ENTSO-E area {area_code} uses an unknown geography ID")
        if mapping_mode not in _MAPPING_MODES:
            raise ValueError(f"ENTSO-E area {area_code} has an invalid mapping mode")
        if mapping_mode == "direct" and len(geography_ids) != 1:
            raise ValueError(f"direct ENTSO-E area {area_code} requires one geography")
        normalized.append({
            "areaCode": area_code,
            "name": name,
            "countries": [str(value) for value in countries],
            "geographyIds": [str(value) for value in geography_ids],
            "mappingMode": mapping_mode,
        })
    return sorted(normalized, key=lambda area: area["areaCode"])


class EntsoeAcknowledgementError(ValueError):
    pass


_PSR_TECHNOLOGY = {
    "B01": "biomass",
    "B02": "coal",
    "B03": "coal",
    "B04": "gas",
    "B05": "coal",
    "B06": "oil",
    "B07": "oil",
    "B08": "other",
    "B09": "geothermal",
    "B10": "hydro",
    "B11": "hydro",
    "B12": "hydro",
    "B13": "other",
    "B14": "nuclear",
    "B15": "other",
    "B16": "solar",
    "B17": "biomass",
    "B18": "wind",
    "B19": "wind",
    "B20": "other",
}


def _tag(node: ET.Element) -> str:
    return node.tag.rsplit("}", 1)[-1]


def _child_text(node: ET.Element, suffix: str) -> str | None:
    found = next((item for item in node.iter() if _tag(item).endswith(suffix)), None)
    if found is None or found.text is None:
        return None
    value = found.text.strip()
    return value or None


def _parse_time(value: str | None, *, label: str) -> datetime:
    if not value:
        raise ValueError(f"ENTSO-E {label} is missing")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ValueError(f"ENTSO-E {label} is invalid") from error
    if parsed.tzinfo is None:
        raise ValueError(f"ENTSO-E {label} requires a timezone")
    return parsed.astimezone(UTC)


def _format_time(value: datetime) -> str:
    return value.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")


def resolution_minutes(value: str) -> int:
    match = re.fullmatch(r"PT(?:(\d+)H)?(?:(\d+)M)?", value)
    if not match:
        raise ValueError(f"unsupported ENTSO-E resolution: {value}")
    minutes = int(match.group(1) or 0) * 60 + int(match.group(2) or 0)
    if minutes <= 0:
        raise ValueError(f"unsupported ENTSO-E resolution: {value}")
    return minutes


def parse_entsoe_document(body: bytes, *, metric: EntsoeMetric) -> list[dict[str, Any]]:
    root = ET.fromstring(body)
    if _tag(root).startswith("Acknowledgement_"):
        code = _child_text(root, "code") or "unknown"
        message = _child_text(root, "text") or "request was not accepted"
        raise EntsoeAcknowledgementError(f"ENTSO-E acknowledgement {code}: {message}")
    document_id = _child_text(root, "mRID") or "unknown"
    revision_text = _child_text(root, "revisionNumber") or "1"
    try:
        revision = int(revision_text)
    except ValueError as error:
        raise ValueError("ENTSO-E revision number is invalid") from error
    records: list[dict[str, Any]] = []
    for series in (node for node in root.iter() if _tag(node) == "TimeSeries"):
        series_id = _child_text(series, "mRID") or "unknown"
        psr_type = _child_text(series, "psrType")
        area_code = (
            _child_text(series, "outBiddingZone_Domain.mRID")
            if metric == "actual_load"
            else _child_text(series, "inBiddingZone_Domain.mRID")
        )
        for period in (node for node in series.iter() if _tag(node) == "Period"):
            start = _parse_time(_child_text(period, "start"), label="period start")
            end = _parse_time(_child_text(period, "end"), label="period end")
            minutes = resolution_minutes(_child_text(period, "resolution") or "")
            expected = int((end - start).total_seconds() // (minutes * 60))
            if expected <= 0:
                raise ValueError("ENTSO-E period must contain at least one interval")
            points: dict[int, float] = {}
            for point in (node for node in period.iter() if _tag(node) == "Point"):
                position_text = _child_text(point, "position")
                quantity_text = _child_text(point, "quantity")
                if position_text is None or quantity_text is None:
                    continue
                position = int(position_text)
                quantity = float(quantity_text)
                if position < 1 or position > expected:
                    raise ValueError("ENTSO-E point position falls outside its period")
                if quantity < 0:
                    raise ValueError("ENTSO-E quantity cannot be negative")
                if position in points:
                    raise ValueError("ENTSO-E period contains a duplicate point position")
                points[position] = quantity
            records.append({
                "documentId": document_id,
                "revision": revision,
                "seriesId": series_id,
                "metric": metric,
                "areaCode": area_code,
                "psrType": psr_type,
                "periodStart": start,
                "periodEnd": end,
                "resolutionMinutes": minutes,
                "expectedPoints": expected,
                "points": points,
            })
    if not records:
        raise ValueError("ENTSO-E market document contains no time series")
    return records


def aggregate_entsoe_area(
    load_body: bytes,
    generation_body: bytes,
    *,
    area: dict[str, Any],
    retrieved_at: str,
) -> dict[str, Any]:
    load_series = parse_entsoe_document(load_body, metric="actual_load")
    generation_series = parse_entsoe_document(
        generation_body, metric="actual_generation_by_type"
    )
    area_code = area["areaCode"]
    if any(series["areaCode"] not in {None, area_code} for series in [*load_series, *generation_series]):
        raise ValueError(f"ENTSO-E response area does not match {area_code}")
    starts = [series["periodStart"] for series in [*load_series, *generation_series]]
    ends = [series["periodEnd"] for series in [*load_series, *generation_series]]
    period_start = min(starts)
    period_end = max(ends)

    load_points = [
        value
        for series in load_series
        for value in series["points"].values()
    ]
    load_observed = sum(len(series["points"]) for series in load_series)
    load_expected = sum(series["expectedPoints"] for series in load_series)
    demand_gwh = sum(
        value * series["resolutionMinutes"] / 60 / 1000
        for series in load_series
        for value in series["points"].values()
    )

    generation_mix: dict[str, float] = {}
    generation_observed = 0
    generation_expected = 0
    for series in generation_series:
        technology = _PSR_TECHNOLOGY.get(series["psrType"] or "", "other")
        energy = sum(series["points"].values()) * series["resolutionMinutes"] / 60 / 1000
        generation_mix[technology] = generation_mix.get(technology, 0.0) + energy
        generation_observed += len(series["points"])
        generation_expected += series["expectedPoints"]

    load_coverage = 100 * load_observed / load_expected
    generation_coverage = 100 * generation_observed / generation_expected
    mapping_eligible = (
        area.get("mappingMode") == "direct"
        and load_coverage >= 90
        and generation_coverage >= 90
    )
    return {
        "id": f"entsoe:{area_code}:{period_start:%Y-%m}",
        "areaCode": area_code,
        "areaName": area["name"],
        "countries": list(area["countries"]),
        "geographyIds": list(area["geographyIds"]),
        "mappingMode": area["mappingMode"],
        "mappingEligible": mapping_eligible,
        "scoreEligible": False,
        "observationMonth": period_start.strftime("%Y-%m"),
        "periodStart": _format_time(period_start),
        "periodEnd": _format_time(period_end),
        "demandGwh": demand_gwh,
        "peakDemandMw": max(load_points),
        "meanDemandMw": sum(load_points) / len(load_points),
        "generationGwh": sum(generation_mix.values()),
        "generationMixGwh": dict(sorted(generation_mix.items())),
        "coverage": {
            "loadPct": load_coverage,
            "generationPct": generation_coverage,
            "loadObservedPoints": load_observed,
            "loadExpectedPoints": load_expected,
            "generationObservedPoints": generation_observed,
            "generationExpectedPoints": generation_expected,
        },
        "sourceIds": ["entsoe"],
        "sourceUrl": "https://transparency.entsoe.eu/",
        "valueKind": "reported",
        "methodId": "entsoe-monthly-aggregate-v1",
        "retrievedAt": retrieved_at,
    }


def parse_entsoe_periods(body: bytes, *, observed_at: str) -> list[dict]:
    """Backward-compatible point features for older grid-context fixtures."""

    records = parse_entsoe_document(body, metric="actual_load")
    features = []
    for series in records:
        for position, quantity in sorted(series["points"].items()):
            properties = {
                "id": f"entsoe-{series['seriesId']}-{position}",
                "sourceOperator": "ENTSO-E",
                "sourceRecordId": f"{series['seriesId']}:{position}",
                "recordType": "congestion",
                "market": "EU",
                "capacityValue": quantity,
                "capacityUnit": "MW",
                "evidenceClass": "reported",
                "confidence": 85,
                "licence": "ENTSO-E Transparency Platform terms",
                "observedAt": observed_at,
                "qualityFlags": ["coordinates_unavailable"],
                "native": {"position": str(position), "start": _format_time(series["periodStart"])},
            }
            features.append({"type": "Feature", "id": properties["id"], "geometry": None, "properties": properties})
    return features


class EntsoeConnector:
    source_id = "entsoe"
    endpoint = "https://web-api.tp.entsoe.eu/api"

    def __init__(
        self,
        token: str | None,
        *,
        retry_delays: tuple[float, ...] = (0.5, 1.5),
    ) -> None:
        self.token = token.strip() if token else None
        self.retry_delays = retry_delays

    def _request(self, client: httpx.Client, query: EntsoeQuery) -> bytes:
        assert self.token is not None
        attempts = len(self.retry_delays) + 1
        for attempt in range(attempts):
            response = client.get(
                self.endpoint,
                params=query.parameters(self.token),
                headers={"User-Agent": "Wattlas/1.0 monthly-public-data-refresh"},
            )
            if response.status_code in {401, 403}:
                raise PermissionError("ENTSO-E authentication failed.")
            if response.status_code == 429 or response.status_code >= 500:
                if attempt < len(self.retry_delays):
                    time.sleep(self.retry_delays[attempt])
                    continue
                raise RuntimeError(
                    f"ENTSO-E request failed after {attempts} attempts "
                    f"with HTTP {response.status_code}."
                )
            if response.status_code >= 400:
                raise RuntimeError(
                    f"ENTSO-E request failed with HTTP {response.status_code}."
                )
            return response.content
        raise RuntimeError("ENTSO-E request retry loop ended unexpectedly.")

    def fetch(
        self,
        client: httpx.Client | None = None,
        *,
        now: datetime,
        areas: Sequence[Mapping[str, Any]] = (),
    ) -> ConnectorResult:
        if not self.token:
            return ConnectorResult(
                source_id=self.source_id,
                state=ConnectorState.NOT_CONFIGURED,
                payload=None,
                message="ENTSO-E security token is not configured.",
            )
        if client is None:
            raise ValueError("an HTTP client is required for configured ENTSO-E access")
        if not areas:
            raise ValueError("configured ENTSO-E access requires at least one area")
        period_start, period_end = previous_complete_month(now)
        retrieved_at = _format_time(now)
        records: list[dict[str, Any]] = []
        area_errors: list[dict[str, str]] = []
        try:
            for area in areas:
                area_code = str(area["areaCode"])
                try:
                    load_body = self._request(
                        client,
                        EntsoeQuery(area_code, "actual_load", period_start, period_end),
                    )
                    # Parse the first response before making the second request so a
                    # zone with no load data does not consume another API call.
                    parse_entsoe_document(load_body, metric="actual_load")
                    generation_body = self._request(
                        client,
                        EntsoeQuery(
                            area_code,
                            "actual_generation_by_type",
                            period_start,
                            period_end,
                        ),
                    )
                    records.append(
                        aggregate_entsoe_area(
                            load_body,
                            generation_body,
                            area=dict(area),
                            retrieved_at=retrieved_at,
                        )
                    )
                except EntsoeAcknowledgementError as error:
                    area_errors.append({
                        "areaCode": area_code,
                        "error": (
                            "no_matching_data"
                            if "no matching data" in str(error).casefold()
                            else "request_rejected"
                        ),
                    })
        except PermissionError:
            return ConnectorResult(
                source_id=self.source_id,
                state=ConnectorState.FAILED,
                payload=None,
                message="ENTSO-E authentication failed.",
            )
        except (ET.ParseError, RuntimeError, ValueError) as error:
            message = re.sub(
                r"(?i)(securityToken(?:=|%3D))[^&\s]+",
                r"\1[REDACTED]",
                str(error),
            ).replace(self.token, "[REDACTED]")
            return ConnectorResult(
                source_id=self.source_id,
                state=ConnectorState.FAILED,
                payload=None,
                message=message[:500],
            )
        body = json.dumps(
            {
                "schemaVersion": "1.0.0",
                "source": self.source_id,
                "retrievedAt": retrieved_at,
                "periodStart": _format_time(period_start),
                "periodEnd": _format_time(period_end),
                "observationMonth": period_start.strftime("%Y-%m"),
                "complete": not area_errors and len(records) == len(areas),
                "areasRequested": len(areas),
                "areaErrors": area_errors,
                "records": records,
            },
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        return ConnectorResult(
            source_id=self.source_id,
            state=(ConnectorState.CURRENT if not area_errors else ConnectorState.STALE),
            payload=FetchPayload(
                source_id=self.source_id,
                retrieved_at=now,
                media_type="application/json",
                body=body,
            ),
            message=(
                None
                if not area_errors
                else f"ENTSO-E returned usable data for {len(records)} of {len(areas)} areas."
            ),
        )
