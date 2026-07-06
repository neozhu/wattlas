# Resizable Inspector and Map Polish Design

## Goal

Refine Wattlas's workspace controls so hidden filters are easy to restore, the inspector can be resized for deeper analysis, map annotations do not obstruct navigation, searches remain exact, and refresh messaging matches the monthly publishing cadence.

## Validated design

The collapsed filter restore button appears on the left side of the map, directly beneath the map summary. It remains visually associated with the filter rail and does not overlap the map navigation controls.

On desktop, the inspector receives a visible drag handle on its left edge. Dragging changes the inspector column between 300px and 600px. The selected width is stored in browser local storage and restored on later visits. Mobile and narrow stacked layouts ignore the stored width and keep the inspector full width. Keyboard users can focus the separator and adjust it with the left and right arrow keys; its current value is exposed through ARIA.

The generator cluster-composition note moves to the bottom-right of the map. Google links search only the exact entity name with no added country, technology, or category terms. The command bar says **Monthly refreshed** while retaining the real snapshot generation timestamp.

## State and components

- `OpportunityRadar` owns the inspector width, initializes it safely from local storage, writes changes back, and applies `--inspector` to the shell.
- A reusable separator beside `EntityInspector` handles pointer and keyboard resizing.
- `GlobalMap` keeps the composition note but positions it at bottom-right through CSS.
- `EntityInspector` simplifies Google query generation to the selected name only.
- `CommandBar` changes its refresh cadence label without changing timestamp semantics.

## Testing

Component tests cover exact-name queries, monthly wording, filter restoration, pointer/keyboard resizing limits, and saved-width restoration. CSS tests cover left placement, bottom-right composition placement, and mobile full-width behavior. End-to-end tests verify the resize interaction and filter restore control on the rendered application.

