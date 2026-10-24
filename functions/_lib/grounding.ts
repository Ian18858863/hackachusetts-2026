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
// 7.2) and two steps for an alternative label (weaker evidence). A term found
// through an alternative label is never added silently: it gets a warning
// in the response's warnings list (contract 7.2, R2.2/R2.8).
//
// Subrequest budget: the Workers free plan allows 50 subrequests per
// invocation. secondaryLookupCap() turns what the request already used into
// the cap for this step; estimateEngineSubrequests() gives a conservative
// count for the engine's groundTerms.
//
// The engine's matching helpers are re-implemented here rather than imported
// so this file has no extension-less imports and runs under `node --test`.
// Keep plainWords / singularWord in step with engine/hpo.ts.
//
// Privacy: queries are model labels, never the note text. Nothing is logged
// here; the caller logs counts only.

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
  /** JAX search calls that failed (network, timeout, non-2xx, bad JSON). */
  failedLookups: number;
  /** Recovered terms that came from an alternative label (each has a warning). */
  viaAlternative: number;
}

export interface SecondaryResult {
  terms: GroundedTerm[];
  warnings: string[];
  stats: SecondaryStats;
}

export const DEFAULT_MAX_LOOKUPS = 12;
/** Workers free plan: subrequests per invocation (Cache API calls count too). */
export const SUBREQUEST_LIMIT = 50;
/** Head room kept free below SUBREQUEST_LIMIT for retries and estimate error. */
export const SUBREQUEST_SAFETY_MARGIN = 4;
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

/**
 * The engine's drop warning for an unconfirmed proposal. Copied from
 * engine/ground.ts groundTerms ("Dropped '<phrase>': no matching HPO term
 * confirmed"); recovery keys on this exact text, and grounding.test.ts locks it.
 */
export function engineDropWarning(phrase: string): string {
  return `Dropped '${show(phrase)}': no matching HPO term confirmed`;
}

/** Warning added when a term was found only through an alternative label. */
export function alternativeWarning(quote: string, hpoName: string, alternative: string): string {
  return `Matched '${show(quote)}' to ${hpoName} through the alternative label '${show(alternative)}'; please check it.`;
}

/**
 * Cap on secondary lookups given the subrequests already used:
 * min(maxLookups, SUBREQUEST_LIMIT - used - SUBREQUEST_SAFETY_MARGIN), never below 0.
 */
export function secondaryLookupCap(used: number, maxLookups: number = DEFAULT_MAX_LOOKUPS): number {
  const left = SUBREQUEST_LIMIT - Math.max(0, Math.ceil(used)) - SUBREQUEST_SAFETY_MARGIN;
  return Math.max(0, Math.min(Math.floor(maxLookups), left));
}

/**
 * Conservative count of the subrequests engine/ground.ts groundTerms makes for
 * these proposals: one term lookup per distinct supplied id plus every
 * distinct search query (engine/hpo.ts searchVariants: the trimmed label, its
 * plain words, its singular words; memoised per query). Counts as if every
 * variant were searched, although the engine stops at the first hit. The
 * engine's single retry on 5xx is not counted (the safety margin covers it).
 */
export function estimateEngineSubrequests(
  proposals: ReadonlyArray<{ phrase?: unknown; label?: unknown; hpoId?: unknown }>,
): number {
  const ids = new Set<string>();
  const queries = new Set<string>();
  for (const p of proposals) {
    if (typeof p?.phrase !== "string" || p.phrase.trim() === "") continue;
    if (typeof p.hpoId === "string" && p.hpoId.trim() !== "") ids.add(p.hpoId.trim().toUpperCase());
    if (typeof p.label !== "string" || p.label.trim() === "") continue;
    const words = plainWords(p.label);
    for (const q of [p.label.trim(), words.join(" "), words.map(singularWord).join(" ")]) {
      if (q.length >= 2) queries.add(q);
    }
  }
  return ids.size + queries.size;
}

/** One JAX search; any failure means "no rows" (this step never fails the request). */
async function searchJax(q: string, opts: SecondaryOptions): Promise<{ rows: SearchRow[]; failed: boolean }> {
  const doFetch = opts.fetch;
  const url = `${JAX_SEARCH}?q=${encodeURIComponent(q)}&limit=${SEARCH_LIMIT}`;
  try {
    const res = await doFetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(opts.perCallTimeoutMs ?? 2000),
    });
    if (!res.ok) return { rows: [], failed: true };
    const body = (await res.json()) as { terms?: unknown };
    if (!Array.isArray(body?.terms)) return { rows: [], failed: true };
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
    return { rows, failed: false };
  } catch {
    return { rows: [], failed: true };
  }
}

