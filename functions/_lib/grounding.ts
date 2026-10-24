// Secondary grounding for POST /api/extract (T37).
//
// The engine's groundTerms (engine/ground.ts) runs first and stays the
// authority. This step only looks at proposals the engine dropped with
// "no matching HPO term confirmed" and tries, in order, the model's main label
// and then each of its alternative labels (functions/_lib/llm.ts) against the
// JAX HPO search, whose rows carry the term's synonyms.
//
// A search row is accepted ONLY when the tried label equals the row's primary
// name or one of its synonyms after normalisation, or has exactly the same set
// of words. Normalisation is the engine's labelKey rule (engine/hpo.ts): NFKC,
// lower case, hyphens/underscores/slashes as spaces, other punctuation dropped,
// single spaces, simple plural to singular. The word-set check also ignores
// the words "of", "the", "a" and "an", so "Hypertrophy of the calf muscles"
// equals "Calf muscle hypertrophy". No fuzzy similarity, no edit distance, no
// "top result" guess.
//
// Every recovered term follows the engine's rules: the quote is located in the
// note verbatim (exact, then case-insensitive with unchanged length, skipping
// start positions already used), the label is the HPO primary name, the id
// comes from the HPO API, negation is the proposal's flag, one term per id.
// Recovered terms use the contract's existing fields only: grounding
// "label-search", confidence lowered one step for the main label (contract
// 7.2) and two steps for an alternative label (weaker evidence).
//
// The engine's matching helpers are re-implemented here rather than imported
// so this file has no extension-less imports and runs under `node --test`.
// Keep plainWords / singularWord in step with engine/hpo.ts.
//
// Privacy: queries are model labels, never the note text. Nothing is logged.

export type Confidence = "high" | "medium" | "low";

/** Structural copy of the contract's ExtractedTerm (docs/CONTRACT.md section 5). */
export interface GroundedTerm {
  hpoId: string;
  label: string;
  quote: string;
  start: number;
  end: number;
  negated: boolean;
  confidence: Confidence;
  grounding: "exact-id" | "label-search";
}

export interface SecondaryProposal {
  phrase: string;
  label: string;
  alternatives?: string[];
  negated: boolean;
  confidence: Confidence;
}

export type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

export interface SecondaryOptions {
  fetch: FetchLike;
  /** Cap on JAX search calls for this request (subrequest budget). Default 12. */
  maxLookups?: number;
  /** Absolute time (ms, same clock as `now`) after which no new lookup starts. */
  deadlineAt: number;
  /** Per-call timeout in ms. Default 2000 (contract section 10, HPO search). */
  perCallTimeoutMs?: number;
  now?: () => number;
}

export interface SecondaryStats {
  /** Proposals the engine dropped as unconfirmed and this step retried. */
  retried: number;
  /** Proposals recovered here. */
  recovered: number;
  /** JAX search calls made. */
  lookups: number;
  /** Label tries skipped because the lookup cap or the deadline was reached. */
  skippedByBudget: number;
}

export interface SecondaryResult {
  terms: GroundedTerm[];
  warnings: string[];
  stats: SecondaryStats;
}

export const DEFAULT_MAX_LOOKUPS = 12;
const JAX_SEARCH = "https://ontology.jax.org/api/hp/search";
const SEARCH_LIMIT = 20;
const MAX_ALTERNATIVES = 3;
const IGNORED_WORDS = new Set(["of", "the", "a", "an"]);
const HPO_ID_RE = /^HP:\d{7}$/;

const LOWER: Readonly<Record<Confidence, Confidence>> = { high: "medium", medium: "low", low: "low" };

// ------------------------------------------------------------ normalisation

