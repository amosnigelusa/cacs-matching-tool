import type { MatchSuggestion } from "./types";

/**
 * Raw cosine similarity doesn't sit on the same scale as the string-matching scores -
 * unrelated concepts still often land at 0.1-0.3 with MiniLM embeddings, so semantic
 * candidates need a higher floor than the 0.25 used for string suggestions.
 */
export const SEMANTIC_MIN_SCORE = 0.35;

/** embeddings are computed with {pooling:"mean", normalize:true}, so cosine similarity = dot product */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot;
}

export function topSemanticMatches(
  valueEmbedding: Float32Array,
  options: string[],
  optionEmbeddings: Float32Array[],
  k = 4,
): MatchSuggestion[] {
  return options
    .map((option, i) => ({ option, score: cosineSimilarity(valueEmbedding, optionEmbeddings[i]), source: "semantic" as const }))
    .sort((x, y) => y.score - x.score)
    .slice(0, k)
    .filter((m) => m.score > SEMANTIC_MIN_SCORE);
}

/** merge text- and semantic-sourced suggestions for one value into one ranked list, keeping the higher score per option */
export function mergeSuggestions(text: MatchSuggestion[], semantic: MatchSuggestion[], k = 4): MatchSuggestion[] {
  if (!semantic.length) return text;
  const byOption = new Map<string, MatchSuggestion>();
  [...text, ...semantic].forEach((s) => {
    const existing = byOption.get(s.option);
    if (!existing || s.score > existing.score) byOption.set(s.option, s);
  });
  return [...byOption.values()].sort((a, b) => b.score - a.score).slice(0, k);
}
