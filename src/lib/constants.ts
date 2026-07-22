/**
 * Bundled picklist CSVs under public/docs, auto-loaded on startup as "default" picklists -
 * no need to drag-and-drop them every time. Swap/edit a file and redeploy to update it.
 *
 * mode "columns": each column of the file becomes its own independent picklist (used for the
 *   combined University/City/Knowledge Source reference file).
 * mode "rows": the file is one picklist, first column is the option list (same as a
 *   user-uploaded picklist file) - used for the standard single-field 12twenty exports.
 */
// Note: "Knowledge Source.csv" (the full 10-value official picklist) is intentionally NOT
// included here. consolidated_cities_unis.csv already provides a single-option "Knowledge
// Source" picklist (just "University Records") so every value in that field auto-corrects to
// University Records, per an earlier explicit request. Loading both would let this list's exact
// matches (e.g. "Student Reported") bypass that auto-correction, so this file stays
// drag-and-drop-only if it's ever needed.
export const BUILT_IN_PICKLISTS: { url: string; mode: "columns" | "rows" }[] = [
  { url: "/docs/consolidated_cities_unis.csv", mode: "columns" },
  { url: "/docs/Consolidated Industry.csv", mode: "rows" },
  { url: "/docs/Consolidated Job Function.csv", mode: "rows" },
  { url: "/docs/Outcome Type.csv", mode: "rows" },
  { url: "/docs/Job Offer Status.csv", mode: "rows" },
  { url: "/docs/Service Duration.csv", mode: "rows" },
  { url: "/docs/Area of Study.csv", mode: "rows" },
  { url: "/docs/Year.csv", mode: "rows" },
  { url: "/docs/State or Province.csv", mode: "rows" },
  { url: "/docs/Country.csv", mode: "rows" },
];

/* ---- optional semantic matching model ---- */
export const EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
/** quantized (~23MB) vs. fp32 (~90MB) - keeps the one-time download small */
export const EMBEDDING_MODEL_DTYPE = "q8";
export const EMBEDDING_MODEL_SIZE_LABEL = "~23MB";

/**
 * Picklists where a value legitimately might not exist yet (an open-ended reference list, not a
 * fixed 12twenty controlled vocabulary) - these get an "add new option" affordance in the review
 * UI. Matched against Picklist.name, lowercased.
 */
export const MANUALLY_EXTENSIBLE_PICKLISTS = new Set(["university", "city"]);

/** known 12twenty picklist -> data column pairings */
export const PICKLIST_TO_COLUMN: Record<string, string> = {
  "consolidated industry": "Industry",
  "consolidated job function": "Function",
  school: "University",
  "area of study": "Expected Field of Study",
  year: "When do you expect to begin your graduate program?",
  "state or province": "US State / Canada Province",
  city: "City",
  country: "Country",
  "knowledge source": "Knowledge Source",
  "service duration": "Fellowship Duration",
};
