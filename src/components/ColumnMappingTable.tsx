"use client";

import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";

import { matchScore } from "@/lib/matching";
import { PASSTHROUGH } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";

const COLLAPSED_COUNT = 3;

export default function ColumnMappingTable() {
  const headers = useAppStore((s) => s.raw?.headers ?? []);
  const columnMap = useAppStore(useShallow((s) => s.columnMap));
  const picklistNames = useAppStore(useShallow((s) => Object.keys(s.picklists)));
  const setColumnMap = useAppStore((s) => s.setColumnMap);
  const [expanded, setExpanded] = useState(false);

  const rowIdx = useMemo(
    () =>
      headers
        .map((_, i) => i)
        .filter((i) => columnMap[i] !== PASSTHROUGH || picklistNames.some((p) => matchScore(p, headers[i]) > 0.4)),
    [headers, columnMap, picklistNames],
  );

  if (!rowIdx.length) return null;

  const hasMore = rowIdx.length > COLLAPSED_COUNT;
  const shownIdx = expanded ? rowIdx : rowIdx.slice(0, COLLAPSED_COUNT);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-[15px] font-semibold">Which columns get validated</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Only columns attached to a picklist are checked and fixed; everything else passes through unchanged.
        </p>
      </div>
      {shownIdx.map((i) => (
        <div
          key={i}
          className="animate-fade-in-up flex items-center gap-2.5 border-b border-slate-100 px-4 py-2 text-[13px] last:border-b-0"
        >
          <div className="w-[45%] overflow-hidden text-ellipsis whitespace-nowrap font-mono" title={headers[i]}>
            {headers[i]}
          </div>
          <span className="text-slate-400">→</span>
          <select
            className="flex-1 rounded-md border border-slate-300 bg-white px-1.5 py-1 text-[13px]"
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
      {hasMore && (
        <button
          type="button"
          className="w-full px-4 py-2 text-center text-[13px] font-medium text-navy-700 transition-colors hover:bg-slate-50"
          onClick={() => setExpanded((e) => !e)}
        >
          {expanded ? "Show less" : `Show ${rowIdx.length - COLLAPSED_COUNT} more`}
        </button>
      )}
    </div>
  );
}
