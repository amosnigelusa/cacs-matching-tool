import { buildAliasMap, lookupAlias } from "./aliases";
import { PICKLIST_TO_COLUMN } from "./constants";
import { mergeSuggestions } from "./embeddings";
import { matchScore, topMatches } from "./matching";
import { isBlankish, norm } from "./text";
import { PASSTHROUGH } from "./types";
import type {
  Analysis,
  ColumnMap,
  EffectiveMapping,
  FilterMode,
  MatchSuggestion,
  Picklist,
  RawData,
  SemanticSuggestions,
  ValueMaps,
  ValueRecord,
} from "./types";

export function optionsFor(picklists: Record<string, Picklist>, name: string): string[] {
  const pl = picklists[name];
  return pl ? pl.columns[pl.activeColumn] || [] : [];
}

export function autoMapColumns(raw: RawData, picklists: Record<string, Picklist>): ColumnMap {
  const map: ColumnMap = {};
  raw.headers.forEach((_, i) => {
    map[i] = PASSTHROUGH;
  });
  Object.keys(picklists).forEach((pl) => {
    const known = PICKLIST_TO_COLUMN[norm(pl)];
    if (known) {
      const t = raw.headers.findIndex((h) => norm(h) === norm(known));
      if (t >= 0) {
        map[t] = pl;
        return;
      }
    }
    const exact = raw.headers.findIndex((h) => norm(h) === norm(pl));
    if (exact >= 0) {
      map[exact] = pl;
      return;
    }
    let best = { i: -1, s: 0 };
    raw.headers.forEach((h, i) => {
      const s = matchScore(pl, h);
      if (s > best.s) best = { i, s };
    });
    if (best.i >= 0 && best.s >= 0.6) map[best.i] = pl;
  });
  return map;
}

export function buildAnalysis(raw: RawData, columnMap: ColumnMap, picklists: Record<string, Picklist>): Analysis {
  const out: Analysis = {};
  raw.headers.forEach((h, hi) => {
    const pn = columnMap[hi];
    if (!pn || pn === PASSTHROUGH) return;
    const options = optionsFor(picklists, pn);
    if (!options.length) return;

    const optNorm = new Map(options.map((o) => [norm(o), o]));
    const aliasMap = buildAliasMap(options);
    const counts = new Map<string, number>();
    raw.rows.forEach((r) => {
      const v = String(r[hi] ?? "").trim();
      counts.set(v, (counts.get(v) || 0) + 1);
    });

    const values: ValueRecord[] = [...counts.entries()].map(([v, count]) => {
      const exact = optNorm.get(norm(v)) ?? null;
      const blank = isBlankish(v);
      let suggestions: MatchSuggestion[] = [];
      if (!exact && !blank) {
        const textSuggestions = topMatches(v, options);
        const alias = lookupAlias(aliasMap, v);
        suggestions = alias
          ? mergeSuggestions([{ option: alias, score: 1, source: "alias" }], textSuggestions)
          : textSuggestions;
      }
      return { value: v, count, exact, blank, suggestions };
    });
    values.sort((a, b) => b.count - a.count);
    out[hi] = { header: h, picklist: pn, options, values };
  });
  return out;
}

/** cheap: combines a value's precomputed suggestions with the user's manual override */
export function effectiveFor(v: ValueRecord, userMap: Record<string, string> | undefined): EffectiveMapping {
  const user = userMap?.[v.value];
  if (user !== undefined) return { mapped: user, source: "manual" };
  if (v.blank) return { mapped: "", source: "auto-blank" };
  if (v.exact) return { mapped: v.exact, source: "exact" };
  const top = v.suggestions[0];
  // alias hits (e.g. "CUA" -> "Catholic University of America") are rule-based, not a probabilistic
  // guess, so - unlike semantic suggestions - they're precise enough to auto-accept
  if (top && top.source === "alias") return { mapped: top.option, source: "alias" };
  // semantic (meaning-based) suggestions always need a manual click, however confident -
  // only string-similarity matches auto-accept
  if (top && top.source === "text" && top.score >= 0.85) return { mapped: top.option, source: "auto" };
  return { mapped: null, source: "unresolved" };
}

/** layers semantic-sourced suggestions from the embeddings worker on top of the string-based analysis */
export function mergeSemanticIntoAnalysis(analysis: Analysis, semantic: SemanticSuggestions): Analysis {
  const out: Analysis = {};
  Object.entries(analysis).forEach(([hiStr, col]) => {
    const hi = Number(hiStr);
    const colSemantic = semantic[hi];
    if (!colSemantic) {
      out[hi] = col;
      return;
    }
    out[hi] = {
      ...col,
      values: col.values.map((v) => {
        const extra = colSemantic[v.value];
        if (!extra || !extra.length) return v;
        return { ...v, suggestions: mergeSuggestions(v.suggestions, extra) };
      }),
    };
  });
  return out;
}

export function matchesFilter(eff: EffectiveMapping, filter: FilterMode): boolean {
  switch (filter) {
    case "all":
      return true;
    case "unresolved":
      return eff.mapped === null;
    case "matched":
      return eff.mapped !== null;
    case "needs-review":
      return eff.source === "unresolved" || eff.source === "auto" || eff.source === "alias";
  }
}

export function showsActions(v: ValueRecord, eff: EffectiveMapping, filter: FilterMode): boolean {
  // "all"/"matched" show override controls for every resolved value (exact stays locked); the other
  // filters only ever surface unresolved/auto/alias rows anyway, which already always show actions
  const alwaysVisible = filter === "all" || filter === "matched";
  return (eff.source === "unresolved" || eff.source === "auto" || eff.source === "alias" || alwaysVisible) && !v.exact;
}

export function computeStats(analysis: Analysis, valueMaps: ValueMaps) {
  let total = 0;
  let resolved = 0;
  let rowsAffected = 0;
  Object.entries(analysis).forEach(([hiStr, col]) => {
    const hi = Number(hiStr);
    col.values.forEach((v) => {
      total++;
      const eff = effectiveFor(v, valueMaps[hi]);
      if (eff.mapped !== null) resolved++;
      else rowsAffected += v.count;
    });
  });
  return { total, resolved, unresolved: total - resolved, rowsAffected };
}

export function buildExportRows(raw: RawData, analysis: Analysis, valueMaps: ValueMaps): string[][] {
  return raw.rows.map((r) => {
    const row = r.slice();
    Object.keys(analysis).forEach((hiStr) => {
      const hi = Number(hiStr);
      const val = String(row[hi] ?? "").trim();
      const rec = analysis[hi].values.find((v) => v.value === val);
      if (rec) {
        const eff = effectiveFor(rec, valueMaps[hi]);
        if (eff.mapped !== null) row[hi] = eff.mapped;
      }
    });
    return row;
  });
}
