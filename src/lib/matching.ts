import { norm } from "./text";
import type { MatchSuggestion } from "./types";

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

export const levSim = (a: string, b: string): number => {
  const m = Math.max(a.length, b.length);
  return m === 0 ? 1 : 1 - levenshtein(a, b) / m;
};

export function subsequenceScore(code: string, full: string): number {
  const c = code.replace(/ /g, "");
  const f = full.replace(/ /g, "");
  if (!c.length || c.length > f.length) return 0;
  let i = 0;
  for (let j = 0; j < f.length && i < c.length; j++) if (f[j] === c[i]) i++;
  return i < c.length ? 0 : 0.55 + 0.35 * (c.length / f.length);
}

export function tokenJaccard(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (!ta.size || !tb.size) return 0;
  let inter = 0;
  ta.forEach((t) => tb.has(t) && inter++);
  return inter / (ta.size + tb.size - inter);
}

export function matchScore(rawVal: string, option: string): number {
  const a = norm(rawVal);
  const b = norm(option);
  if (!a || !b) return 0;
  if (a === b) return 1;
  let s = 0;
  if (b.startsWith(a) || a.startsWith(b)) s = Math.max(s, 0.88);
  if (b.includes(a) || a.includes(b))
    s = Math.max(s, 0.8 * (Math.min(a.length, b.length) / Math.max(a.length, b.length)) + 0.12);
  s = Math.max(s, tokenJaccard(a, b) * 0.92);
  s = Math.max(s, levSim(a, b) * 0.85);
  if (!/\s/.test(String(rawVal).trim()) && String(rawVal).trim().length <= 12) s = Math.max(s, subsequenceScore(a, b));
  return s;
}

export function topMatches(rawVal: string, options: string[], k = 4): MatchSuggestion[] {
  return options
    .map((option) => ({ option, score: matchScore(rawVal, option), source: "text" as const }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .filter((m) => m.score > 0.25);
}