/** Labels to try for one proposal: main label, then alternatives; deduplicated, ASCII only (JAX answers 400 otherwise). */
function labelsToTry(p: SecondaryProposal): Array<{ label: string; alternative: boolean }> {
  const out: Array<{ label: string; alternative: boolean }> = [];
  const seen = new Set<string>();
  const alts = Array.isArray(p.alternatives) ? p.alternatives.slice(0, MAX_ALTERNATIVES) : [];
  [p.label, ...alts].forEach((raw, i) => {
    if (typeof raw !== "string") return;
    const label = raw.replace(/\s+/g, " ").trim();
    const key = labelKey(label);
    if (label.length < 2 || key === "" || seen.has(key) || !/^[\x20-\x7e]+$/.test(label)) return;
    seen.add(key);
    out.push({ label, alternative: i > 0 });
  });
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
  const stats: SecondaryStats = {
    retried: 0,
    recovered: 0,
    lookups: 0,
    skippedByBudget: 0,
    failedLookups: 0,
    viaAlternative: 0,
  };
  const warnings = [...primary.warnings];
  const terms = [...primary.terms];
  const keptIds = new Set(terms.map((t) => t.hpoId));
  const taken = new Set(terms.map((t) => t.start));

  // Proposals the engine dropped as unconfirmed, matched by its warning text.
  const dropWarning = engineDropWarning;
  const pending: Array<{ p: SecondaryProposal; labels: Array<{ label: string; alternative: boolean }> }> = [];
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
  const search = (q: string): Promise<SearchRow[]> =>
    searchJax(q, opts).then((r) => {
      if (r.failed) stats.failedLookups++;
      return r.rows;
    });
  const done = new Set<number>();
  const maxRounds = 1 + MAX_ALTERNATIVES;

  for (let round = 0; round < maxRounds; round++) {
    const batch: Array<{ idx: number; label: string; alternative: boolean; rows: Promise<SearchRow[]> }> = [];
    pending.forEach((item, idx) => {
      if (done.has(idx) || round >= item.labels.length) return;
      const { label, alternative } = item.labels[round];
      const q = label;
      let rows = searches.get(q);
      if (!rows) {
        if (stats.lookups >= maxLookups || now() >= opts.deadlineAt) {
          stats.skippedByBudget++;
          return;
        }
        stats.lookups++;
        rows = search(q);
        searches.set(q, rows);
      }
      batch.push({ idx, label, alternative, rows });
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
      const confidence = b.alternative ? LOWER[LOWER[base]] : LOWER[base];
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
      if (b.alternative) {
        stats.viaAlternative++;
        warnings.push(alternativeWarning(text.slice(span.start, span.end), hit.name, b.label));
      }
    });
  }

  terms.sort((a, b) => a.start - b.start || a.end - b.end);
  return { terms, warnings, stats };
}

// ------------------------------------------------------------ lay-language lexicon (T45)
//
// A curated list of lay phrases mapped to HPO terms (functions/_lib/lexicon.json,
// built and checked against the JAX HPO API by scripts/validate-lexicon.mjs).
// It runs after the engine and recoverUngrounded, needs no network, and only
// looks at proposals that are STILL unconfirmed (their engine drop warning is
// still in the list). For such a proposal, the phrase must be found verbatim in
// the note (same locate() rule as the engine); that span is the quote. A
// lexicon entry matches when its normalised words occur as a contiguous run
// inside the quote's normalised words (plainWords: NFKC, lower case,
// punctuation dropped, single spaces; no plural folding, no fuzzy matching).
// At most one lexicon term per quote: the longest matching phrase wins, ties in
// lexicon order, skipping ids already present. Negation is the proposal's flag.
// Added terms are grounding "label-search", confidence "low", and always carry
// a warning. With an empty lexicon the input is returned unchanged.

export interface LexiconEntry {
  phrase: string;
  hpoId: string;
  /** HPO primary name (validate-lexicon.mjs takes it from the JAX API). */
  label: string;
  source: string;
}