/** Same as engine/hpo.ts singularWord. */
function singularWord(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return `${w.slice(0, -3)}y`;
  if (/(?:ss|sh|ch|x|z)es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s") && !/(?:ss|us|is|ys|as)$/.test(w)) return w.slice(0, -1);
  return w;
}

/** Same as engine/hpo.ts plainWords. */
function plainWords(label: string): string[] {
  return label
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[-_/]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter((w) => w !== "");
}

/** Same as engine/hpo.ts labelKey. */
export function labelKey(label: string): string {
  return plainWords(label).map(singularWord).join(" ");
}

/** Sorted unique singular words without "of", "the", "a", "an". */
export function wordSetKey(label: string): string {
  const words = new Set(plainWords(label).map(singularWord).filter((w) => !IGNORED_WORDS.has(w)));
  return [...words].sort().join(" ");
}

/** True if `tried` names this term exactly (labelKey) or by the same word set. */
export function namesTerm(term: { name: string; synonyms: string[] }, tried: string): boolean {
  const key = labelKey(tried);
  const set = wordSetKey(tried);
  if (key === "" || set === "") return false;
  for (const name of [term.name, ...term.synonyms]) {
    if (labelKey(name) === key || wordSetKey(name) === set) return true;
  }
  return false;
}

// ------------------------------------------------------------ helpers

/** Same echo as engine/ground.ts show(), so engine warnings can be matched. */
function show(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 57)}...` : flat;
}

/** Same rule as engine/ground.ts locate(). */
function locate(text: string, phrase: string, taken: ReadonlySet<number>): { start: number; end: number } | null {
  const pairs: Array<[string, string]> = [
    [text, phrase],
    [text.toLowerCase(), phrase.toLowerCase()],
  ];
  for (const [hay, needle] of pairs) {
    if (needle === "" || hay.length !== text.length || needle.length !== phrase.length) continue;
    let from = 0;
    for (;;) {
      const at = hay.indexOf(needle, from);
      if (at < 0) break;
      if (!taken.has(at)) return { start: at, end: at + phrase.length };
      from = at + 1;
    }
  }
  return null;
}

interface SearchRow {
  id: string;
  name: string;
  synonyms: string[];
}

/** One JAX search; any failure means "no rows" (this step never fails the request). */
async function searchJax(q: string, opts: SecondaryOptions): Promise<SearchRow[]> {
  const doFetch = opts.fetch;
  const url = `${JAX_SEARCH}?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`;
  try {
    const res = await doFetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(opts.perCallTimeoutMs ?? 2000),
    });
    if (!res.ok) return [];
    const body = (await res.json()) as { terms?: unknown };
    if (!Array.isArray(body?.terms)) return [];
    const rows: SearchRow[] = [];
    for (const r of body.terms) {
      if (typeof r !== "object" || r === null) continue;
      const v = r as Record<string, unknown>;
      if (typeof v.id !== "string" || typeof v.name !== "string") continue;
      if (!HPO_ID_RE.test(v.id) || v.name.trim() === "" || /^obsolete\b/i.test(v.name)) continue;
      const synonyms = Array.isArray(v.synonyms)
        ? v.synonyms.filter((s): s is string => typeof s === "string" && s.trim() !== "")
        : [];
      rows.push({ id: v.id, name: v.name, synonyms });
    }
    return rows;
  } catch {
    return [];
  }
}

/** Labels to try for one proposal: main label, then alternatives; deduplicated, ASCII only (JAX answers 400 otherwise). */
function labelsToTry(p: SecondaryProposal): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const alts = Array.isArray(p.alternatives) ? p.alternatives.slice(0, MAX_ALTERNATIVES) : [];
  for (const raw of [p.label, ...alts]) {
    if (typeof raw !== "string") continue;
    const label = raw.replace(/\s+/g, " ").trim();
    const key = labelKey(label);
    if (label.length < 2 || key === "" || seen.has(key) || !/^[\x20-\x7e]+$/.test(label)) continue;
    seen.add(key);
    out.push(label);
  }
  return out;
}

// ------------------------------------------------------------ main entry

/**
 * Retry the proposals the engine could not confirm. Returns the merged term
 * list (engine terms plus recovered ones, in order of `start`) and the engine
 * warnings with each recovered proposal's drop warning removed.
 *
 * Tries run in rounds: round r searches the r-th label of every still
 * unresolved proposal in parallel, in proposal order, until `maxLookups` or
 * `deadlineAt` is reached. A proposal's labels are therefore tried in order.
 */
export async function recoverUngrounded(
  text: string,
  proposals: SecondaryProposal[],
  primary: { terms: GroundedTerm[]; warnings: string[] },
  opts: SecondaryOptions,
): Promise<SecondaryResult> {
  const now = opts.now ?? Date.now;
  const maxLookups = Math.max(0, Math.floor(opts.maxLookups ?? DEFAULT_MAX_LOOKUPS));
  const stats: SecondaryStats = { retried: 0, recovered: 0, lookups: 0, skippedByBudget: 0 };
  const warnings = [...primary.warnings];
  const terms = [...primary.terms];
  const keptIds = new Set(terms.map((t) => t.hpoId));
  const taken = new Set(terms.map((t) => t.start));

  // Proposals the engine dropped as unconfirmed, matched by its warning text.
  const dropWarning = (phrase: string) => `Dropped '${show(phrase)}': no matching HPO term confirmed`;
  const pending: Array<{ p: SecondaryProposal; labels: string[] }> = [];
  const pendingWarnings = new Map<string, number>();
  for (const w of warnings) pendingWarnings.set(w, (pendingWarnings.get(w) ?? 0) + 1);
  for (const p of proposals) {
    if (typeof p?.phrase !== "string" || p.phrase.trim() === "") continue;
    const w = dropWarning(p.phrase);
    const left = pendingWarnings.get(w) ?? 0;
    if (left === 0) continue;
    pendingWarnings.set(w, left - 1);
    pending.push({ p, labels: labelsToTry(p) });
  }
  stats.retried = pending.length;

  const searches = new Map<string, Promise<SearchRow[]>>();
  const done = new Set<number>();
  const maxRounds = 1 + MAX_ALTERNATIVES;

  for (let round = 0; round < maxRounds; round++) {
    const batch: Array<{ idx: number; label: string; rows: Promise<SearchRow[]> }> = [];
    pending.forEach((item, idx) => {
      if (done.has(idx) || round >= item.labels.length) return;
      const label = item.labels[round];
      const q = label;
      let rows = searches.get(q);
      if (!rows) {
        if (stats.lookups >= maxLookups || now() >= opts.deadlineAt) {
          stats.skippedByBudget++;
          return;
        }
        stats.lookups++;
        rows = searchJax(q, opts);
        searches.set(q, rows);
      }
      batch.push({ idx, label, rows });
    });
    if (batch.length === 0) continue;

    const settled = await Promise.all(batch.map((b) => b.rows));
    batch.forEach((b, i) => {
      if (done.has(b.idx)) return;
      const hit = settled[i].find((row) => namesTerm(row, b.label));
      if (!hit) return;
      const { p } = pending[b.idx];
      done.add(b.idx);
      const original = dropWarning(p.phrase);
      if (keptIds.has(hit.id)) {
        replaceOnce(warnings, original, `Dropped '${show(p.phrase)}': duplicate of ${hit.id} ${hit.name}`);
        return;
      }
      const span = locate(text, p.phrase, taken);
      if (!span || text.slice(span.start, span.end).toLowerCase() !== p.phrase.toLowerCase()) {
        replaceOnce(warnings, original, `Dropped '${show(p.phrase)}': phrase not found in the text`);
        return;
      }
      const base: Confidence = p.confidence === "high" || p.confidence === "medium" ? p.confidence : "low";
      const confidence = round === 0 ? LOWER[base] : LOWER[LOWER[base]];
      taken.add(span.start);
      keptIds.add(hit.id);
      terms.push({
        hpoId: hit.id,
        label: hit.name,
        quote: text.slice(span.start, span.end),
        start: span.start,
        end: span.end,
        negated: p.negated === true,
        confidence,
        grounding: "label-search",
      });
      stats.recovered++;
      removeOnce(warnings, original);
    });
  }

  terms.sort((a, b) => a.start - b.start || a.end - b.end);
  return { terms, warnings, stats };
}

function removeOnce(list: string[], value: string): void {
  const i = list.indexOf(value);
  if (i >= 0) list.splice(i, 1);
}

function replaceOnce(list: string[], value: string, next: string): void {
  const i = list.indexOf(value);
  if (i >= 0) list[i] = next;
}
