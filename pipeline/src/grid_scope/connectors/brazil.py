from __future__ import annotations

import csv
from datetime import date, datetime, timedelta
from io import StringIO
import json
import math
from pathlib import Path
import re
from typing import Any
import unicodedata
from zipfile import BadZipFile, ZipFile

import httpx

from grid_scope.connectors.base import ConnectorResult, FetchPayload
from grid_scope.connectors.gem_power import (
    _shared_strings,
    _workbook_worksheets,
    _worksheet_rows,
)
from grid_scope.models import ConnectorState, PublicationState


ANEEL_SIGA_CSV_URL = (
    "https://dadosabertos.aneel.gov.br/dataset/"
    "6d90b77c-c5f5-4d81-bdec-7bc619494bb9/resource/"
    "11ec447d-698d-4ab8-977f-b424d5deee6a/download/"
    "siga-empreendimentos-geracao.csv"
)


def _decode_aneel_csv(body: bytes) -> str:
    try:
        return body.decode("utf-8-sig")
    except UnicodeDecodeError:
        # The official download currently serves accented Portuguese rows as
        # Windows-1252 on some responses despite previously serving UTF-8.
        return body.decode("cp1252")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _fold(value: Any) -> str:
    return "".join(
        character for character in unicodedata.normalize("NFKD", _text(value))
        if not unicodedata.combining(character)
    ).casefold()


def _number(value: Any) -> float:
    text = _text(value)
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    elif "," in text:
        text = text.replace(",", ".")
    parsed = float(text)
    if not math.isfinite(parsed):
        raise ValueError("Brazil source value must be finite")
    return parsed


