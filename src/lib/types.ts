export const PASSTHROUGH = "__passthrough__";

export interface Picklist {
  name: string;
  fileName: string;
  columns: Record<string, string[]>;
  activeColumn: string;
  /** true for the app's bundled reference picklists (e.g. university/city), loaded automatically */
  builtIn?: boolean;
}

export interface RawData {
  headers: string[];
  rows: string[][];
}

/** headerIndex -> picklist name | PASSTHROUGH */
export type ColumnMap = Record<number, string>;

/**
 * "all" - every distinct value
 * "unresolved" - strictly nothing decided yet (no mapped value at all)
 * "matched" - already has a mapped value, of any source
 * "needs-review" - unresolved, plus auto/alias matches worth a second look
 */
export type FilterMode = "all" | "unresolved" | "matched" | "needs-review";

/** headerIndex -> { rawValue: mapped } ("" = blank) */
export type ValueMaps = Record<number, Record<string, string>>;

export type SuggestionSource = "text" | "semantic" | "alias";

export interface MatchSuggestion {
  option: string;
  score: number;
  source: SuggestionSource;
}

export interface ValueRecord {
  value: string;
  count: number;
  exact: string | null;
  blank: boolean;
  suggestions: MatchSuggestion[];
}

export interface AnalysisColumn {
  header: string;
  picklist: string;
  options: string[];
  values: ValueRecord[];
}

/** headerIndex -> AnalysisColumn, only for columns attached to a picklist */
export type Analysis = Record<number, AnalysisColumn>;

export type EffectiveSource = "manual" | "auto-blank" | "exact" | "alias" | "auto" | "unresolved";

export interface EffectiveMapping {
  mapped: string | null;
  source: EffectiveSource;
}

/** saved-mapping JSON shape, keyed by header name so it survives column reordering */
export interface MappingFile {
  columnMap: Record<string, string>;
  valueMaps: Record<string, Record<string, string>>;
}

export interface SetRawMsg {
  type: "SET_RAW";
  raw: RawData;
}

export interface AnalyzeRequestMsg {
  type: "ANALYZE";
  requestId: number;
  columnMap: ColumnMap;
  picklists: Record<string, Picklist>;
}

export type WorkerRequestMsg = SetRawMsg | AnalyzeRequestMsg;

export interface WorkerResponseMsg {
  requestId: number;
  analysis: Analysis;
}

/* ---- embeddings (semantic matching) worker messages ---- */

export type ModelStatus = "idle" | "loading" | "ready" | "error";

export interface LoadModelMsg {
  type: "LOAD";
}

export interface EmbedColumnRequest {
  hi: number;
  /** cache key for this picklist's option embeddings, e.g. `${picklistName}::${activeColumn}` */
  picklistKey: string;
  options: string[];
  /** distinct raw values needing semantic suggestions (already known !exact && !blank) */
  values: string[];
}

export interface EmbedBatchRequestMsg {
  type: "EMBED_BATCH";
  requestId: number;
  columns: EmbedColumnRequest[];
}

export type EmbeddingsWorkerRequestMsg = LoadModelMsg | EmbedBatchRequestMsg;

export interface ModelStatusMsg {
  type: "MODEL_STATUS";
  status: ModelStatus;
  /** 0-100, present while status === "loading" */
  progress?: number;
  error?: string;
}

/** headerIndex -> rawValue -> semantic-sourced suggestions for that value */
export type SemanticSuggestions = Record<number, Record<string, MatchSuggestion[]>>;

export interface EmbedBatchResultMsg {
  type: "EMBED_RESULT";
  requestId: number;
  suggestions: SemanticSuggestions;
}

export type EmbeddingsWorkerResponseMsg = ModelStatusMsg | EmbedBatchResultMsg;
