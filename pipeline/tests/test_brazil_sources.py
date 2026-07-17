from datetime import UTC, datetime

import httpx

from grid_scope.connectors.brazil import (
    AneelSigaConnector,
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


def test_aneel_connector_publishes_normalized_json_capture() -> None:
    csv_body = (
        "NomEmpreendimento;CodCEG;SigUFPrincipal;SigTipoGeracao;"
        "DscFaseUsina;MdaPotenciaFiscalizadaKw;"
        "NumCoordNEmpreendimento;NumCoordEEmpreendimento\n"
        "Parque Solar Azul;CEG-123;BA;UFV;Operação;150000,0;-12,5;-41,2\n"
    ).encode()

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=csv_body, request=request)

    with httpx.Client(transport=httpx.MockTransport(handler)) as client:
        result = AneelSigaConnector(minimum_records=1).fetch(
            client, now=datetime(2026, 7, 17, tzinfo=UTC)
        )

    assert result.payload is not None
    assert b'brazil-aneel-siga' in result.payload.body
    assert b'"central":150.0' in result.payload.body