def normalize_aneel_siga(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    technologies = {
        "ufv": "solar", "eol": "wind", "uhe": "hydro", "pch": "hydro",
        "cgh": "hydro", "ute": "other", "utn": "nuclear",
    }
    records: list[dict[str, Any]] = []
    for row in rows:
        ceg = _text(row.get("CodCEG"))
        name = _text(row.get("NomEmpreendimento"))
        state = _text(row.get("SigUFPrincipal")).upper()
        if not ceg or not name or len(state) != 2:
            continue
        capacity_kw = row.get("MdaPotenciaFiscalizadaKw") or row.get("MdaPotenciaOutorgadaKw")
        capacity_mw = _number(capacity_kw) / 1000
        latitude = _number(row["NumCoordNEmpreendimento"])
        longitude = _number(row["NumCoordEEmpreendimento"])
        phase = _fold(row.get("DscFaseUsina"))
        lifecycle = (
            "operational" if "operacao" in phase
            else "under_construction" if "construcao" in phase
            else "cancelled" if "revog" in phase
            else "announced"
        )
        date_text = _text(row.get("DatEntradaOperacao"))
        commissioning_year = None
        if date_text:
            for pattern in ("%d/%m/%Y", "%Y-%m-%d"):
                try:
                    commissioning_year = datetime.strptime(date_text, pattern).year
                    break
                except ValueError:
                    continue
        technology_code = _text(row.get("SigTipoGeracao")).casefold()
        records.append({
            "id": f"aneel-siga-{re.sub(r'[^a-z0-9]+', '-', ceg.casefold()).strip('-')}",
            "name": name,
            "category": "power_generation",
            "technology": technologies.get(technology_code, "other"),
            "lifecycle": lifecycle,
            "rawStatus": row.get("DscFaseUsina"),
            "capacityMw": {"low": capacity_mw, "central": capacity_mw, "high": capacity_mw},
            "capacityValueKind": "reported",
            "commissioningYear": commissioning_year,
            "country": "BR",
            "subnationalUnit": state,
            "geographyId": f"BR-{state}",
            "coordinates": [longitude, latitude],
            "locationPrecision": "exact",
            "sourceIds": ["brazil-aneel-siga"],
            "sourceType": "official_verified",
            "sourceUrl": "https://dadosabertos.aneel.gov.br/pt_BR/dataset/siga-sistema-de-informacoes-de-geracao-da-aneel",
            "externalIds": {"aneelCeg": ceg},
            "valueKind": "reported",
            "publicationState": "publishable",
            "transformationHistory": ["capacity_kw_to_mw"],
        })
    return sorted(records, key=lambda record: record["id"])


def normalize_epe_consumption(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        state = _text(row.get("UF")).upper()
        if len(state) != 2:
            continue
        demand_gwh = _number(row.get("Consumo")) / 1000
        records.append({
            "geographyCode": f"BR-{state}",
            "year": int(row["Ano"]),
            "month": int(row["Mes"]),
            "demandGwh": demand_gwh,
            "sourceIds": ["brazil-epe-consumption"],
            "methodId": "epe-state-consumption-v1",
            "valueKind": "observed",
            "publicationState": "quarantined",
            "transformationHistory": ["consumption_mwh_to_gwh"],
        })
    return sorted(records, key=lambda row: (row["geographyCode"], row["year"], row["month"]))


def _excel_date(value: Any) -> date:
    serial = int(float(_text(value)))
    if serial <= 0:
        raise ValueError("EPE data version must be a positive Excel date")
    return date(1899, 12, 30) + timedelta(days=serial)


def _epe_state_rows(path: Path | str) -> list[dict[str, str]]:
    try:
        with ZipFile(Path(path)) as archive:
            shared_strings = _shared_strings(archive)
            worksheets = _workbook_worksheets(archive)
            worksheet_path = next(
                physical_path
                for name, physical_path in worksheets
                if _fold(name) == "consumo e numcons sam uf"
            )
            rows = _worksheet_rows(archive, worksheet_path, shared_strings)
            headers = [value.strip() for value in next(rows)]
            required = {"Data", "UF", "Consumo", "DataVersao"}
            if not required.issubset(headers):
                raise ValueError("EPE state workbook is missing required columns")
            return [
                {
                    header: values[index] if index < len(values) else ""
                    for index, header in enumerate(headers)
                }
                for values in rows
                if any(value.strip() for value in values)
            ]
    except (BadZipFile, StopIteration, IndexError) as error:
        raise ValueError("invalid EPE monthly consumption workbook") from error


def load_epe_annual_observations(
    path: Path | str,
    *,
    region_mapping: dict[str, str],
) -> list[dict[str, Any]]:
    """Aggregate EPE class rows into complete official ADM1 calendar years."""

    groups: dict[tuple[str, int], dict[str, Any]] = {}
    observed_states: set[str] = set()
    for row in _epe_state_rows(path):
        state = _text(row.get("UF")).upper()
        data = _text(row.get("Data"))
        if len(state) != 2 or re.fullmatch(r"\d{8}", data) is None:
            continue
        observed_states.add(state)
        year, month = int(data[:4]), int(data[4:6])
        if not 1 <= month <= 12:
            raise ValueError(f"invalid EPE consumption month: {data}")
        consumption_mwh = _number(row.get("Consumo"))
        key = (state, year)
        group = groups.setdefault(
            key,
            {"months": set(), "demandMwh": 0.0, "updatedAt": date.min},
        )
        group["months"].add(month)
        group["demandMwh"] += consumption_mwh
        group["updatedAt"] = max(group["updatedAt"], _excel_date(row["DataVersao"]))

    unmapped = sorted(observed_states - set(region_mapping))
    if unmapped:
        raise ValueError(f"unmapped EPE state codes: {', '.join(unmapped)}")

    observations: list[dict[str, Any]] = []
    for (state, year), group in sorted(groups.items()):
        if group["months"] != set(range(1, 13)):
            continue
        if group["demandMwh"] < 0:
            raise ValueError(f"EPE annual consumption cannot be negative: {state} {year}")
        observation_date = date(year, 12, 31)
        updated_at = group["updatedAt"]
        observations.append({
            "geographyId": region_mapping[state],
            "geographyLevel": "admin_1",
            "countryIso3": "BRA",
            "year": year,
            "period": "annual",
            "demandGwh": round(group["demandMwh"] / 1000, 6),
            "localGenerationGwh": None,
            "peakDemandMw": None,
            "netInterchangeGwh": None,
            "observedUnmetDemandGwh": None,
            "installedCapacityMw": None,
            "dependableCapacityMw": None,
            "generationMixGwh": {},
            "sourceIds": ["brazil-epe-consumption"],
            "sourceId": "brazil-epe-consumption",
            "sourceRecordId": f"epe-{state}-{year}",
            "sourceType": "official_verified",
            "sourceUrl": (
                "https://www.epe.gov.br/pt/publicacoes-dados-abertos/"
                "publicacoes/consumo-de-energia-eletrica"
            ),
            "licence": "CC BY 4.0",
            "updatedAt": updated_at.isoformat(),
            "observationDate": observation_date.isoformat(),
            "freshnessDays": (updated_at - observation_date).days,
            "valueKind": "observed",
            "methodId": "epe-state-consumption-annual-sum-v1",
            "publicationState": "publishable",
            "unitMetadata": {
                "demandGwh": {"sourceUnit": "MWh", "canonicalUnit": "GWh"}
            },
            "transformationHistory": [
                "sum_consumer_classes_and_market_types",
                "complete_calendar_year_only",
                "consumption_mwh_to_gwh",
            ],
        })
    return observations


def normalize_ons_load(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records = []
    for row in rows:
        subsystem = _text(row.get("subsistema")).upper()
        timestamp = _text(row.get("data"))
        if not subsystem or not timestamp:
            continue
        records.append({
            "subsystem": subsystem,
            "observedAt": timestamp,
            "loadMw": _number(row.get("carga_mw")),
            "sourceIds": ["brazil-ons-load"],
            "valueKind": "observed",
            "publicationState": "quarantined",
        })
    return records


def normalize_epe_webmap(features: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        {
            "sourceRecord": feature,
            "sourceIds": ["brazil-epe-webmap"],
            "publicationState": "quarantined",
        }
        for feature in features
    ]


class AneelSigaConnector:
    source_id = "brazil-aneel-siga"

    def __init__(
        self,
        url: str = ANEEL_SIGA_CSV_URL,
        *,
        minimum_records: int = 100,
    ) -> None:
        self.url = url
        self.minimum_records = minimum_records

    def fetch(
        self, client: httpx.Client, *, now: datetime
    ) -> ConnectorResult:
        response = client.get(self.url)
        response.raise_for_status()
        text = _decode_aneel_csv(response.content)
        sample = text[:8192]
        delimiter = csv.Sniffer().sniff(sample, delimiters=";,\t").delimiter
        rows = list(csv.DictReader(StringIO(text), delimiter=delimiter))
        records = normalize_aneel_siga(rows)
        if len(records) < self.minimum_records:
            raise ValueError(
                f"too few ANEEL SIGA records: {len(records)} < {self.minimum_records}"
            )
        body = json.dumps(
            {"source": self.source_id, "records": records},
            ensure_ascii=False,
            separators=(",", ":"),
        ).encode()
        return ConnectorResult(
            source_id=self.source_id,
            state=ConnectorState.CURRENT,
            payload=FetchPayload(
                source_id=self.source_id,
                retrieved_at=now,
                media_type="application/json",
                body=body,
            ),
            publication_state=PublicationState.PUBLISHABLE,
        )
