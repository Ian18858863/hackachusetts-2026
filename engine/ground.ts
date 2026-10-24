// groundTerms: turn untrusted LLM term proposals into HPO-confirmed terms
// (CONTRACT.md 7.2 step 5, Ian instruction #3).
//
// Rules:
// - The quote is always a real slice of `text`; offsets are UTF-16 indexes.
// - An HPO id is only ever taken from the HPO API, never from the LLM alone.
// - A supplied id is kept only if the term exists AND its primary name or a
//   synonym matches the proposed label (case and singular/plural tolerant).
//   A wrong id never overrides the label: the label is searched instead.
// - Label search accepts only a result whose name or synonym matches the
//   label. Unknown labels are dropped with a warning (no "top result" guess).
// - The returned label is always the HPO primary name.
// - One term per HPO id (first kept); output in order of `start`.

import { InvalidInput, UpstreamError, UpstreamTimeout } from "./errors";
import { HPO_VERSION, lookupTerm, normalizeHpoId, searchHpo, searchVariants, termMatchesLabel } from "./hpo";
import type {
  Confidence,
  EngineDeps,
  ExtractedTerm,
  Grounding,
  GroundingResult,
  HpoTerm,
  TermProposal,
} from "./types";

export const MAX_TEXT_LENGTH = 8000;
const SEARCH_LIMIT = 20;

const LOWER_CONFIDENCE: Readonly<Record<Confidence, Confidence>> = {
  high: "medium",
  medium: "low",
  low: "low",
};

/**
 * A proposal that could not be verified because at least one of its HPO
 * lookups failed and no lookup confirmed a term. Dropped with a warning that
 * says "could not be verified", never "no matching HPO term confirmed".
 * `answered` / `tried` count the query forms that got an answer.
 */
interface LookupFailed {
  failed: unknown;
  answered: number;
  tried: number;
}

/** true for failures that mean the HPO service itself is not answering (not a rejected query). */
function isProviderFailure(err: unknown): boolean {
  if (err instanceof UpstreamTimeout) return true;
  return err instanceof UpstreamError && (err.status === null || err.status === 429 || err.status >= 500);
}

interface Resolved {
  term: HpoTerm;
  grounding: Grounding;
  note?: string;
}

/** Plain-English reason for a failed lookup, without stack details. */
function lookupError(err: unknown): string {
  if (err instanceof UpstreamTimeout) return "timed out";
  if (err instanceof UpstreamError) return err.status === null ? "no usable answer" : `HTTP ${err.status}`;
  return "unexpected error";
}

