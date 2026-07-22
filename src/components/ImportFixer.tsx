"use client";

import { CheckCircle2, Download, Link2 } from "lucide-react";
import Papa from "papaparse";
import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { buildExportRows, computeStats } from "@/lib/analysis";
import { triggerDownload } from "@/lib/download";
import { PASSTHROUGH } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

import ColumnMappingTable from "./ColumnMappingTable";
import ColumnReviewCard from "./ColumnReviewCard";
import OutcomesLoader from "./OutcomesLoader";
import PicklistLoader from "./PicklistLoader";
import SemanticMatchToggle from "./SemanticMatchToggle";
import StatBar from "./StatBar";

export default function ImportFixer() {
  const raw = useAppStore((s) => s.raw);
  const picklistCount = useAppStore((s) => Object.keys(s.picklists).length);
  const columnMap = useAppStore(useShallow((s) => s.columnMap));
  const autoMapColumns = useAppStore((s) => s.autoMapColumns);
  const analysis = useAppStore((s) => s.analysis);
  const valueMaps = useAppStore(useShallow((s) => s.valueMaps));
  const analysisHis = useMemo(() => Object.keys(analysis).map(Number), [analysis]);
  const loadBuiltInPicklists = useAppStore((s) => s.loadBuiltInPicklists);

  useEffect(() => {
    loadBuiltInPicklists();
  }, [loadBuiltInPicklists]);

  const attached = Object.values(columnMap).some((v) => v !== PASSTHROUGH);
  const hasColumnMap = Object.keys(columnMap).length > 0;
  const stats = useMemo(() => computeStats(analysis, valueMaps), [analysis, valueMaps]);

  function handleExport() {
    if (!raw) return;
    const rows = buildExportRows(raw, analysis, valueMaps);
    const csv = Papa.unparse([raw.headers, ...rows]);
    triggerDownload("12twenty_import_ready.csv", csv, "text/csv");
  }

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-4 px-6 py-6">
      <div className="grid gap-4 md:grid-cols-2">
        <PicklistLoader />
        <OutcomesLoader />
      </div>

      <SemanticMatchToggle />

      {raw && picklistCount > 0 && (
        <button
          type="button"
          className="animate-fade-in-up flex w-full items-center justify-center gap-2 rounded-xl bg-navy-700 py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all duration-150 hover:bg-navy-800 hover:shadow-md active:scale-[0.99]"
          onClick={autoMapColumns}
        >
          <Link2 size={17} />
          {attached
            ? "Re-attach picklists to columns"
            : `Attach ${picklistCount} picklist${picklistCount > 1 ? "s" : ""} to data columns`}
        </button>
      )}

      {raw && hasColumnMap && <ColumnMappingTable />}

      {analysisHis.length > 0 && (
        <>
          <StatBar />
          {analysisHis.map((hi) => (
            <ColumnReviewCard key={hi} hi={hi} />
          ))}
          <button
            type="button"
            className={`animate-fade-in-up flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white shadow-sm transition-all duration-150 hover:shadow-md active:scale-[0.99] ${
              stats.unresolved === 0 ? "bg-emerald-700 hover:bg-emerald-800" : "bg-slate-700 hover:bg-slate-800"
            }`}
            onClick={handleExport}
          >
            {stats.unresolved === 0 ? <CheckCircle2 size={17} /> : <Download size={17} />}
            {stats.unresolved === 0
              ? "Export import-ready CSV"
              : `Export CSV anyway (${stats.unresolved} values left as-is)`}
          </button>
        </>
      )}
    </div>
  );
}
