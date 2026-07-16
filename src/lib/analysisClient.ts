import type { Analysis, ColumnMap, Picklist, RawData, WorkerRequestMsg, WorkerResponseMsg } from "./types";

type Listener = (analysis: Analysis) => void;

let worker: Worker | null = null;
let generation = 0;
let listener: Listener | null = null;

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/analysis.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<WorkerResponseMsg>) => {
      const { requestId, analysis } = event.data;
      // discard stale responses superseded by a newer request
      if (requestId === generation && listener) listener(analysis);
    };
  }
  return worker;
}

export function onAnalysisResult(cb: Listener): void {
  listener = cb;
}

export function setRawForAnalysis(raw: RawData): void {
  const msg: WorkerRequestMsg = { type: "SET_RAW", raw };
  ensureWorker().postMessage(msg);
}

export function requestAnalysis(columnMap: ColumnMap, picklists: Record<string, Picklist>): number {
  generation += 1;
  const msg: WorkerRequestMsg = { type: "ANALYZE", requestId: generation, columnMap, picklists };
  ensureWorker().postMessage(msg);
  return generation;
}
