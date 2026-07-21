# ENTSO-E Monthly Demand and Generation Integration

Date: 2026-07-21
Status: Approved

## Outcome

Wattlas will use the ENTSO-E Transparency Platform as a credential-backed monthly source for observed European electricity demand and generation. The integration will improve the evidence behind the Opportunity Radar without exposing the API credential, publishing millions of interval readings, or fabricating a regional allocation where bidding-zone geography is ambiguous.

## Selected approach

Use governed monthly aggregates.

For the previous complete UTC calendar month, query every supported ENTSO-E bidding zone for:

- actual total load (`documentType=A65`, `processType=A16`); and
- actual generation per production type (`documentType=A75`, `processType=A16`).

The connector will convert interval MW observations into compact zone-month evidence:

- demand energy in GWh;
- peak and mean demand in MW;
- generation energy in GWh by normalized technology;
- total generation in GWh;
- source resolution and expected/observed interval counts;
- coverage percentage, observation period, retrieval time, and source lineage.

Raw XML is retained only in the governed raw-capture store. The public snapshot contains normalized monthly aggregates and source metadata.

## Geography policy

A versioned registry maps supported ENTSO-E area EIC codes to Wattlas geography identifiers. The mapping classifies each area as one of:

- `direct`: the bidding zone maps unambiguously to a Wattlas country or geography;
- `composite`: the area crosses or combines Wattlas geographies;
- `overlapping`: publishing it alongside another selected area would double count; or
- `evidence_only`: useful evidence that is not eligible for forecast control.

Only `direct` areas with sufficient coverage can replace an existing baseline observation. Composite, overlapping, incomplete, or otherwise ambiguous areas remain visible as evidence and never affect scores. Aggregation across multiple non-overlapping zones is allowed only when the registry explicitly defines the country composition.

## Data flow

1. The monthly GitHub Actions workflow reads `ENTSOE_SECURITY_TOKEN` from an encrypted repository secret.
2. The connector selects the previous complete UTC calendar month.
3. It performs bounded load and generation queries per supported area with throttling, retry/backoff, and an identifying user agent.
4. Acknowledgement/error XML is classified separately from valid market documents.
5. Successful XML responses are checksum-captured in the governed raw store.
6. Interval readings are normalized and aggregated with explicit resolution-aware energy arithmetic.
7. The publisher writes `entsoe-monthly.json` and adds it to the immutable snapshot manifest.
8. Eligible observations may update European control evidence; ineligible observations are evidence-only.
9. Connector status records success, partial coverage, cached fallback, or failure without leaking request credentials.

## Reliability and fallback

- A missing token keeps the connector in `not_configured` state.
- HTTP 429 and transient 5xx responses use bounded exponential backoff.
- Authentication, invalid-query, acknowledgement, parsing, and coverage failures have distinct safe messages.
- A partial run cannot silently replace a complete prior capture.
- If the current pull fails, Wattlas retains the last successful governed ENTSO-E aggregate and marks it cached/stale.
- No exception, URL, log message, artifact, or manifest field may contain the security token.

## Publication and security

- The token is stored only as the encrypted GitHub Actions secret `ENTSOE_SECURITY_TOKEN`.
- Vercel does not receive the token because the deployed application reads static snapshot artifacts only.
- `.env` files remain ignored and the repository continues to commit only the empty `.env.example` placeholder.
- Generated public records use ENTSO-E attribution and the approved publication/licence disclosure.
- Secret scanning runs before commit and after the authenticated workflow.

## Interface and methodology

The existing map and feature set remain unchanged. Region and country intelligence can show ENTSO-E as observed monthly evidence, with:

- observation month;
- demand and generation totals;
- technology mix;
- coverage/confidence;
- mapping eligibility; and
- a clear distinction between observed bidding-zone facts and Wattlas model outputs.

The Methodology & Sources page will explain the query scope, monthly aggregation, MW-to-GWh conversion, bidding-zone limitations, fallback behavior, and credential privacy.

## Verification

- Unit tests cover query construction, time windows, XML parsing, acknowledgement documents, resolutions, technology mapping, aggregation, coverage, and token redaction.
- Integration tests use recorded fixtures and an injected HTTP transport; they never require a real credential.
- A one-time authenticated smoke test checks a narrow area/window without persisting or printing the token.
- The full pipeline, web tests, lint, production build, and snapshot validation must pass.
- The first GitHub Actions refresh must complete with the connector marked current or explicitly partial, publish a new immutable snapshot, and leave the token absent from Git history and public artifacts.

## Official references

- ENTSO-E Transparency Platform data extraction process implementation guide: https://transparency.entsoe.eu/content/static_content/download?path=%2FStatic+content%2Fweb+api%2FIG-for-TP-data-extraction-process.pdf
- ENTSO-E Manual of Procedures: https://www.entsoe.eu/data/transparency-platform/mop/
