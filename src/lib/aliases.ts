import { norm } from "./text";

/**
 * Deterministic, rule-based alias matching for institution-style names (e.g. "CUA" -> "Catholic
 * University of America (DC)", "The George Washington" -> "George Washington University (DC)").
 * Unlike the fuzzy/semantic matchers, this is precise enough to auto-accept: every alias is
 * generated from the option list itself, and any alias two different options would both produce
 * is dropped rather than guessed at (see buildAliasMap).
 */

const ACRONYM_STOPWORDS = new Set(["of", "the", "and", "in", "for", "at"]);
const GENERIC_SUFFIX_WORDS = new Set(["university", "college", "institute", "school"]);
/** common informal word substitutions people type in place of the full word, wherever it appears */
const WORD_ABBREVIATIONS: Record<string, string> = { university: "uni" };

/** drops a trailing "(STATE)"/"(Country)" or " - STATE"/" - Country" suffix */
function stripKnownSuffix(name: string): string {
  return name
    .replace(/\s*\([^)]*\)\s*$/, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
}

function significantWords(name: string): string[] {
  return norm(name)
    .split(" ")
    .filter((w) => w && !ACRONYM_STOPWORDS.has(w));
}

/** "Catholic University of America" -> "cua" */
function buildAcronym(strippedName: string): string | null {
  const words = significantWords(strippedName);
  if (words.length < 2) return null;
  const acronym = words.map((w) => w[0]).join("");
  return acronym.length >= 2 ? acronym : null;
}

/** "Catholic University of America" -> "catholic u" */
function buildUniversityShorthand(strippedName: string): string | null {
  const normed = norm(strippedName);
  const idx = normed.indexOf(" university");
  if (idx <= 0) return null;
  const before = normed.slice(0, idx).trim();
  return before ? `${before} u` : null;
}

/** "University Records" -> "uni records", "Boston University" -> "boston uni" */
function buildWordAbbreviationVariant(strippedName: string): string | null {
  const words = norm(strippedName).split(" ");
  let changed = false;
  const variant = words.map((w) => {
    const short = WORD_ABBREVIATIONS[w];
    if (!short) return w;
    changed = true;
    return short;
  });
  return changed ? variant.join(" ") : null;
}

/** "George Washington University" -> "george washington" */
function buildCoreWithoutGenericSuffix(strippedName: string): string | null {
  const words = norm(strippedName).split(" ");
  const last = words[words.length - 1];
  if (words.length > 1 && GENERIC_SUFFIX_WORDS.has(last)) {
    return words.slice(0, -1).join(" ");
  }
  return null;
}

/** normalized alias -> canonical option; only for aliases that uniquely identify a single option */
export function buildAliasMap(options: string[]): Map<string, string> {
  const candidates = new Map<string, Set<string>>();
  const add = (alias: string | null, canonical: string) => {
    if (!alias) return;
    const n = norm(alias);
    if (!n || n === norm(canonical)) return;
    if (!candidates.has(n)) candidates.set(n, new Set());
    candidates.get(n)!.add(canonical);
  };

  options.forEach((option) => {
    const stripped = stripKnownSuffix(option);
    add(stripped, option);
    add(buildAcronym(stripped), option);
    add(buildUniversityShorthand(stripped), option);
    add(buildCoreWithoutGenericSuffix(stripped), option);
    add(buildWordAbbreviationVariant(stripped), option);
  });

  const aliasMap = new Map<string, string>();
  candidates.forEach((canonicals, alias) => {
    if (canonicals.size === 1) aliasMap.set(alias, [...canonicals][0]);
  });
  return aliasMap;
}

export function lookupAlias(aliasMap: Map<string, string>, rawValue: string): string | null {
  const n = norm(rawValue);
  if (aliasMap.has(n)) return aliasMap.get(n)!;
  if (n.startsWith("the ")) {
    const stripped = n.slice(4);
    if (aliasMap.has(stripped)) return aliasMap.get(stripped)!;
  }
  return null;
}
