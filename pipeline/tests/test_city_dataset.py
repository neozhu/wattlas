import json
from pathlib import Path


def test_curated_city_layer_has_global_and_german_threshold_coverage() -> None:
    path = Path(__file__).parents[2] / "data" / "curated" / "cities.json"
    features = json.loads(path.read_text())["features"]
    million = [feature for feature in features if "million_plus" in feature["properties"]["classes"]]
    german = [feature for feature in features if "german_large_city" in feature["properties"]["classes"]]
    assert len(million) >= 490
    assert len(german) >= 80
    assert next(feature for feature in million if feature["properties"]["name"] == "Jamshedpur")["geometry"]["coordinates"] == [86.195573, 22.789481]
    assert all(feature["properties"]["population"] >= 1_000_000 for feature in million)
    assert all(feature["properties"]["population"] >= 100_000 for feature in german)
