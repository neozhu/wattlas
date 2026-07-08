# Meaningful Product Analytics Design

## Goal

Measure how visitors use Wattlas's important controls while relying on GA4's built-in approximate geography reports for country, region, and city.

## Event contract

All intentional product interactions emit one GA4 event named `wattlas_action`. A stable `action` parameter identifies the behavior:

- `lens_changed`
- `filter_changed`
- `entity_selected`
- `google_search_opened`
- `evidence_opened`
- `comparison_added`
- `filters_hidden`
- `filters_shown`
- `year_changed`
- `inspector_resized`
- `data_status_opened`

Events include only relevant structured context such as `entity_type`, `entity_name`, `country`, `technology`, `lens`, `year`, `filter_name`, `filter_value`, and `panel_width`. They never include coordinates, source URLs, IP addresses, or arbitrary user-entered text.

## Architecture and deduplication

A typed `trackWattlasAction` helper wraps Next.js's `sendGAEvent`. Components call it only inside explicit click, keyboard, pointer-completion, or selection handlers. Render cycles, map movement, asynchronous data loading, and intermediate resize movements never emit analytics. Inspector resizing emits once on pointer release or keyboard adjustment.

GA4 continues collecting approximate visitor geography automatically; no custom location collection is added.

## Verification

Unit tests mock `sendGAEvent` and assert exact event payloads for representative actions. Existing interaction tests ensure analytics does not change product behavior. Production verification checks the GA tag, while event arrival is confirmed in GA4 DebugView or Realtime Events.

