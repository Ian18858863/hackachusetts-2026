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

import { InvalidInput } from "./errors";
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

interface Resolved {
  term: HpoTerm;
  grounding: Grounding;
  note?: string;
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
 * proposals list; UpstreamTimeout / UpstreamError when the HPO API fails.
 * Individual bad proposals are dropped with a warning, never thrown.
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

  async function byLabel(label: string): Promise<HpoTerm | null> {
    for (const q of searchVariants(label)) {
      const hit = (await search(q)).find((t) => termMatchesLabel(t, label));
      if (hit) return hit;
    }
    return null;
  }

  async function resolve(p: TermProposal): Promise<Resolved | null> {
    const label = typeof p.label === "string" ? p.label : "";
    const suppliedRaw = p.hpoId;
    const supplied = normalizeHpoId(suppliedRaw);
    let note: string | undefined;

    if (supplied) {
      const t = await lookup(supplied);
      if (t && termMatchesLabel(t, label)) return { term: t, grounding: "exact-id" };
      note = t
        ? `suggested id ${supplied} is "${t.label}", which does not match "${show(label)}"`
        : `suggested id ${supplied} does not exist in HPO`;
    } else if (suppliedRaw !== undefined && suppliedRaw !== null && suppliedRaw !== "") {
      note = "suggested id is not a valid HPO id";
    }

    if (label.trim() === "") return null;
    const t = await byLabel(label);
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
  return { terms, warnings, dataVersions: { hpo: HPO_VERSION, fetchedAt: now().toISOString() } };
}
