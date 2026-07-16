import { pipeline } from "@huggingface/transformers";
import type { FeatureExtractionPipeline } from "@huggingface/transformers";

import { EMBEDDING_MODEL_DTYPE, EMBEDDING_MODEL_ID } from "@/lib/constants";
import { topSemanticMatches } from "@/lib/embeddings";
import { norm } from "@/lib/text";
import type {
  EmbedBatchRequestMsg,
  EmbedBatchResultMsg,
  EmbeddingsWorkerRequestMsg,
  ModelStatusMsg,
  SemanticSuggestions,
} from "@/lib/types";

/* self is a DedicatedWorkerGlobalScope at runtime; cast to Worker for the postMessage/addEventListener
   surface without pulling in the "webworker" lib (which conflicts with this project's "dom" lib). */
const ctx = self as unknown as Worker;

function postStatus(msg: ModelStatusMsg): void {
  ctx.postMessage(msg);
}

let extractorPromise: Promise<FeatureExtractionPipeline> | null = null;

function loadModel(): Promise<FeatureExtractionPipeline> {
  if (!extractorPromise) {
    postStatus({ type: "MODEL_STATUS", status: "loading", progress: 0 });
    extractorPromise = pipeline("feature-extraction", EMBEDDING_MODEL_ID, {
      dtype: EMBEDDING_MODEL_DTYPE,
      progress_callback: (data: { status: string; progress?: number }) => {
        if (data.status === "progress" && typeof data.progress === "number") {
          postStatus({ type: "MODEL_STATUS", status: "loading", progress: Math.round(data.progress) });
        }
      },
    }).then(
      (extractor) => {
        postStatus({ type: "MODEL_STATUS", status: "ready" });
        return extractor;
      },
      (err: unknown) => {
        extractorPromise = null;
        const message = err instanceof Error ? err.message : "Failed to load the matching model.";
        postStatus({ type: "MODEL_STATUS", status: "error", error: message });
        throw err;
      },
    );
  }
  return extractorPromise;
}

async function embedTexts(extractor: FeatureExtractionPipeline, texts: string[]): Promise<Float32Array[]> {
  if (!texts.length) return [];
  const output = await extractor(texts, { pooling: "mean", normalize: true });
  const dim = output.dims[1];
  const flat = output.data as Float32Array;
  return texts.map((_, i) => flat.slice(i * dim, (i + 1) * dim));
}

/** picklistKey -> { contentKey, embeddings } */
const optionEmbeddingCache = new Map<string, { contentKey: string; embeddings: Float32Array[] }>();
/** norm(value) -> embedding */
const valueEmbeddingCache = new Map<string, Float32Array>();

async function getOptionEmbeddings(
  extractor: FeatureExtractionPipeline,
  picklistKey: string,
  options: string[],
): Promise<Float32Array[]> {
  const contentKey = options.join("");
  const cached = optionEmbeddingCache.get(picklistKey);
  if (cached && cached.contentKey === contentKey) return cached.embeddings;
  const embeddings = await embedTexts(extractor, options);
  optionEmbeddingCache.set(picklistKey, { contentKey, embeddings });
  return embeddings;
}

async function getValueEmbeddings(
  extractor: FeatureExtractionPipeline,
  values: string[],
): Promise<Map<string, Float32Array>> {
  const missingByNorm = new Map<string, string>();
  values.forEach((v) => {
    const n = norm(v);
    if (!valueEmbeddingCache.has(n) && !missingByNorm.has(n)) missingByNorm.set(n, v);
  });
  if (missingByNorm.size) {
    const reps = [...missingByNorm.values()];
    const embeddings = await embedTexts(extractor, reps);
    reps.forEach((v, i) => valueEmbeddingCache.set(norm(v), embeddings[i]));
  }
  const result = new Map<string, Float32Array>();
  values.forEach((v) => {
    const emb = valueEmbeddingCache.get(norm(v));
    if (emb) result.set(v, emb);
  });
  return result;
}

async function handleEmbedBatch(msg: EmbedBatchRequestMsg): Promise<void> {
  const extractor = await loadModel();
  const suggestions: SemanticSuggestions = {};

  for (const col of msg.columns) {
    if (!col.values.length || !col.options.length) continue;
    const optionEmbeddings = await getOptionEmbeddings(extractor, col.picklistKey, col.options);
    const valueEmbeddings = await getValueEmbeddings(extractor, col.values);
    const colResult: Record<string, ReturnType<typeof topSemanticMatches>> = {};
    valueEmbeddings.forEach((emb, value) => {
      colResult[value] = topSemanticMatches(emb, col.options, optionEmbeddings);
    });
    suggestions[col.hi] = colResult;
  }

  const response: EmbedBatchResultMsg = { type: "EMBED_RESULT", requestId: msg.requestId, suggestions };
  ctx.postMessage(response);
}

ctx.addEventListener("message", (event: MessageEvent<EmbeddingsWorkerRequestMsg>) => {
  const msg = event.data;
  if (msg.type === "LOAD") {
    loadModel().catch(() => {
      /* status already posted by loadModel */
    });
    return;
  }
  handleEmbedBatch(msg).catch((err: unknown) => {
    postStatus({
      type: "MODEL_STATUS",
      status: "error",
      error: err instanceof Error ? err.message : "Semantic matching failed.",
    });
  });
});
