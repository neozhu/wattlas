from grid_scope.connectors.cities import parse_destatis_cities, parse_ghsl_cities


def test_ghsl_filters_to_million_plus() -> None:
    rows = "ID_HDC_G0,UC_NM_MN,CNTR_CODE,CTR_MN_NM,GC_POP_TOT_2025\n1,Berlin,DE,52.52;13.405,4100000\n2,Leipzig,DE,51.34;12.37,650000\n"
    cities = parse_ghsl_cities(rows.encode(), observed_at="2025-07-31T00:00:00Z")
    assert [city["properties"]["name"] for city in cities] == ["Berlin"]
    assert cities[0]["properties"]["classes"] == ["million_plus"]


def test_destatis_filters_german_large_cities() -> None:
    rows = "ags,name,population,lat,lon\n11000000,Berlin,3755251,52.52,13.405\n14713000,Leipzig,628718,51.34,12.37\n99999999,Smalltown,99999,50,10\n"
    cities = parse_destatis_cities(rows.encode(), observed_at="2024-12-31T00:00:00Z")
    assert len(cities) == 2
    assert cities[0]["properties"]["populationDefinition"] == "municipality"
    assert "german_large_city" in cities[0]["properties"]["classes"]
