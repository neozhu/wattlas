"use client";

import { useId, useMemo, useState } from "react";

import { searchEntities, type SearchIndex, type SearchResult } from "@/lib/search";

type Props = {
  index: SearchIndex;
  onSelect: (result: SearchResult) => void;
};

const groupOrder = ["Places", "Power generators", "Data centres", "Water infrastructure"] as const;

export function SearchBox({ index, onSelect }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => searchEntities(index, query, 10), [index, query]);
  const grouped = groupOrder
    .map((group) => ({ group, results: results.filter((result) => result.group === group) }))
    .filter((entry) => entry.results.length > 0);
  const showPanel = open && query.trim().length > 0;

  return (
    <div className="search-box">
      <label className="rail-heading" htmlFor={id}>Search</label>
      <div className="search-input-wrap">
        <input
          id={id}
          role="combobox"
          aria-label="Search Wattlas"
          aria-expanded={showPanel}
          aria-controls={`${id}-results`}
          aria-autocomplete="list"
          value={query}
          placeholder="Search places, projects, generators…"
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
            if (event.key === "Enter" && results[0]) {
              event.preventDefault();
              onSelect(results[0]);
              setQuery(results[0].label);
              setOpen(false);
            }
          }}
        />
        <span aria-hidden="true">⌕</span>
      </div>
      {showPanel && (
        <div className="search-results" id={`${id}-results`} role="listbox">
          {grouped.length > 0 ? grouped.map(({ group, results: groupResults }) => (
            <div className="search-result-group" key={group}>
              <p>{group}</p>
              {groupResults.map((result) => (
                <button
                  key={`${result.entityType}:${result.id}`}
                  type="button"
                  role="option"
                  aria-selected="false"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(result);
                    setQuery(result.label);
                    setOpen(false);
                  }}
                >
                  <strong>{result.label}</strong>
                  <small>{result.detail}</small>
                </button>
              ))}
            </div>
          )) : <p className="search-empty">No matching places or assets.</p>}
        </div>
      )}
    </div>
  );
}
