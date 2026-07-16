import Papa from "papaparse";
import { create } from "zustand";

import { autoMapColumns as computeAutoMap, mergeSemanticIntoAnalysis } from "@/lib/analysis";
import { onAnalysisResult, requestAnalysis, setRawForAnalysis } from "@/lib/analysisClient";
import { buildRawData, parsePicklistRows } from "@/lib/csv";
import { loadSemanticModel, onEmbedResult, onModelStatus, requestEmbedSuggestions } from "@/lib/embeddingsClient";
import { applyMappingImport } from "@/lib/mapping-io";
import type {
  Analysis,
  ColumnMap,
  EmbedColumnRequest,
  MappingFile,
  ModelStatus,
  Picklist,
  RawData,
  SemanticSuggestions,
  ValueMaps,
} from "@/lib/types";

interface AppState {
  picklists: Record<string, Picklist>;
  raw: RawData | null;
  rawFile: string | null;
  columnMap: ColumnMap;
  valueMaps: ValueMaps;
  openCol: number | null;
  filter: "all" | "unresolved";
  /** string-matching-only pass, from analysis.worker.ts */
  baseAnalysis: Analysis;
  /** baseAnalysis with semantic suggestions layered in (when enabled) - what the UI reads */
  analysis: Analysis;
  analysisStatus: "idle" | "analyzing" | "ready";

  semanticEnabled: boolean;
  semanticStatus: ModelStatus;
  semanticProgress: number;
  semanticError: string | null;
  semanticSuggestions: SemanticSuggestions;

  loadPicklistFiles: (files: FileList) => void;
  removePicklist: (name: string) => void;
  setActiveColumn: (name: string, col: string) => void;
  loadRawFile: (file: File) => void;
  autoMapColumns: () => void;
  setColumnMap: (hi: number, val: string) => void;
  toggleColumn: (hi: number) => void;
  setFilter: (f: "all" | "unresolved") => void;
  setValueMapping: (hi: number, rawValue: string, mapped: string) => void;
  importMapping: (file: File) => Promise<void>;
  enableSemanticMatching: () => void;
  disableSemanticMatching: () => void;
}

