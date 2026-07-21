/** bundled reference picklist (University + City), auto-loaded on startup; swap this file to update it */
export const BUILT_IN_PICKLIST_URL = "/docs/consolidated_cities_unis.csv";

/* ---- optional semantic matching model ---- */
export const EMBEDDING_MODEL_ID = "Xenova/all-MiniLM-L6-v2";
/** quantized (~23MB) vs. fp32 (~90MB) - keeps the one-time download small */
export const EMBEDDING_MODEL_DTYPE = "q8";
export const EMBEDDING_MODEL_SIZE_LABEL = "~23MB";

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
