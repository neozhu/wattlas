"use client";

import { useEffect, useId, useMemo, useState } from "react";

import { searchEntities, type SearchIndex, type SearchResult } from "@/lib/search";

type Props = {
  index: SearchIndex;
  onSelect: (result: SearchResult) => void;
};

const groupOrder = ["Places", "Industrial demand", "Hydrogen network", "Power generators", "Data centres", "Water infrastructure"] as const;

export function SearchBox({ index, onSelect }: Props) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const results = useMemo(() => searchEntities(index, query, 10), [index, query]);
  const grouped = groupOrder
    .map((group) => ({ group, results: results.filter((result) => result.group === group) }))
    .filter((entry) => entry.results.length > 0);
  const showPanel = open && query.trim().length > 0;

  // Keep the active option in range as results change under the cursor.
  useEffect(() => { setActive(0); }, [query]);

  const optionId = (result: SearchResult) => `${id}-opt-${result.entityType}-${result.id}`;
  const choose = (result: SearchResult) => {
    onSelect(result);
    setQuery(result.label);
    setOpen(false);
  };

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
          aria-activedescendant={showPanel && results[active] ? optionId(results[active]) : undefined}
          value={query}
          placeholder="Search places, projects, generators…"
          onChange={(event) => { setQuery(event.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") { setOpen(false); return; }
            if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((current) => Math.min(current + 1, results.length - 1)); return; }
            if (event.key === "ArrowUp") { event.preventDefault(); setActive((current) => Math.max(current - 1, 0)); return; }
            if (event.key === "Enter") {
              const result = results[active] ?? results[0];
              if (result) { event.preventDefault(); choose(result); }
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
              {groupResults.map((result) => {
                const isActive = results[active] === result;
                return (
                  <button
                    key={`${result.entityType}:${result.id}`}
                    id={optionId(result)}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={isActive ? "search-result active" : "search-result"}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActive(results.indexOf(result))}
                    onClick={() => choose(result)}
                  >
                    <strong>{result.label}</strong>
                    <small>{result.detail}</small>
                  </button>
                );
              })}
            </div>
          )) : <p className="search-empty">No matching places or assets.</p>}
        </div>
      )}
    </div>
  );
}
