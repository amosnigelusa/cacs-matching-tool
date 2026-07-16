"use client";

import { FileSpreadsheet, Upload } from "lucide-react";
import { useRef } from "react";

import { useFileDrop } from "@/lib/useFileDrop";
import { useAppStore } from "@/store/useAppStore";

import StepBadge from "./StepBadge";

export default function OutcomesLoader() {
  const rawFile = useAppStore((s) => s.rawFile);
  const rowCount = useAppStore((s) => s.raw?.rows.length ?? 0);
  const colCount = useAppStore((s) => s.raw?.headers.length ?? 0);
  const loadRawFile = useAppStore((s) => s.loadRawFile);
  const inputRef = useRef<HTMLInputElement>(null);
  const { isDragging, onDragOver, onDragLeave, onDrop } = useFileDrop((files) => {
    if (files[0]) loadRawFile(files[0]);
  });

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
          <StepBadge n={2} />
          <div>
            <h3 className="text-[15px] font-semibold">Outcomes data file</h3>
            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Your full import file (e.g. cleaned.csv). Headers stay untouched on export.
            </div>
            {rawFile && (
              <div className="mt-1.5 flex items-center gap-1.5 font-mono text-xs text-teal-700 dark:text-teal-400">
                <FileSpreadsheet size={13} />
                {rawFile} · {rowCount} rows · {colCount} columns
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-teal-700 px-3.5 py-2 text-sm text-white transition-colors hover:bg-teal-800 dark:bg-teal-600 dark:hover:bg-teal-500"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={14} />
          {rawFile ? "Replace CSV" : "Choose CSV"}
        </button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.txt,.tsv"
        className="hidden"
        suppressHydrationWarning
        onChange={(e) => {
          if (e.target.files?.[0]) loadRawFile(e.target.files[0]);
          e.target.value = "";
        }}
      />
    </div>
  );
}
