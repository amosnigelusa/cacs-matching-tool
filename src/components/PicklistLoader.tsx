"use client";

import { Upload, X } from "lucide-react";
import { useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { PICKLIST_TO_COLUMN } from "@/lib/constants";
import { norm } from "@/lib/text";
import { useFileDrop } from "@/lib/useFileDrop";
import { useAppStore } from "@/store/useAppStore";

import StepBadge from "./StepBadge";

export default function PicklistLoader() {
  const picklists = useAppStore(useShallow((s) => s.picklists));
  const loadPicklistFiles = useAppStore((s) => s.loadPicklistFiles);
  const removePicklist = useAppStore((s) => s.removePicklist);
  const setActiveColumn = useAppStore((s) => s.setActiveColumn);
  const inputRef = useRef<HTMLInputElement>(null);
  const names = Object.keys(picklists);
  const { isDragging, onDragOver, onDragLeave, onDrop } = useFileDrop(loadPicklistFiles);

  return (
    <div
      className={`rounded-2xl border border-dashed p-5 shadow-sm transition-colors ${
        isDragging
          ? "border-teal-500 bg-teal-50 dark:border-teal-500 dark:bg-teal-500/10"
          : "border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <StepBadge n={1} />
          <div>
            <h3 className="text-[15px] font-semibold">Picklist option files</h3>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              One CSV per field (e.g. Consolidated_Industry.csv). First column = valid options. Drag &amp; drop or
              select several at once; add more later.
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-teal-700 px-3.5 py-2 text-sm text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} />
          {names.length ? "Add more" : "Choose CSVs"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        multiple
        className="hidden"
        suppressHydrationWarning
        onChange={(e) => {
          if (e.target.files?.length) loadPicklistFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="mt-3 flex flex-col gap-1.5">
        {names.map((name) => {
          const pl = picklists[name];
          const cols = Object.keys(pl.columns);
          const target = PICKLIST_TO_COLUMN[norm(name)];
          const optionCount = (pl.columns[pl.activeColumn] || []).length;
          return (
            <div
              key={name}
              className="flex items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs dark:bg-slate-800"
            >
              <span className="font-mono font-semibold">{name}</span>
              <span className="text-slate-400 dark:text-slate-500">({optionCount} options)</span>
              {target && <span className="text-teal-700 dark:text-teal-400">→ {target}</span>}
              {cols.length > 1 && (
                <select
                  className="ml-auto rounded border-slate-300 bg-white text-[11px] dark:border-slate-600 dark:bg-slate-900"
                  value={pl.activeColumn}
                  onChange={(e) => setActiveColumn(name, e.target.value)}
                >
                  {cols.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
              <button
                type="button"
                title="Remove"
                className={`rounded p-0.5 text-rose-700 transition-colors hover:bg-rose-100 dark:text-rose-400 dark:hover:bg-rose-500/10 ${
                  cols.length > 1 ? "" : "ml-auto"
                }`}
                onClick={() => removePicklist(name)}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
