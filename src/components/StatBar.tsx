"use client";

import { Download, ListFilter, Loader2, Upload } from "lucide-react";
import { useMemo, useRef } from "react";
import { useShallow } from "zustand/react/shallow";

import { computeStats } from "@/lib/analysis";
import { triggerDownload } from "@/lib/download";
import { buildMappingExport } from "@/lib/mapping-io";
import type { FilterMode } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const FILTER_OPTIONS: { value: FilterMode; label: string }[] = [
  { value: "needs-review", label: "Needs review" },
  { value: "unresolved", label: "Unresolved only" },
  { value: "matched", label: "Matched only" },
  { value: "all", label: "All values" },
];

export default function StatBar() {
  const analysis = useAppStore((s) => s.analysis);
  const valueMaps = useAppStore(useShallow((s) => s.valueMaps));
  const filter = useAppStore((s) => s.filter);
  const setFilter = useAppStore((s) => s.setFilter);
  const analysisStatus = useAppStore((s) => s.analysisStatus);
  const raw = useAppStore((s) => s.raw);
  const columnMap = useAppStore(useShallow((s) => s.columnMap));
  const importMapping = useAppStore((s) => s.importMapping);
  const inputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => computeStats(analysis, valueMaps), [analysis, valueMaps]);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <b>{stats.resolved}</b>{" "}
        <span className="text-slate-500 dark:text-slate-400">/ {stats.total} distinct values resolved ·</span>{" "}
        <span
          className={
            stats.unresolved
              ? "font-semibold text-rose-700 dark:text-rose-400"
              : "font-semibold text-emerald-700 dark:text-emerald-400"
          }
        >
          {stats.unresolved} unresolved
        </span>
        {stats.unresolved > 0 && (
          <span className="text-slate-500 dark:text-slate-400"> ({stats.rowsAffected} rows affected)</span>
        )}
        {analysisStatus === "analyzing" && (
          <span className="ml-2 inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <Loader2 size={12} className="animate-spin" />
            Analyzing…
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <label className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700">
          <ListFilter size={13} className="shrink-0 text-slate-500 dark:text-slate-400" />
          <span className="text-slate-500 dark:text-slate-400">Showing:</span>
          <select
            className="bg-transparent text-[13px] outline-none"
            value={filter}
            onChange={(e) => setFilter(e.target.value as FilterMode)}
          >
            {FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          onClick={() => {
            if (!raw) return;
            const mapping = buildMappingExport(raw, columnMap, valueMaps);
            triggerDownload("12twenty_value_mappings.json", JSON.stringify(mapping, null, 2), "application/json");
          }}
        >
          <Download size={13} />
          Save mappings
        </button>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-[13px] transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={13} />
          Load mappings
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".json"
          className="hidden"
          suppressHydrationWarning
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              importMapping(file).catch((err: Error) => alert(err.message));
            }
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
