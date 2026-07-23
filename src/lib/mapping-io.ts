import { effectiveFor } from "./analysis";
import { PASSTHROUGH } from "./types";
import type { Analysis, ColumnMap, MappingFile, RawData, ValueMaps } from "./types";

/**
 * Mappings are saved keyed by header NAME so they survive column reordering. Exports every
 * resolved value - not just manual overrides - so exact/alias/auto-matches from this file become
 * reusable, reproducible decisions on a future file, instead of being silently re-derived (and
 * possibly scored differently) each time.
 */
export function buildMappingExport(raw: RawData, columnMap: ColumnMap, valueMaps: ValueMaps, analysis: Analysis): MappingFile {
  const byName: MappingFile = { columnMap: {}, valueMaps: {} };
  Object.entries(columnMap).forEach(([hi, pl]) => {
    if (pl !== PASSTHROUGH) byName.columnMap[raw.headers[Number(hi)]] = pl;
  });
  Object.entries(analysis).forEach(([hiStr, col]) => {
    const hi = Number(hiStr);
    const userMap = valueMaps[hi];
    const resolved: Record<string, string> = {};
    col.values.forEach((v) => {
      const eff = effectiveFor(v, userMap);
      if (eff.mapped !== null) resolved[v.value] = eff.mapped;
    });
    if (Object.keys(resolved).length) byName.valueMaps[raw.headers[hi]] = resolved;
  });
  return byName;
}

export function applyMappingImport(
  raw: RawData,
  columnMap: ColumnMap,
  valueMaps: ValueMaps,
  parsed: Partial<MappingFile>,
): { columnMap: ColumnMap; valueMaps: ValueMaps } {
  const nameToIdx: Record<string, number> = {};
  raw.headers.forEach((h, i) => {
    if (!(h in nameToIdx)) nameToIdx[h] = i;
  });

  const nextColumnMap: ColumnMap = { ...columnMap };
  raw.headers.forEach((_, i) => {
    if (nextColumnMap[i] === undefined) nextColumnMap[i] = PASSTHROUGH;
  });
  if (parsed.columnMap) {
    Object.entries(parsed.columnMap).forEach(([name, pl]) => {
      if (name in nameToIdx) nextColumnMap[nameToIdx[name]] = pl;
    });
  }

  const nextValueMaps: ValueMaps = { ...valueMaps };
  if (parsed.valueMaps) {
    Object.entries(parsed.valueMaps).forEach(([name, m]) => {
      if (name in nameToIdx) {
        const idx = nameToIdx[name];
        nextValueMaps[idx] = { ...(nextValueMaps[idx] || {}), ...m };
      }
    });
  }

  return { columnMap: nextColumnMap, valueMaps: nextValueMaps };
}