/** Short, single-line echo of untrusted text for warnings. */
function show(s: string): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 57)}...` : flat;
}

function isConfidence(v: unknown): v is Confidence {
  return v === "high" || v === "medium" || v === "low";
}

/** Find `phrase` in `text`, skipping start positions already taken. Exact match first, then case-insensitive. */
function locate(text: string, phrase: string, taken: ReadonlySet<number>): { start: number; end: number } | null {
  const haystacks: Array<[string, string]> = [
    [text, phrase],
    [text.toLowerCase(), phrase.toLowerCase()],
  ];
  for (const [hay, needle] of haystacks) {
    // toLowerCase can change length for a few non-ASCII characters; then offsets would be wrong.
    if (hay.length !== text.length || needle.length !== phrase.length) continue;
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

/** Per-call memo so repeated ids or labels cost one request. */
function memo<T>(fn: (key: string) => Promise<T>): (key: string) => Promise<T> {
  const cache = new Map<string, Promise<T>>();
  return (key) => {
    let p = cache.get(key);
    if (!p) {
      p = fn(key);
      cache.set(key, p);
    }
    return p;
  };
}

/**
 * Ground LLM term proposals against the HPO API.
 * Throws InvalidInput for a non-string or over-long text or a non-array
 * proposals list. Each proposal is looked up on its own: a proposal whose HPO
 * lookups fail (e.g. HTTP 400 for one odd query) is dropped with a "could not
 * be verified" warning and the others are still grounded. It throws
 * UpstreamTimeout / UpstreamError only when the HPO service gave no usable
 * answer at all to this call (provider down; see the end of the function).
 */
export async function groundTerms(
  text: string,
  proposals: TermProposal[],
  deps: EngineDeps,
): Promise<GroundingResult> {
  if (typeof text !== "string" || text.length === 0) throw new InvalidInput("text", "1-8000 characters");
  if (text.length > MAX_TEXT_LENGTH) throw new InvalidInput("text", "over 8000 characters");
  if (!Array.isArray(proposals)) throw new InvalidInput("proposals", "must be an array");

  const now = deps.now ?? (() => new Date());
  const lookup = memo((id) => lookupTerm(id, deps));
  const search = memo((q) => searchHpo(q, SEARCH_LIMIT, deps));

  // Whether the HPO service gave any usable answer during this call.
  let anySuccess = false;

  /**
   * Label search over the query variants. A variant whose request fails is
   * skipped and the next one is tried, so one bad query never hides a match.
   * If no variant finds a term, `failed` is the first failure (if any variant
   * failed at all), so an incomplete search is never reported as "no match".
   */
  async function byLabel(label: string): Promise<{ term: HpoTerm | null; failed: unknown; answered: number; tried: number }> {
    let failed: unknown = null;
    let answered = 0;
    let tried = 0;
    for (const q of searchVariants(label)) {
      tried++;
      let rows: HpoTerm[];
      try {
        rows = await search(q);
      } catch (err) {
        failed ??= err;
        continue;
      }
      answered++;
      anySuccess = true;
      const hit = rows.find((t) => termMatchesLabel(t, label));
      if (hit) return { term: hit, failed: null, answered, tried };
    }
    return { term: null, failed, answered, tried };
  }

  async function resolve(p: TermProposal): Promise<Resolved | LookupFailed | null> {
    const label = typeof p.label === "string" ? p.label : "";
    const suppliedRaw = p.hpoId;
    const supplied = normalizeHpoId(suppliedRaw);
    let note: string | undefined;
    let idError: unknown = null; // set when the suggested id could not be checked

    if (supplied) {
      let t: HpoTerm | null = null;
      let lookupFailed = false;
      try {
        t = await lookup(supplied);
        anySuccess = true;
      } catch (err) {
        lookupFailed = true; // fall back to the label; the id is never trusted unverified
        idError = err;
      }
      if (t && termMatchesLabel(t, label)) return { term: t, grounding: "exact-id" };
      note = lookupFailed
        ? `suggested id ${supplied} could not be checked`
        : t
          ? `suggested id ${supplied} is "${t.label}", which does not match "${show(label)}"`
          : `suggested id ${supplied} does not exist in HPO`;
    } else if (suppliedRaw !== undefined && suppliedRaw !== null && suppliedRaw !== "") {
      note = "suggested id is not a valid HPO id";
    }

    if (label.trim() === "") return idError ? { failed: idError, answered: 0, tried: 1 } : null;
    const r = await byLabel(label);
    const t = r.term;
    // No term confirmed and some lookup (id check or a query form) failed: not verified, not "not found".
    if (!t && (r.failed || idError)) return { failed: r.failed ?? idError, answered: r.answered, tried: r.tried + (idError ? 1 : 0) };
    if (!t) return null;
    const resolved: Resolved = { term: t, grounding: "label-search" };
    if (note) resolved.note = note;
    return resolved;
  }

  // Network work runs in parallel; offsets and dedupe are assigned in proposal order.
  const valid = proposals.map((p) =>
    typeof p === "object" && p !== null && typeof p.phrase === "string" && p.phrase.trim() !== "",
  );
  const resolutions = await Promise.all(proposals.map((p, i) => (valid[i] ? resolve(p) : Promise.resolve(null))));

  const warnings: string[] = [];
  const terms: ExtractedTerm[] = [];
  const taken = new Set<number>();
  const keptIds = new Set<string>();
  const failures: unknown[] = [];

  proposals.forEach((p, i) => {
    if (!valid[i]) {
      warnings.push("Dropped a proposal without a phrase");
      return;
    }
    const phrase = p.phrase;
    const r = resolutions[i] ?? null;
    if (!r) {
      warnings.push(`Dropped '${show(phrase)}': no matching HPO term confirmed`);
      return;
    }
    if ("failed" in r) {
      failures.push(r.failed);
      const partial = r.answered > 0 ? `; ${r.answered} of ${r.tried} lookups answered with no match` : "";
      warnings.push(`Dropped '${show(phrase)}': the HPO lookup failed (${lookupError(r.failed)}${partial}), so the term could not be verified`);
      return;
    }
    if (keptIds.has(r.term.id)) {
      warnings.push(`Dropped '${show(phrase)}': duplicate of ${r.term.id} ${r.term.label}`);
      return;
    }
    const span = locate(text, phrase, taken);
    if (!span) {
      warnings.push(`Dropped '${show(phrase)}': phrase not found in the text`);
      return;
    }
    if (r.note) warnings.push(`Re-mapped '${show(phrase)}' to ${r.term.id} ${r.term.label} by label: ${r.note}`);

    const confidence: Confidence = isConfidence(p.confidence) ? p.confidence : "low";
    taken.add(span.start);
    keptIds.add(r.term.id);
    terms.push({
      hpoId: r.term.id,
      label: r.term.label,
      quote: text.slice(span.start, span.end),
      start: span.start,
      end: span.end,
      negated: p.negated === true,
      confidence: r.grounding === "label-search" ? LOWER_CONFIDENCE[confidence] : confidence,
      grounding: r.grounding,
    });
  });

  terms.sort((a, b) => a.start - b.start || a.end - b.end);
  // Per-proposal failures never abort the call: each failed proposal is dropped
  // with a warning (contract 7.2 step 5), and zero grounded terms is the normal
  // empty result (7.2 step 6 -> 422 in the function).
  // One exception (DECISION FOR IAN, contract 4 vs 7.2): if the HPO service gave
  // no usable answer at all during this call and the failures were service
  // failures (timeout, network, 429 or 5xx), the provider is down, so the
  // UpstreamTimeout / UpstreamError is thrown (-> 504 / 502, retryable) instead of
  // an empty result that would read as "no terms found". A rejected query (4xx
  // such as the HTTP 400 for typographic punctuation) never triggers this.
  if (terms.length === 0 && !anySuccess && failures.length > 0 && failures.every(isProviderFailure)) throw failures[0];
  return { terms, warnings, dataVersions: { hpo: HPO_VERSION, fetchedAt: now().toISOString() } };
}
