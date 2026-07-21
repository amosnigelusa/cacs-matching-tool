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
      className={`rounded-2xl border border-dashed p-5 shadow-sm transition-colors duration-200 ${
        isDragging ? "border-brand-600 bg-brand-50" : "border-slate-300 bg-white"
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
            <div className="mt-0.5 text-xs text-slate-500">
              Your full import file (e.g. cleaned.csv). Headers stay untouched on export.
            </div>
            {rawFile && (
              <div className="animate-fade-in-up mt-1.5 flex items-center gap-1.5 font-mono text-xs text-brand-700">
                <FileSpreadsheet size={13} />
                {rawFile} · {rowCount} rows · {colCount} columns
              </div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-brand-700 px-3.5 py-2 text-sm text-white transition-all duration-150 hover:bg-brand-800 active:scale-[0.97]"
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
