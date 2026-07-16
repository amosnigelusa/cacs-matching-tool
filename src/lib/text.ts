const BOM = "﻿";

export const stripBOM = (s: unknown): string => {
  const str = String(s ?? "");
  return str.startsWith(BOM) ? str.slice(BOM.length) : str;
};

export const norm = (s: unknown): string =>
  stripBOM(s)
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const BLANKISH = new Set(["n a", "na", "none", "null", "not applicable", "no answer"]);

export const isBlankish = (v: unknown): boolean => {
  const n = norm(v);
  return n === "" || BLANKISH.has(n);
};
