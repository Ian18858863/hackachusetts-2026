// HPO helpers: JAX HPO API client (term lookup, search), frequency
// normalisation, and the label matching used by grounding.

import { getJson } from "./http";
import { InvalidInput } from "./errors";
import type { DataVersions, EngineDeps, FrequencyLabel, HpoId, HpoTerm } from "./types";

const JAX_BASE = "https://ontology.jax.org/api/hp";

/**
 * HPO release reported in dataVersions.hpo (open question 6).
 *
 * latest obophenotype release as of 2026-10-24, served via the JAX ontology
 * API; checked by the GitHub releases API.
 *
 * Evidence, 2026-10-24 14:43-14:44 ET:
 * - GET https://api.github.com/repos/obophenotype/human-phenotype-ontology/releases/latest
 *   -> tag v2026-09-01, "2026-09-01 Release", published 2026-09-03T06:08:39Z,
 *   not a draft or prerelease.
 * - Its release notes list 69 HPO terms added in that release (e.g.
 *   HP:6001509, HP:6001524). GET https://ontology.jax.org/api/hp/terms/{id}
 *   returned 200 with a name for all 69, so JAX serves at least v2026-09-01;
 *   with no later release published, that is v2026-09-01.
 *
 * Limitation: this is indirect. The JAX API itself has no version field
 * (term and search JSON, response headers) and /api/hp/version, /api/version,
 * /api/hp/info, /api/hp/release and /api/hp/metadata answer 404, so JAX could
 * in principle serve an unreleased build newer than v2026-09-01. Re-check
 * when a newer HPO release appears.
 *
 * Recordings in engine/demo/recorded/ were made before this check and keep
 * the "unknown" they were recorded with.
 */
export const HPO_VERSION = "2026-09-01";

export const HPO_ID_RE = /^HP:\d{7}$/;

/** "hp_0001250" / " HP:0001250 " -> "HP:0001250"; null if it is not an HPO id. */
export function normalizeHpoId(raw: unknown): HpoId | null {
  if (typeof raw !== "string") return null;
  const id = raw.trim().toUpperCase().replace(/^HP_/, "HP:");
  return HPO_ID_RE.test(id) ? id : null;
}

// ---------------------------------------------------------------- JAX client

interface JaxTerm {
  id: string;
  name: string;
  definition?: string;
  synonyms?: string[];
}

function asJaxTerm(value: unknown): JaxTerm | null {
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const id = normalizeHpoId(v.id);
  if (!id || v.name.trim() === "" || /^obsolete\b/i.test(v.name)) return null;
  const synonyms = Array.isArray(v.synonyms)
    ? v.synonyms.filter((s): s is string => typeof s === "string" && s.trim() !== "")
    : [];
  const term: JaxTerm = { id, name: v.name, synonyms };
  if (typeof v.definition === "string" && v.definition !== "") term.definition = v.definition;
  return term;
}

function toHpoTerm(t: JaxTerm): HpoTerm {
  const term: HpoTerm = { id: t.id, label: t.name };
  if (t.definition !== undefined) term.definition = t.definition;
  if (t.synonyms && t.synonyms.length > 0) term.synonyms = [...t.synonyms];
  return term;
}

/** GET /api/hp/terms/{id}. Null when the id does not exist (404) or the record is unusable. */
export async function lookupTerm(id: HpoId, deps: EngineDeps): Promise<HpoTerm | null> {
  const body = await getJson("hpoTerm", `${JAX_BASE}/terms/${encodeURIComponent(id)}`, deps);
  const term = asJaxTerm(body);
  return term && term.id === id ? toHpoTerm(term) : null;
}

/** GET /api/hp/search?q=&limit=. Results in API order; unusable rows are skipped. */
export async function searchHpo(q: string, limit: number, deps: EngineDeps): Promise<HpoTerm[]> {
  const url = `${JAX_BASE}/search?q=${encodeURIComponent(q)}&limit=${limit}`;
  const body = await getJson("hpoSearch", url, deps);
  if (body === null) return [];
  const rows = (body as { terms?: unknown }).terms;
  if (!Array.isArray(rows)) return [];
  const out: HpoTerm[] = [];
  for (const row of rows) {
    const t = asJaxTerm(row);
    if (t) out.push(toHpoTerm(t));
  }
  return out;
}

/** Term search for manual entry (GET /api/terms). q 2-100 chars, limit 1-20. */
export async function searchTerms(
  q: string,
  limit: number,
  deps: EngineDeps,
): Promise<{ terms: HpoTerm[]; dataVersions: DataVersions }> {
  const query = typeof q === "string" ? q.trim() : "";
  if (query.length < 2 || query.length > 100) throw new InvalidInput("q", "2-100 characters");
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) throw new InvalidInput("limit", "1-20");
  const now = deps.now ?? (() => new Date());
  const terms = await searchHpo(query, limit, deps);
  return { terms, dataVersions: { hpo: HPO_VERSION, fetchedAt: now().toISOString() } };
}

