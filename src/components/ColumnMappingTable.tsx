"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

import { matchScore } from "@/lib/matching";
import { PASSTHROUGH } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

export default function ColumnMappingTable() {
  const headers = useAppStore((s) => s.raw?.headers ?? []);
  const columnMap = useAppStore(useShallow((s) => s.columnMap));
  const picklistNames = useAppStore(useShallow((s) => Object.keys(s.picklists)));
  const setColumnMap = useAppStore((s) => s.setColumnMap);

  const rowIdx = useMemo(
    () =>
      headers
        .map((_, i) => i)
        .filter((i) => columnMap[i] !== PASSTHROUGH || picklistNames.some((p) => matchScore(p, headers[i]) > 0.4)),
    [headers, columnMap, picklistNames],
  );

  if (!rowIdx.length) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-[15px] font-semibold">Which columns get validated</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          Only columns attached to a picklist are checked and fixed; everything else passes through unchanged.
        </p>
      </div>
      {rowIdx.map((i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-2 text-[13px] last:border-b-0 dark:border-slate-800/60"
        >
          <div className="w-[45%] overflow-hidden text-ellipsis whitespace-nowrap font-mono" title={headers[i]}>
            {headers[i]}
          </div>
          <span className="text-slate-400 dark:text-slate-600">→</span>
          <select
            className="flex-1 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[13px] dark:border-slate-700 dark:bg-slate-800"
            value={columnMap[i] ?? PASSTHROUGH}
            onChange={(e) => setColumnMap(i, e.target.value)}
          >
            <option value={PASSTHROUGH}>(not validated)</option>
            {picklistNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
