"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RowComponentProps } from "react-window";

import { MANUALLY_EXTENSIBLE_PICKLISTS } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";
import type { EffectiveMapping, ValueRecord } from "@/lib/types";
import SearchableSelect from "./SearchableSelect";

export interface ShownValue {
  v: ValueRecord;
  eff: EffectiveMapping;
  needsActions: boolean;
}

function scoreChipClass(score: number) {
  if (score >= 0.85) return "bg-emerald-50 text-emerald-700";
  if (score >= 0.6) return "bg-amber-50 text-amber-800";
  return "bg-rose-50 text-rose-700";
}

interface AddNewOptionButtonProps {
  picklistName: string;
  defaultValue: string;
  onAdd: (value: string) => void;
}

/** "+ Add new option" button for open-ended reference picklists (University/City) - lets a value
 *  with no real match become a new valid option instead of being forced into an existing one */
function AddNewOptionButton({ picklistName, defaultValue, onAdd }: AddNewOptionButtonProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(defaultValue);
  const [rect, setRect] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setRect({ top: r.bottom + 4, left: r.left });
    const close = () => setOpen(false);
    const onDocClick = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("scroll", close, true);
    document.addEventListener("mousedown", onDocClick);
    return () => {
      window.removeEventListener("scroll", close, true);
      document.removeEventListener("mousedown", onDocClick);
    };
  }, [open]);

  function toggleOpen() {
    if (!open) setText(defaultValue);
    setOpen((o) => !o);
  }

  function submit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setOpen(false);
  }

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="rounded-md border border-dashed border-navy-600 bg-white px-2 py-1 text-xs text-navy-700 transition-colors hover:bg-navy-50"
        onClick={toggleOpen}
      >
        + Add new {picklistName}
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={popRef}
            className="animate-scale-in z-50 w-64 rounded-md border border-slate-200 bg-white p-2 shadow-lg"
            style={{ position: "fixed", top: rect.top, left: rect.left }}
          >
            <label className="mb-1 block text-[11px] text-slate-500">Add a new {picklistName} option</label>
            <input
              autoFocus
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                } else if (e.key === "Escape") {
                  setOpen(false);
                }
              }}
              className="mb-2 w-full rounded border border-slate-300 bg-white px-2 py-1 text-xs"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100"
                onClick={() => setOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-navy-700 px-2 py-1 text-xs font-medium text-white transition-all duration-150 hover:bg-navy-800 active:scale-[0.97]"
                onClick={submit}
              >
                Add &amp; use
              </button>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

interface ValueRowContentProps {
  hi: number;
  item: ShownValue;
  options: string[];
  picklistName: string;
}

export function ValueRowContent({ hi, item, options, picklistName }: ValueRowContentProps) {
  const { v, eff, needsActions } = item;
  const setValueMapping = useAppStore((s) => s.setValueMapping);
  const addPicklistOption = useAppStore((s) => s.addPicklistOption);
  const apply = (mapped: string) => setValueMapping(hi, v.value, mapped);
  const isExtensible = MANUALLY_EXTENSIBLE_PICKLISTS.has(picklistName.toLowerCase());

  return (
    <div className="border-b border-slate-50 px-4 py-2.5 last:border-b-0">
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono">{v.value === "" ? "(empty)" : v.value}</span>
        <span className="text-[11px] text-slate-400">×{v.count}</span>
        <span className="text-slate-400">→</span>
        {eff.mapped !== null ? (
          <span className={eff.mapped === "" ? "font-normal italic text-slate-500" : "font-semibold text-emerald-700"}>
            {eff.mapped === "" ? "blank" : eff.mapped}{" "}
            <span className="text-[11px] font-normal text-slate-400">({eff.source})</span>
          </span>
        ) : (
          <span className="font-semibold text-rose-700">unresolved</span>
        )}
      </div>

      {needsActions && (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {v.suggestions.map((s) => (
            <button
              key={s.option}
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs transition-colors hover:border-navy-700 hover:bg-navy-50"
              onClick={() => apply(s.option)}
            >
              {s.option}
              {s.source === "semantic" && (
                <span className="rounded bg-violet-50 px-1 text-[10px] text-violet-700" title="Meaning-based match, not spelling">
                  meaning
                </span>
              )}
              {s.source === "alias" && (
                <span
                  className="rounded bg-blue-50 px-1 text-[10px] text-blue-700"
                  title="Recognized as a known abbreviation or alternate name"
                >
                  alias
                </span>
              )}
              <span className={`rounded px-1 font-mono text-[10px] ${scoreChipClass(s.score)}`}>
                {Math.round(s.score * 100)}%
              </span>
            </button>
          ))}
          <SearchableSelect options={options} onSelect={apply} />
          {isExtensible && (
            <AddNewOptionButton
              picklistName={picklistName}
              defaultValue={v.value}
              onAdd={(text) => {
                addPicklistOption(picklistName, text);
                apply(text);
              }}
            />
          )}
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
            onClick={() => apply("")}
          >
            leave blank
          </button>
          <button
            type="button"
            className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-500 transition-colors hover:bg-slate-50"
            onClick={() => apply(v.value)}
          >
            keep as-is
          </button>
        </div>
      )}
    </div>
  );
}

export interface VirtualRowProps {
  hi: number;
  items: ShownValue[];
  options: string[];
  picklistName: string;
}

export function VirtualValueRow({
  index,
  style,
  ariaAttributes,
  hi,
  items,
  options,
  picklistName,
}: RowComponentProps<VirtualRowProps>) {
  return (
    <div style={style} {...ariaAttributes}>
      <ValueRowContent hi={hi} item={items[index]} options={options} picklistName={picklistName} />
    </div>
  );
}
