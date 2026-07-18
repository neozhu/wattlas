from datetime import UTC, datetime
from zipfile import ZipFile

import httpx

from grid_scope.connectors.brazil import (
    AneelSigaConnector,
    load_epe_annual_observations,
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


def test_epe_workbook_aggregates_complete_state_year_without_double_counting(tmp_path) -> None:
    workbook = tmp_path / "epe-consumption.xlsx"
    headers = [
        "Data", "DataExcel", "UF", "Regiao", "Sistema", "Classe",
        "TipoConsumidor", "Consumo", "Consumidores", "DataVersao",
    ]
    rows = []
    for month in range(1, 13):
        class_rows = (
            (("Residencial", "2000"), ("Industrial", "-500"))
            if month == 1
            else (("Residencial", "1000"), ("Industrial", "500"))
        )
        for consumer_class, consumption_mwh in class_rows:
            rows.append([
                f"2025{month:02d}01", "", "BA", "Nordeste", "SIN", consumer_class,
                "Cativo", consumption_mwh, "10", "46192",
            ])
    rows.append(["20260101", "", "BA", "Nordeste", "SIN", "Residencial", "Cativo", "2000", "10", "46192"])

    def row_xml(row_number: int, cells: list[str]) -> str:
        return "<row r=\"{}\">{}</row>".format(
            row_number,
            "".join(
                f'<c r="{chr(65 + index)}{row_number}" t="inlineStr"><is><t>{value}</t></is></c>'
                for index, value in enumerate(cells)
            ),
        )

    worksheet = (
        '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
        + row_xml(1, headers)
        + "".join(row_xml(index, row) for index, row in enumerate(rows, start=2))
        + "</sheetData></worksheet>"
    )
    workbook_xml = """<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
      xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
      <sheets><sheet name="CONSUMO E NUMCONS SAM UF" sheetId="1" r:id="rId1"/></sheets>
    </workbook>"""
    relationships = """<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="worksheet" Target="worksheets/sheet1.xml"/>
    </Relationships>"""
    with ZipFile(workbook, "w") as archive:
        archive.writestr("xl/workbook.xml", workbook_xml)
        archive.writestr("xl/_rels/workbook.xml.rels", relationships)
        archive.writestr("xl/worksheets/sheet1.xml", worksheet)

    observations = load_epe_annual_observations(
        workbook, region_mapping={"BA": "BR-BAHIA"}
    )

    assert len(observations) == 1
    assert observations[0]["geographyId"] == "BR-BAHIA"
    assert observations[0]["year"] == 2025
    assert observations[0]["demandGwh"] == 18
    assert observations[0]["sourceIds"] == ["brazil-epe-consumption"]
    assert observations[0]["licence"] == "CC BY 4.0"
    assert observations[0]["publicationState"] == "publishable"


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