// ------------------------------------------------------------ label matching

/** Singular form of one lower-case word; conservative so Latin-ish terms keep their ending. */
function singularWord(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(?:ss|sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !/(?:ss|us|is|ys|as)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** Lower case, NFKC, hyphens/underscores/slashes as spaces, other punctuation dropped, single spaces. */
function plainWords(label: string): string[] {
  return label
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w !== "");
}

/**
 * Search queries to try for a proposed label, in order and deduplicated:
 * the label as given, its punctuation-free form, and its singular form.
 * The JAX search ranks "Seizures" -> HP:0001250 only 9th, "Seizure" 1st (2026-10-24).
 */
export function searchVariants(label: string): string[] {
  const words = plainWords(label);
  const variants = [label.trim(), words.join(" "), words.map(singularWord).join(" ")];
  return [...new Set(variants)].filter((q) => q.length >= 2);
}

/**
 * Canonical form for comparing a proposed label with HPO names and synonyms:
 * Unicode NFKC, lower case, hyphens/underscores/slashes as spaces, other
 * punctuation dropped, single spaces, each word singularised.
 * "Seizures" and "seizure" both give "seizure".
 */
export function labelKey(label: string): string {
  return plainWords(label).map(singularWord).join(" ");
}

/** True if `label` equals the term's primary name or one of its synonyms (labelKey-tolerant). */
export function termMatchesLabel(term: HpoTerm, label: string): boolean {
  const key = labelKey(label);
  if (key === "") return false;
  if (labelKey(term.label) === key) return true;
  return (term.synonyms ?? []).some((s) => labelKey(s) === key);
}

// ---------------------------------------------------------- frequency bands

const BAND_LABELS: readonly FrequencyLabel[] = [
  "Obligate",
  "Very frequent",
  "Frequent",
  "Occasional",
  "Very rare",
  "Excluded",
];

// HPO frequency terms (subclasses of HP:0040279 "Frequency").
const BAND_BY_HPO_ID: Readonly<Record<string, FrequencyLabel>> = {
  "HP:0040280": "Obligate",
  "HP:0040281": "Very frequent",
  "HP:0040282": "Frequent",
  "HP:0040283": "Occasional",
  "HP:0040284": "Very rare",
  "HP:0040285": "Excluded",
};

/**
 * Band for a percentage in [0, 100], using lower-bound thresholds so values
 * between the contract's integer ranges (e.g. 79.5 %, 4.5 %, 0.5 %) have a band:
 * 100 Obligate, >= 80 Very frequent, >= 30 Frequent, >= 5 Occasional,
 * > 0 Very rare, 0 Excluded. (Proposed clarification of CONTRACT.md section 5.)
 */
function bandForPercent(p: number): FrequencyLabel {
  if (p >= 100) return "Obligate";
  if (p >= 80) return "Very frequent";
  if (p >= 30) return "Frequent";
  if (p >= 5) return "Occasional";
  if (p > 0) return "Very rare";
  return "Excluded";
}

/** Same thresholds as bandForPercent, compared in integers to avoid float error. */
function bandForFraction(n: number, m: number): FrequencyLabel {
  const scaled = n * 100; // n/m >= t/100  <=>  n*100 >= t*m
  if (n === m) return "Obligate";
  if (scaled >= 80 * m) return "Very frequent";
  if (scaled >= 30 * m) return "Frequent";
  if (scaled >= 5 * m) return "Occasional";
  if (n > 0) return "Very rare";
  return "Excluded";
}

const FRACTION_RE = /^(\d+)\s*\/\s*(\d+)$/;
const PERCENT_RE = /^(\d+(?:\.\d+)?)\s*%$/;

/**
 * Map a raw frequency from HPO annotations to an HPO band.
 * Accepts band names (case-insensitive), HPO frequency term ids, "n/m" with
 * 0 <= n <= m and m > 0, and "x%" with 0 <= x <= 100.
 * Returns null for empty, unknown or out-of-range input; never guesses.
 */
export function normalizeFrequency(raw: string | undefined | null): FrequencyLabel | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim();
  if (value === "") return null;

  const lower = value.toLowerCase();
  const band = BAND_LABELS.find((label) => label.toLowerCase() === lower);
  if (band) return band;

  const byId = BAND_BY_HPO_ID[value.toUpperCase()];
  if (byId) return byId;

  const fraction = FRACTION_RE.exec(value);
  if (fraction) {
    const n = Number(fraction[1]);
    const m = Number(fraction[2]);
    if (!Number.isSafeInteger(n) || !Number.isSafeInteger(m) || m <= 0 || n > m) return null;
    return bandForFraction(n, m);
  }

  const percent = PERCENT_RE.exec(value);
  if (percent) {
    const p = Number(percent[1]);
    if (!Number.isFinite(p) || p > 100) return null;
    return bandForPercent(p);
  }

  return null;
}
