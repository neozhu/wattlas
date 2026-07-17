from grid_scope.connectors.brazil import (
    normalize_aneel_siga,
    normalize_epe_consumption,
    normalize_ons_load,
)


def test_aneel_siga_converts_kw_to_mw_and_preserves_official_id() -> None:
    records = normalize_aneel_siga([{
        "NomEmpreendimento": "Parque Solar Azul",
        "CodCEG": "CEG-123",
        "SigUFPrincipal": "BA",
        "SigTipoGeracao": "UFV",
        "DscFaseUsina": "Operação",
        "MdaPotenciaFiscalizadaKw": "150000,0",
        "NumCoordNEmpreendimento": "-12,5",
        "NumCoordEEmpreendimento": "-41,2",
        "DatEntradaOperacao": "01/06/2025",
    }])

    assert records[0]["capacityMw"]["central"] == 150
    assert records[0]["technology"] == "solar"
    assert records[0]["externalIds"]["aneelCeg"] == "CEG-123"
    assert records[0]["publicationState"] == "publishable"


def test_epe_state_consumption_converts_mwh_to_gwh() -> None:
    rows = normalize_epe_consumption([{
        "UF": "BA", "Ano": "2025", "Mes": "1", "Consumo": "125000,5"
    }])
    assert rows[0]["demandGwh"] == 125.0005
    assert rows[0]["geographyCode"] == "BR-BA"
    assert rows[0]["publicationState"] == "quarantined"


def test_ons_load_is_not_mislabeled_as_energy() -> None:
    rows = normalize_ons_load([{
        "subsistema": "NE", "data": "2026-01-01T12:00:00Z", "carga_mw": "12000.5"
    }])
    assert rows[0]["loadMw"] == 12000.5
    assert "demandGwh" not in rows[0]