export const useAppStore = create<AppState>((set, get) => {
  function recomputeAnalysis() {
    const { baseAnalysis, semanticSuggestions } = get();
    set({ analysis: mergeSemanticIntoAnalysis(baseAnalysis, semanticSuggestions) });
  }

  /** re-sends every currently-unresolved-eligible value for semantic scoring - safe/cheap to call
   *  repeatedly since the embeddings worker caches embeddings internally, and always replaces
   *  (never incrementally merges) semanticSuggestions so nothing from a prior dataset can linger */
  function triggerSemanticRequest() {
    const { baseAnalysis, picklists, semanticEnabled, semanticStatus } = get();
    if (!semanticEnabled || semanticStatus !== "ready") return;
    const columns: EmbedColumnRequest[] = Object.entries(baseAnalysis)
      .map(([hiStr, col]) => {
        const pl = picklists[col.picklist];
        const picklistKey = pl ? `${pl.name}::${pl.activeColumn}` : col.picklist;
        const values = col.values.filter((v) => !v.exact && !v.blank).map((v) => v.value);
        return { hi: Number(hiStr), picklistKey, options: col.options, values };
      })
      .filter((c) => c.values.length > 0);

    if (!columns.length) {
      set({ semanticSuggestions: {} });
      recomputeAnalysis();
      return;
    }
    requestEmbedSuggestions(columns);
  }

  function triggerAnalysis() {
    const { raw, columnMap, picklists } = get();
    if (!raw) {
      set({ baseAnalysis: {}, analysis: {}, analysisStatus: "ready", semanticSuggestions: {} });
      return;
    }
    set({ analysisStatus: "analyzing" });
    requestAnalysis(columnMap, picklists);
  }

  onAnalysisResult((baseAnalysis) => {
    set({ baseAnalysis, analysisStatus: "ready" });
    recomputeAnalysis();
    triggerSemanticRequest();
  });

  onModelStatus((msg) => {
    set({
      semanticStatus: msg.status,
      semanticProgress: msg.progress ?? 0,
      semanticError: msg.error ?? null,
    });
    if (msg.status === "ready") triggerSemanticRequest();
  });

  onEmbedResult((suggestions) => {
    set({ semanticSuggestions: suggestions });
    recomputeAnalysis();
  });

  return {
    picklists: {},
    raw: null,
    rawFile: null,
    columnMap: {},
    valueMaps: {},
    openCol: null,
    filter: "unresolved",
    baseAnalysis: {},
    analysis: {},
    analysisStatus: "idle",

    semanticEnabled: false,
    semanticStatus: "idle",
    semanticProgress: 0,
    semanticError: null,
    semanticSuggestions: {},

    loadPicklistFiles: (files) => {
      Array.from(files).forEach((file) => {
        Papa.parse(file, {
          skipEmptyLines: true,
          worker: true,
          complete: (res) => {
            const pl = parsePicklistRows(file.name, res.data as string[][]);
            if (!pl) return;
            set((s) => ({ picklists: { ...s.picklists, [pl.name]: pl } }));
            triggerAnalysis();
          },
        });
      });
    },

    removePicklist: (name) => {
      set((s) => {
        const next = { ...s.picklists };
        delete next[name];
        return { picklists: next };
      });
      triggerAnalysis();
    },

    setActiveColumn: (name, col) => {
      set((s) => ({
        picklists: { ...s.picklists, [name]: { ...s.picklists[name], activeColumn: col } },
      }));
      triggerAnalysis();
    },

    loadRawFile: (file) => {
      Papa.parse(file, {
        skipEmptyLines: true,
        worker: true,
        complete: (res) => {
          const raw = buildRawData(res.data as string[][]);
          if (!raw) return;
          setRawForAnalysis(raw);
          set({ raw, rawFile: file.name, columnMap: {}, valueMaps: {}, openCol: null });
          triggerAnalysis();
        },
      });
    },

    autoMapColumns: () => {
      const { raw, picklists } = get();
      if (!raw || !Object.keys(picklists).length) return;
      set({ columnMap: computeAutoMap(raw, picklists) });
      triggerAnalysis();
    },

    setColumnMap: (hi, val) => {
      set((s) => ({ columnMap: { ...s.columnMap, [hi]: val } }));
      triggerAnalysis();
    },

    toggleColumn: (hi) => set((s) => ({ openCol: s.openCol === hi ? null : hi })),

    setFilter: (f) => set({ filter: f }),

    setValueMapping: (hi, rawValue, mapped) => {
      set((s) => ({
        valueMaps: { ...s.valueMaps, [hi]: { ...(s.valueMaps[hi] || {}), [rawValue]: mapped } },
      }));
    },

    importMapping: (file) =>
      new Promise<void>((resolve, reject) => {
        const rd = new FileReader();
        rd.onload = () => {
          let parsed: Partial<MappingFile>;
          try {
            parsed = JSON.parse(String(rd.result));
          } catch {
            reject(new Error("That file doesn't look like a saved mapping JSON."));
            return;
          }
          const { raw, columnMap, valueMaps } = get();
          if (!raw) {
            reject(new Error("Load your outcomes data file first, then load mappings."));
            return;
          }
          set(applyMappingImport(raw, columnMap, valueMaps, parsed));
          triggerAnalysis();
          resolve();
        };
        rd.onerror = () => reject(new Error("Could not read that file."));
        rd.readAsText(file);
      }),

    enableSemanticMatching: () => {
      set({ semanticEnabled: true });
      loadSemanticModel();
      triggerSemanticRequest();
    },

    disableSemanticMatching: () => {
      set({ semanticEnabled: false, semanticSuggestions: {} });
      recomputeAnalysis();
    },
  };
});
