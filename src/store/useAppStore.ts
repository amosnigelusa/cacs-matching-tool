import Papa from "papaparse";
import { create } from "zustand";

import { autoMapColumns as computeAutoMap, mergeSemanticIntoAnalysis } from "@/lib/analysis";
import { onAnalysisResult, requestAnalysis, setRawForAnalysis } from "@/lib/analysisClient";
import { BUILT_IN_PICKLISTS } from "@/lib/constants";
import { buildRawData, parsePicklistColumns, parsePicklistRows } from "@/lib/csv";
import { loadCustomOptions, saveCustomOption } from "@/lib/customOptions";
import { loadSemanticModel, onEmbedResult, onModelStatus, requestEmbedSuggestions } from "@/lib/embeddingsClient";
import { applyMappingImport } from "@/lib/mapping-io";
import { norm } from "@/lib/text";
import type {
  Analysis,
  ColumnMap,
  EmbedColumnRequest,
  FilterMode,
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
  filter: FilterMode;
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
  loadBuiltInPicklists: () => void;
  removePicklist: (name: string) => void;
  addPicklistOption: (picklistName: string, option: string) => void;
  setActiveColumn: (name: string, col: string) => void;
  loadRawFile: (file: File) => void;
  autoMapColumns: () => void;
  setColumnMap: (hi: number, val: string) => void;
  toggleColumn: (hi: number) => void;
  setFilter: (f: FilterMode) => void;
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
    filter: "needs-review",
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

    loadBuiltInPicklists: () => {
      const { picklists } = get();
      if (Object.values(picklists).some((pl) => pl.builtIn)) return;

      Promise.all(
        BUILT_IN_PICKLISTS.map(({ url, mode }) =>
          fetch(encodeURI(url))
            .then((res) => (res.ok ? res.text() : null))
            .then((text) => {
              if (!text) return [];
              const parsed = Papa.parse<string[]>(text, { skipEmptyLines: true });
              const fileName = url.split("/").pop() ?? "built-in";
              const parsedPicklists =
                mode === "columns"
                  ? parsePicklistColumns(fileName, parsed.data)
                  : [parsePicklistRows(fileName, parsed.data)].filter((pl): pl is Picklist => pl !== null);
              return parsedPicklists.map((pl) => ({ ...pl, builtIn: true }));
            })
            .catch(() => [] as Picklist[]), // any single file being unreachable shouldn't block the rest
        ),
      ).then((results) => {
        const newPicklists = results.flat().map((pl) => {
          const custom = loadCustomOptions(pl.name);
          if (!custom.length) return pl;
          const current = pl.columns[pl.activeColumn] || [];
          const toAdd = custom.filter((c) => !current.some((o) => norm(o) === norm(c)));
          if (!toAdd.length) return pl;
          return { ...pl, columns: { ...pl.columns, [pl.activeColumn]: [...current, ...toAdd] } };
        });
        if (!newPicklists.length) return;
        set((s) => {
          const merged = { ...s.picklists };
          newPicklists.forEach((pl) => {
            merged[pl.name] = pl;
          });
          return { picklists: merged };
        });
        triggerAnalysis();
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

    addPicklistOption: (picklistName, option) => {
      const trimmed = option.trim();
      if (!trimmed) return;
      let added = false;
      set((s) => {
        const pl = s.picklists[picklistName];
        if (!pl) return s;
        const current = pl.columns[pl.activeColumn] || [];
        if (current.some((o) => norm(o) === norm(trimmed))) return s;
        added = true;
        return {
          picklists: {
            ...s.picklists,
            [picklistName]: {
              ...pl,
              columns: { ...pl.columns, [pl.activeColumn]: [...current, trimmed] },
            },
          },
        };
      });
      if (added) {
        saveCustomOption(picklistName, trimmed);
        triggerAnalysis();
      }
    },

    setActiveColumn: (name, col) => {
      set((s) => ({
        picklists: { ...s.picklists, [name]: { ...s.picklists[name], activeColumn: col } },
      }));
      triggerAnalysis();
    },

    loadRawFile: (file) => {
      const { raw: prevRaw, valueMaps } = get();
      const hasManualDecisions = Object.values(valueMaps).some((m) => Object.keys(m).length > 0);
      if (prevRaw && hasManualDecisions) {
        const proceed = window.confirm(
          "Replacing the outcomes file will clear your manual value decisions for the current one. " +
            "Click Cancel and use “Save mappings” first if you want to keep them - continue anyway?",
        );
        if (!proceed) return;
      }
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
