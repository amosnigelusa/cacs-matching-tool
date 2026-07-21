import { stripBOM } from "./text";
import type { Picklist, RawData } from "./types";

/** rows = raw array-of-arrays from Papa.parse (no header option). First data row = headers. */
export function parsePicklistRows(fileName: string, rows: string[][]): Picklist | null {
  const nonEmpty = rows.filter((r) => r.some((c) => String(c ?? "").trim() !== ""));
  if (!nonEmpty.length) return null;

  const headers = nonEmpty[0].map((h) => stripBOM(String(h ?? "")).trim());
  const body = nonEmpty.slice(1);
  const columns: Record<string, string[]> = {};
  headers.forEach((h, idx) => {
    if (!h) return;
    const opts = [...new Set(body.map((r) => String(r[idx] ?? "").trim()).filter(Boolean))];
    if (opts.length) columns[h] = opts;
  });

  const colNames = Object.keys(columns);
  if (!colNames.length) return null;

  return { name: colNames[0], fileName, columns, activeColumn: colNames[0] };
}

/** treats each non-empty column of a reference CSV as its own independent picklist
 *  (e.g. a combined "University, City" file becomes a separate "University" picklist and "City" picklist) */
export function parsePicklistColumns(fileName: string, rows: string[][]): Picklist[] {
  const base = parsePicklistRows(fileName, rows);
  if (!base) return [];
  return Object.entries(base.columns).map(([name, options]) => ({
    name,
    fileName,
    columns: { [name]: options },
    activeColumn: name,
  }));
}

/** positional parse: preserves every header (incl. commas/quotes/duplicates) exactly */
export function buildRawData(rows: string[][]): RawData | null {
  if (!rows.length) return null;
  const headers = rows[0].map((h) => stripBOM(String(h ?? "")));
  const width = headers.length;
  const body = rows.slice(1).map((r) => {
    const row = r.slice(0, width).map((c) => String(c ?? ""));
    while (row.length < width) row.push("");
    return row;
  });
  return { headers, rows: body };
}
