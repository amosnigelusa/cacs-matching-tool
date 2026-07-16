import { buildAnalysis } from "@/lib/analysis";
import type { RawData, WorkerRequestMsg, WorkerResponseMsg } from "@/lib/types";

/* self is a DedicatedWorkerGlobalScope at runtime; cast to Worker for the postMessage/addEventListener
   surface without pulling in the "webworker" lib (which conflicts with this project's "dom" lib). */
const ctx = self as unknown as Worker;

let cachedRaw: RawData | null = null;

ctx.addEventListener("message", (event: MessageEvent<WorkerRequestMsg>) => {
  const msg = event.data;

  if (msg.type === "SET_RAW") {
    cachedRaw = msg.raw;
    return;
  }

  const analysis = cachedRaw ? buildAnalysis(cachedRaw, msg.columnMap, msg.picklists) : {};
  const response: WorkerResponseMsg = { requestId: msg.requestId, analysis };
  ctx.postMessage(response);
});
