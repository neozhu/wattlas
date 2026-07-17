from __future__ import annotations

from datetime import datetime
import math
import re
from typing import Any
import unicodedata


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

