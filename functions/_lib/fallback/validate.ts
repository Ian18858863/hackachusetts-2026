// Input validation shared by the T18b functions (docs/CONTRACT.md sections 4
// and 7.4-7.7). Each check returns a plain-English message for 400
// INVALID_REQUEST, or the cleaned value.

import type { DiseaseId, HpoId } from "../../../engine/index";

export const HPO_ID_RE = /^HP:\d{7}$/;
export const DISEASE_ID_RE = /^(ORPHA|OMIM|MONDO):\d{1,9}$/;

export type Checked<T> = { ok: true; value: T } | { ok: false; message: string };

/** Sorted, deduplicated list of HPO ids; `min`..`max` items after dedupe. */
export function hpoIdList(value: unknown, field: string, min: number, max: number): Checked<HpoId[]> {
  if (value === undefined || value === null) {
    return min === 0 ? { ok: true, value: [] } : { ok: false, message: `\`${field}\` is required: a list of HPO ids such as "HP:0001250".` };
  }
  if (!Array.isArray(value)) return { ok: false, message: `\`${field}\` must be a list of HPO ids such as "HP:0001250".` };
  if (value.length > max * 4) return { ok: false, message: `\`${field}\` may hold at most ${max} HPO ids.` };
  for (const id of value as unknown[]) {
    if (typeof id !== "string" || !HPO_ID_RE.test(id)) {
      return { ok: false, message: `\`${field}\` contains an id that is not an HPO id (format HP:0000000).` };
    }
  }
  const ids = [...new Set(value as string[])].sort();
  if (ids.length < min) {
    return { ok: false, message: min === 1 ? `\`${field}\` needs at least one HPO id. Keep at least one feature as present.` : `\`${field}\` needs at least ${min} HPO ids.` };
  }
  if (ids.length > max) return { ok: false, message: `\`${field}\` may hold at most ${max} HPO ids.` };
  return { ok: true, value: ids };
}

/** Whole number in [min, max], or `fallback` when absent. */
export function intInRange(value: unknown, field: string, min: number, max: number, fallback: number): Checked<number> {
  if (value === undefined || value === null) return { ok: true, value: fallback };
  if (typeof value !== "number" || !Number.isInteger(value) || value < min || value > max) {
    return { ok: false, message: `\`${field}\` must be a whole number from ${min} to ${max}.` };
  }
  return { ok: true, value };
}

/** Disease ids in request order, deduplicated; `min`..`max` items. */
export function diseaseIdList(value: unknown, field: string, min: number, max: number): Checked<DiseaseId[]> {
  if (!Array.isArray(value)) {
    return { ok: false, message: `\`${field}\` is required: a list of ${min} to ${max} disease ids such as "ORPHA:646".` };
  }
  for (const id of value as unknown[]) {
    if (typeof id !== "string" || !DISEASE_ID_RE.test(id)) {
      return { ok: false, message: `\`${field}\` contains an id that is not an ORPHA, OMIM or MONDO id.` };
    }
  }
  const ids = [...new Set(value as string[])];
  if (ids.length < min || ids.length > max) {
    return { ok: false, message: `\`${field}\` needs ${min} to ${max} different disease ids.` };
  }
  return { ok: true, value: ids };
}

/** First id present in both lists, if any. */
export function overlapId(a: readonly string[], b: readonly string[]): string | undefined {
  const set = new Set(b);
  return a.find((id) => set.has(id));
}
