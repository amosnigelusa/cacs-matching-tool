"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const MAX_RESULTS = 100;

interface SearchableSelectProps {
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
}

/** text input that opens a filtered, portal-rendered dropdown - a searchable stand-in for a
 *  native <select>, needed once a picklist has more than a handful of options */
export default function SearchableSelect({ options, onSelect, placeholder = "pick any option…" }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
    return matches.slice(0, MAX_RESULTS);
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    const updateRect = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (r) setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 220) });
    };
    updateRect();
    const close = () => setOpen(false);
    const onDocClick = (e: MouseEvent) => {
      if (inputRef.current?.contains(e.target as Node) || popRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", updateRect);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", updateRect);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  function choose(option: string) {
    onSelect(option);
    setQuery("");
    setOpen(false);
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        className="w-[200px] rounded-md border border-slate-300 bg-white px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800"
        onFocus={() => {
          setOpen(true);
          setHighlight(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlight((h) => Math.min(h + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[highlight]) choose(filtered[highlight]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open &&
        rect &&
        createPortal(
          <div
            ref={popRef}
            className="z-50 max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-800"
            style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width }}
          >
            {filtered.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-slate-400 dark:text-slate-500">No matches</div>
            ) : (
              filtered.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  className={`block w-full truncate px-2 py-1.5 text-left text-xs ${
                    i === highlight
                      ? "bg-teal-50 dark:bg-teal-500/10"
                      : "hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    choose(o);
                  }}
                >
                  {o}
                </button>
              ))
            )}
            {filtered.length === MAX_RESULTS && (
              <div className="px-2 py-1 text-[11px] text-slate-400 dark:text-slate-500">
                Keep typing to narrow further…
              </div>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}
