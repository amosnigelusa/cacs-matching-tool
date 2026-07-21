"use client";

import { AlertTriangle, CheckCircle2, Loader2, Sparkles } from "lucide-react";

import { EMBEDDING_MODEL_SIZE_LABEL } from "@/lib/constants";
import { useAppStore } from "@/store/useAppStore";

export default function SemanticMatchToggle() {
  const enabled = useAppStore((s) => s.semanticEnabled);
  const status = useAppStore((s) => s.semanticStatus);
  const progress = useAppStore((s) => s.semanticProgress);
  const error = useAppStore((s) => s.semanticError);
  const enable = useAppStore((s) => s.enableSemanticMatching);
  const disable = useAppStore((s) => s.disableSemanticMatching);

  if (!enabled) {
    return (
      <div className="animate-fade-in-up flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs text-slate-500 shadow-sm">
        <span className="flex items-center gap-2">
          <Sparkles size={15} className="shrink-0 text-violet-500" />
          Suggestions above are spelling-based only. Meaning-based matching (e.g. &quot;Nursing&quot; →
          &quot;Healthcare&quot;) needs a small AI model.
        </span>
        <button
          type="button"
          className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-all duration-150 hover:bg-slate-50 active:scale-[0.97]"
          onClick={enable}
        >
          Enable smarter matching ({EMBEDDING_MODEL_SIZE_LABEL}, one-time download)
        </button>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="animate-fade-in-up flex items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-sm">
        <span className="flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          Couldn&apos;t load the matching model{error ? ` (${error})` : ""} — using text matching only.
        </span>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition-all duration-150 hover:bg-rose-100 active:scale-[0.97]"
          onClick={enable}
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="animate-fade-in-up flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs text-brand-800 shadow-sm">
        <span className="flex items-center gap-2">
          <CheckCircle2 size={15} className="shrink-0" />
          Smarter matching on — suggestions now include meaning-based matches, downloaded once and cached.
        </span>
        <button
          type="button"
          className="shrink-0 rounded-lg border border-brand-200 bg-white px-3 py-1.5 text-xs font-medium text-brand-700 transition-all duration-150 hover:bg-brand-100 active:scale-[0.97]"
          onClick={disable}
        >
          Turn off
        </button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up flex items-center justify-between gap-3 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-xs text-slate-600 shadow-sm">
      <span className="flex items-center gap-2">
        <Loader2 size={15} className="shrink-0 animate-spin text-brand-700" />
        Loading smarter matching model… {progress}%
      </span>
      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-200">
        <div className="h-full rounded-full bg-brand-700 transition-all" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}
