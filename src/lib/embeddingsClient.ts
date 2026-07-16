import type {
  EmbedColumnRequest,
  EmbeddingsWorkerRequestMsg,
  EmbeddingsWorkerResponseMsg,
  ModelStatusMsg,
  SemanticSuggestions,
} from "./types";

type StatusListener = (msg: ModelStatusMsg) => void;
type ResultListener = (suggestions: SemanticSuggestions) => void;

let worker: Worker | null = null;
let generation = 0;
let statusListener: StatusListener | null = null;
let resultListener: ResultListener | null = null;

function ensureWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/embeddings.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<EmbeddingsWorkerResponseMsg>) => {
      const msg = event.data;
      if (msg.type === "MODEL_STATUS") {
        statusListener?.(msg);
        return;
      }
      // discard stale responses superseded by a newer request
      if (msg.requestId === generation) resultListener?.(msg.suggestions);
    };
  }
  return worker;
}

export function onModelStatus(cb: StatusListener): void {
  statusListener = cb;
}

export function onEmbedResult(cb: ResultListener): void {
  resultListener = cb;
}

/** lazily spins up the worker and starts the (only) model download - never call this before the user opts in */
export function loadSemanticModel(): void {
  const msg: EmbeddingsWorkerRequestMsg = { type: "LOAD" };
  ensureWorker().postMessage(msg);
}

export function requestEmbedSuggestions(columns: EmbedColumnRequest[]): number {
  generation += 1;
  const msg: EmbeddingsWorkerRequestMsg = { type: "EMBED_BATCH", requestId: generation, columns };
  ensureWorker().postMessage(msg);
  return generation;
}
