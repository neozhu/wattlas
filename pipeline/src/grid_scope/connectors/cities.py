from __future__ import annotations

import csv
import io


def _point_feature(properties: dict, lon: float, lat: float) -> dict:
    return {"type": "Feature", "id": properties["id"], "geometry": {"type": "Point", "coordinates": [lon, lat]}, "properties": properties}


def parse_ghsl_cities(body: bytes, *, observed_at: str) -> list[dict]:
    features: list[dict] = []
    for row in csv.DictReader(io.StringIO(body.decode("utf-8-sig"))):
        population = int(float(row.get("GC_POP_TOT_2025") or row.get("population") or 0))
        if population < 1_000_000:
            continue
        coords = (row.get("CTR_MN_NM") or "").split(";")
        lat = float(row.get("lat") or coords[0])
        lon = float(row.get("lon") or coords[1])
        city_id = f"ghsl-{row.get('ID_HDC_G0') or row.get('id')}"
        properties = {"id": city_id, "name": row.get("UC_NM_MN") or row.get("name"), "country": row.get("CNTR_CODE") or row.get("country"), "population": population, "populationYear": 2025, "populationDefinition": "urban_centre", "classes": ["million_plus"], "sourceId": "ghsl_ucdb_r2024a", "observedAt": observed_at}
        features.append(_point_feature(properties, lon, lat))
    return features


def parse_destatis_cities(body: bytes, *, observed_at: str) -> list[dict]:
    features: list[dict] = []
    for row in csv.DictReader(io.StringIO(body.decode("utf-8-sig"))):
        population = int(float(row.get("population") or 0))
        if population < 100_000:
            continue
        city_id = f"destatis-{row['ags']}"
        classes = ["german_large_city"]
        if population >= 1_000_000:
            classes.insert(0, "million_plus")
        properties = {"id": city_id, "name": row["name"], "country": "DE", "population": population, "populationYear": 2024, "populationDefinition": "municipality", "classes": classes, "sourceId": "destatis_gv_isys", "observedAt": observed_at}
        features.append(_point_feature(properties, float(row["lon"]), float(row["lat"])))
    return features