export interface LexiconStats {
  /** Unconfirmed proposals checked against the lexicon. */
  checked: number;
  /** Terms added from the lexicon. */
  added: number;
}

/** Normalised words of a lexicon phrase or a quote (plainWords, joined by single spaces). */
export function lexiconKey(s: string): string {
  return plainWords(s).join(" ");
}

/**
 * Keep only well-formed entries: phrase with at least one word, HP:####### id,
 * non-empty label. Deduplicated by (normalised phrase, id); first wins. Unknown
 * input gives an empty list (the hook then does nothing).
 */
export function parseLexicon(raw: unknown): LexiconEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: LexiconEntry[] = [];
  const seen = new Set<string>();
  for (const r of raw) {
    if (typeof r !== "object" || r === null) continue;
    const v = r as Record<string, unknown>;
    if (typeof v.phrase !== "string" || typeof v.hpoId !== "string" || typeof v.label !== "string") continue;
    const key = lexiconKey(v.phrase);
    const hpoId = v.hpoId.trim();
    const label = v.label.replace(/\s+/g, " ").trim();
    if (key === "" || !HPO_ID_RE.test(hpoId) || label === "") continue;
    const dedupe = `${key}|${hpoId}`;
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    out.push({ phrase: v.phrase.trim(), hpoId, label, source: typeof v.source === "string" ? v.source : "" });
  }
  return out;
}

/** Warning attached to every term added from the lexicon. */
export function lexiconWarning(quote: string, hpoName: string): string {
  return `Matched '${show(quote)}' to ${hpoName} through the lay-language lexicon; please check it.`;
}

/** True if the words of `inner` occur as a contiguous run inside the words of `outer` (both lexiconKey form). */
function containsWords(outer: string, inner: string): boolean {
  if (inner === "" || outer === "") return false;
  return ` ${outer} `.includes(` ${inner} `);
}

/**
 * Add lexicon terms for proposals that are still unconfirmed. Returns `primary`
 * itself (same object) when the lexicon is empty or nothing matched, so the
 * empty-lexicon output is identical to the path without this step.
 */
export function applyLexicon(
  text: string,
  proposals: ReadonlyArray<SecondaryProposal>,
  primary: { terms: GroundedTerm[]; warnings: string[] },
  lexicon: ReadonlyArray<LexiconEntry>,
): { terms: GroundedTerm[]; warnings: string[]; stats: LexiconStats } {
  const stats: LexiconStats = { checked: 0, added: 0 };
  if (lexicon.length === 0) return { terms: primary.terms, warnings: primary.warnings, stats };

  const entries = lexicon
    .map((e, order) => ({ e, key: lexiconKey(e.phrase), order }))
    .filter((x) => x.key !== "")
    .sort((a, b) => b.key.split(" ").length - a.key.split(" ").length || a.order - b.order);

  const warnings = [...primary.warnings];
  const terms = [...primary.terms];
  const keptIds = new Set(terms.map((t) => t.hpoId));
  const taken = new Set(terms.map((t) => t.start));
  const left = new Map<string, number>();
  for (const w of warnings) left.set(w, (left.get(w) ?? 0) + 1);

  for (const p of proposals) {
    if (typeof p?.phrase !== "string" || p.phrase.trim() === "") continue;
    const drop = engineDropWarning(p.phrase);
    const n = left.get(drop) ?? 0;
    if (n === 0) continue; // the proposal was grounded, or dropped for another reason
    left.set(drop, n - 1);
    stats.checked++;
    const span = locate(text, p.phrase, taken);
    if (!span) continue;
    const quote = text.slice(span.start, span.end);
    if (quote.toLowerCase() !== p.phrase.toLowerCase()) continue;
    const quoteKey = lexiconKey(quote);
    const hit = entries.find((x) => !keptIds.has(x.e.hpoId) && containsWords(quoteKey, x.key));
    if (!hit) continue;
    taken.add(span.start);
    keptIds.add(hit.e.hpoId);
    terms.push({
      hpoId: hit.e.hpoId,
      label: hit.e.label,
      quote,
      start: span.start,
      end: span.end,
      negated: p.negated === true,
      confidence: "low",
      grounding: "label-search",
    });
    stats.added++;
    removeOnce(warnings, drop);
    warnings.push(lexiconWarning(quote, hit.e.label));
  }

  if (stats.added === 0) return { terms: primary.terms, warnings: primary.warnings, stats };
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
