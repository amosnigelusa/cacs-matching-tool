"use client";

import { CheckCircle2, ChevronRight, CircleAlert } from "lucide-react";
import { useMemo } from "react";
import { List } from "react-window";

import { effectiveFor, matchesFilter, showsActions } from "@/lib/analysis";
import type { FilterMode } from "@/lib/types";
import { useAppStore } from "@/store/useAppStore";
import { ValueRowContent, VirtualValueRow, type ShownValue, type VirtualRowProps } from "./ValueRow";

const VIRTUALIZE_THRESHOLD = 50;
const LIST_HEIGHT = 420;

function emptyMessage(filter: FilterMode): string {
  switch (filter) {
    case "unresolved":
      return "Nothing unresolved here.";
    case "matched":
      return "Nothing matched here yet.";
    case "needs-review":
      return "Nothing needs review here.";
    case "all":
      return "No values in this column.";
  }
}

export default function ColumnReviewCard({ hi }: { hi: number }) {
  const col = useAppStore((s) => s.analysis[hi]);
  const open = useAppStore((s) => s.openCol === hi);
  const filter = useAppStore((s) => s.filter);
  const valueMap = useAppStore((s) => s.valueMaps[hi]);
  const toggleColumn = useAppStore((s) => s.toggleColumn);

  const { shown, unresolvedCount } = useMemo(() => {
    if (!col) return { shown: [] as ShownValue[], unresolvedCount: 0 };
    let unresolved = 0;
    const filtered: ShownValue[] = [];
    col.values.forEach((v) => {
      const eff = effectiveFor(v, valueMap);
      if (eff.mapped === null) unresolved++;
      if (!matchesFilter(eff, filter)) return;
      filtered.push({ v, eff, needsActions: showsActions(v, eff, filter) });
    });
    return { shown: filtered, unresolvedCount: unresolved };
  }, [col, valueMap, filter]);

  if (!col) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60"
        onClick={() => toggleColumn(hi)}
      >
        <span>
          <span className="font-mono text-[13px] font-semibold">{col.header}</span>{" "}
          <span className="text-[13px] font-normal text-slate-500 dark:text-slate-400">
            · picklist: {col.picklist}
          </span>
        </span>
        <span className="flex items-center gap-2">
          {unresolvedCount ? (
            <span className="flex items-center gap-1 text-[13px] font-semibold text-rose-700 dark:text-rose-400">
              <CircleAlert size={14} />
              {unresolvedCount} to fix
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[13px] font-semibold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 size={14} />
              clean
            </span>
          )}
          <ChevronRight
            size={16}
            className={`text-slate-400 transition-transform dark:text-slate-500 ${open ? "rotate-90" : ""}`}
          />
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {shown.length === 0 ? (
            <div className="px-4 py-3.5 text-[13px] text-slate-500 dark:text-slate-400">{emptyMessage(filter)}</div>
          ) : shown.length > VIRTUALIZE_THRESHOLD ? (
            <List<VirtualRowProps>
              style={{ height: LIST_HEIGHT }}
              overscanCount={6}
              rowCount={shown.length}
              rowHeight={(index, props) => (props.items[index].needsActions ? 156 : 48)}
              rowComponent={VirtualValueRow}
              rowProps={{ hi, items: shown, options: col.options, picklistName: col.picklist }}
            />
          ) : (
            <div className="overflow-auto" style={{ maxHeight: LIST_HEIGHT }}>
              {shown.map((item) => (
                <ValueRowContent
                  key={item.v.value}
                  hi={hi}
                  item={item}
                  options={col.options}
                  picklistName={col.picklist}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
