import { PASSTHROUGH } from "./types";
import type { ColumnMap, MappingFile, RawData, ValueMaps } from "./types";

/** mappings are saved keyed by header NAME so they survive column reordering */
export function buildMappingExport(raw: RawData, columnMap: ColumnMap, valueMaps: ValueMaps): MappingFile {
  const byName: MappingFile = { columnMap: {}, valueMaps: {} };
  Object.entries(columnMap).forEach(([hi, pl]) => {
    if (pl !== PASSTHROUGH) byName.columnMap[raw.headers[Number(hi)]] = pl;
  });
  Object.entries(valueMaps).forEach(([hi, m]) => {
    byName.valueMaps[raw.headers[Number(hi)]] = m;
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
