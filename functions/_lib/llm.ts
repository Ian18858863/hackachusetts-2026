// LLM proposal layer for POST /api/extract (Cloudflare Workers AI).
//
// The model only PROPOSES: verbatim phrases from the notes plus a suggested
// HPO label for each. It never names diseases. The engine's `groundTerms`
// validates every proposal against HPO and computes offsets; nothing here is
// trusted as medical fact.
//
// Framework-free and Workers-compatible (fetch-era globals only, no Node APIs).
// Never logs or echoes the notes text: errors carry codes and sizes only.

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type Confidence = "high" | "medium" | "low";

/** One candidate feature proposed by the LLM (docs/CONTRACT.md v0.1). */
export interface TermProposal {
  /** Copied verbatim from the input text (guaranteed exact substring here). */
  phrase: string;
  /** Suggested HPO label; must still be grounded by the engine. */
  label: string;
  /**
   * Up to 2 other HPO-style labels that could also fit, most likely first
   * (T37). Not sent to the engine's matching; used only by
   * functions/_lib/grounding.ts when the main label is not confirmed.
   */
  alternatives?: string[];
  /**
   * Suggested HPO id in `HP:NNNNNNN` form; may be wrong. The prompt does not
   * ask for ids (in the T17 bake-off most model-suggested ids were wrong), so
   * this is only set if a model volunteers one. Ground by label.
   */
  hpoId?: string;
  /** True when the text says the feature is absent. */
  negated: boolean;
  confidence: Confidence;
}

/** Minimal shape of the Workers AI binding we rely on. */
export interface AiBinding {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface LlmEnv {
  AI?: AiBinding;
  /** Optional model override, e.g. "@cf/openai/gpt-oss-120b". */
  LLM_MODEL?: string;
}

export interface ProposeOptions {
  /** Overrides env.LLM_MODEL and the default. */
  model?: string;
  /** Hard limit for the model call in ms. Default 15000. */
  timeoutMs?: number;
  /** Maximum proposals returned. Default 40. */
  maxProposals?: number;
}

/** Counts only (never text), safe to log or return to the client. */
export interface ProposeStats {
  /** Items the model returned before validation. */
  raw: number;
  /** Items dropped for missing or wrongly typed fields. */
  droppedMalformed: number;
  /** Items dropped because the phrase is not in the input text. */
  droppedNotInText: number;
  /** Items kept after fixing only letter case or whitespace to match the text. */
  repairedPhrase: number;
  /** Exact duplicates removed. */
  droppedDuplicate: number;
  /** Items dropped by the maxProposals cap. */
  droppedOverCap: number;
}

export interface ProposeResult {
  proposals: TermProposal[];
  model: string;
  /** Wall-clock time of the model call in ms. */
  llmMs: number;
  stats: ProposeStats;
  /** Characters of model output text (count only, for logs). */
  outputChars: number;
  /** Output tokens reported by Workers AI, when it reports usage. */
  outputTokens?: number;
  /**
   * True when the model was still writing at the deadline (T39): the
   * proposals are the complete features received before it. The caller
   * must tell the user that some features may be missing. Also true when a
   * finished answer was not valid JSON as a whole (for example cut by the
   * output-token cap) and only its complete feature objects were kept.
   */
  partial: boolean;
  /** Why `partial` is true: the 15 s deadline, or a finished but cut answer. */
  partialReason?: "deadline" | "truncated";
}

export type LlmErrorCode =
  | "invalid_input" // empty or oversized text
  | "no_binding" // env.AI missing (wrangler.toml [ai] binding not configured)
  | "timeout" // model call exceeded timeoutMs
  | "upstream" // the binding threw (model unavailable, quota, network)
  | "bad_output"; // the model answered but no JSON array could be parsed

export class LlmError extends Error {
  readonly code: LlmErrorCode;
  readonly model?: string;
  readonly llmMs?: number;

  constructor(code: LlmErrorCode, message: string, model?: string, llmMs?: number) {
    super(message);
    this.name = "LlmError";
    this.code = code;
    this.model = model;
    this.llmMs = llmMs;
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Chosen by the T17 bake-off (2026-10-24, two demo narratives, 3 runs each):
 * same label quality as gpt-oss-120b, every negation caught, no disease names,
 * 2.3-4.9 s versus 5.0-10.4 s. Kimi K2.6 and GLM 5.3 returned 403 on the
 * account's Workers Free plan.
 */
export const DEFAULT_LLM_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
export const DEFAULT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_PROPOSALS = 40;
/** Notes longer than this are rejected; the caller should validate first. */
export const MAX_TEXT_CHARS = 8_000;

/**
 * Output cap. Real notes need 150-400 tokens (T39, 12 notes on 2026-10-24);
 * 40 proposals with 2 alternatives each fit in about 2,000.
 */
const MAX_OUTPUT_TOKENS = 2_048;
const MAX_PHRASE_CHARS = 200;
const MAX_LABEL_CHARS = 120;
const HPO_ID_RE = /^HP:\d{7}$/;
const MAX_ALTERNATIVES = 2;
/** Anything that looks like an ontology id ("HP:0001250", "OMIM:310200"); never accepted as a label. */
const ID_LIKE_RE = /\b[A-Za-z]+[:_]\d{3,}\b/;

export const SYSTEM_PROMPT = `You extract patient features from clinical or family notes so they can be matched to the Human Phenotype Ontology (HPO).

Return EVERY feature of the patient that the notes mention:
- signs and symptoms (what a doctor sees or the patient or family notices),
- physical and facial features, body measurements,
- lab, imaging, genetic or other test findings,
- growth, development and milestones (including delays),
- behaviour, cognition, and past medical events (for example an operation or a tear in a vessel).
List each feature separately, even if two appear in one sentence.

For each feature give:
- "phrase": the words from the notes that describe it, copied EXACTLY character for character (same spelling, case and punctuation). Copy a short span, usually 2 to 10 words. Never paraphrase, translate, correct or join separate pieces of text.
- "label": the closest HPO term name in English, using the standard HPO wording (for example "Short stature", "Hearing impairment", "Ptosis"). Use the most specific term the words support, and name the body part when the notes name one (for example "falls a lot" is "Frequent falls", not a general gait term). When the description matches a named clinical sign, use the sign's HPO name.
- "alternatives": up to 2 other HPO term names in English that could also fit the phrase, most likely first (for example, for "his calves look very big" with label "Calf muscle hypertrophy": ["Calf muscle pseudohypertrophy"]). Each alternative must name the SAME feature in other HPO wording (a synonym, or a more specific term); never a broader, related or different feature. Use [] when the label is an exact HPO term name and no other wording fits. Only feature names; never ids, diseases or syndromes.
- "negated": true if the notes say the patient does NOT have the feature (for example "no fever", "hearing is normal" means no hearing impairment); otherwise false.
- "confidence": "high", "medium" or "low" for how well the label fits the phrase.

Rules:
- Only patient features. Do NOT name diseases, syndromes, diagnoses, genes, or treatments, and do not guess what condition the patient has.
- Ignore features of other people (relatives, siblings) unless they are clearly the patient.
- Ignore age, names and sex on their own.
- Output compact strict JSON only (no spaces or line breaks between items), no markdown, no comments, no text before or after, in exactly this shape:
{"features":[{"phrase":"...","label":"...","alternatives":["..."],"negated":false,"confidence":"high"}]}
If there are no features, output {"features":[]}.`;

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Ask the model for term proposals for `text`.
 * Throws LlmError on invalid input, missing binding, timeout, upstream failure
 * or unparseable output; the caller decides whether to fall back to demo data.
 */
export async function proposeTerms(
  text: string,
  env: LlmEnv,
  options: ProposeOptions = {},
): Promise<ProposeResult> {
  const model = pickModel(options.model ?? env.LLM_MODEL);
  const timeoutMs = clampInt(options.timeoutMs, DEFAULT_TIMEOUT_MS, 1, 60_000);
  const maxProposals = clampInt(options.maxProposals, DEFAULT_MAX_PROPOSALS, 1, 200);

  if (typeof text !== "string" || text.trim().length === 0) {
    throw new LlmError("invalid_input", "Notes text is empty.", model);
  }
  if (text.length > MAX_TEXT_CHARS) {
    throw new LlmError(
      "invalid_input",
      `Notes text is ${text.length} characters; the limit is ${MAX_TEXT_CHARS}.`,
      model,
    );
  }
  const ai = env.AI;
  if (!ai || typeof ai.run !== "function") {
    throw new LlmError("no_binding", "Workers AI binding `AI` is not configured.", model);
  }

  const started = Date.now();
  if (supportsStreaming(model)) {
    return proposeStreaming(ai, model, text, timeoutMs, maxProposals, started);
  }
  let output: unknown;
  try {
    output = await withTimeout(ai.run(model, buildRequest(model, text)), timeoutMs);
  } catch (err) {
    const llmMs = Date.now() - started;
    if (err instanceof TimeoutError) {
      throw new LlmError("timeout", `Model call exceeded ${timeoutMs} ms.`, model, llmMs);
    }
    // The upstream message may describe the request but never contains the
    // notes; still, keep only the first line and cap its length.
    const detail = err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "unknown error";
    throw new LlmError("upstream", `Model call failed: ${detail}`, model, llmMs);
  }
  return finishProposals(output, model, text, maxProposals, Date.now() - started);
}

// ---------------------------------------------------------------------------
// Streaming with a deadline (T39)
// ---------------------------------------------------------------------------

/**
 * Chat-format models stream on Workers AI (server-sent events). The OpenAI
 * Responses shape (gpt-oss) keeps the plain call.
 */
function supportsStreaming(model: string): boolean {
  return !model.toLowerCase().includes("/gpt-oss-");
}

/**
 * Stream the model output until it ends or `timeoutMs` has passed since
 * `started`. On the deadline the stream is cancelled and the complete feature
 * objects received so far are kept (`partial: true`); nothing is completed or
 * guessed. With no complete feature by then, it is a timeout as before.
 */
async function proposeStreaming(
  ai: AiBinding,
  model: string,
  text: string,
  timeoutMs: number,
  maxProposals: number,
  started: number,
): Promise<ProposeResult> {
  const deadlineAt = started + timeoutMs;
  let stream: unknown;
  try {
    stream = await withTimeout(ai.run(model, { ...buildRequest(model, text), stream: true }), timeoutMs);
  } catch (err) {
    const llmMs = Date.now() - started;
    if (err instanceof TimeoutError) {
      throw new LlmError("timeout", `Model call exceeded ${timeoutMs} ms.`, model, llmMs);
    }
    const detail = err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "unknown error";
    throw new LlmError("upstream", `Model call failed: ${detail}`, model, llmMs);
  }

  if (!(stream instanceof ReadableStream)) {
    // The binding answered without streaming: parse it like the plain call.
    return finishProposals(stream, model, text, maxProposals, Date.now() - started);
  }

  const reader = (stream as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  const sse = new SseText();
  let timedOut = false;
  try {
    for (;;) {
      const left = deadlineAt - Date.now();
      if (left <= 0) {
        timedOut = true;
        break;
      }
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await withTimeout(reader.read(), left);
      } catch (err) {
        if (err instanceof TimeoutError) {
          timedOut = true;
          break;
        }
        const detail = err instanceof Error ? err.message.split("\n")[0].slice(0, 200) : "unknown error";
        throw new LlmError("upstream", `Model stream failed: ${detail}`, model, Date.now() - started);
      }
      if (chunk.done) break;
      if (sse.push(decoder.decode(chunk.value, { stream: true }))) break;
    }
  } finally {
    if (timedOut) reader.cancel().catch(() => {});
    else reader.releaseLock();
  }
  if (!timedOut) sse.push(decoder.decode());
  const llmMs = Date.now() - started;
  const content = sse.text;

  if (!timedOut) {
    const out: Record<string, unknown> = { response: content };
    if (sse.outputTokens !== undefined) out.usage = { completion_tokens: sse.outputTokens };
    return finishProposals(out, model, text, maxProposals, llmMs);
  }
  const items = parsePartialItems(content);
  if (items.length === 0) {
    throw new LlmError("timeout", `Model call exceeded ${timeoutMs} ms.`, model, llmMs);
  }
  const { proposals, stats } = validateProposals(items, text, maxProposals);
  return { proposals, model, llmMs, stats, outputChars: content.length, partial: true, partialReason: "deadline" };
}

/**
 * Parse a finished model answer. When the answer is not valid JSON as a whole
 * (for example it hit the output-token cap mid-object), the complete feature
 * objects at its start are kept with `partial: true`; with none, it is
 * `bad_output` as before.
 */
function finishProposals(
  output: unknown,
  model: string,
  text: string,
  maxProposals: number,
  llmMs: number,
): ProposeResult {
  const content = extractContent(output);
  if (content === null) {
    throw new LlmError("bad_output", "Model returned no text content.", model, llmMs);
  }
  let items = parseItems(content);
  let partial = false;
  // A cut answer can still contain a balanced inner array (for example a
  // feature's `alternatives`), which parseItems would take as the list. Prefer
  // the complete top-level feature objects when they are more.
  const complete = parsePartialItems(content);
  if (items === null || complete.length > items.filter(isRecord).length) {
    if (complete.length === 0) {
      throw new LlmError("bad_output", "Model output contained no JSON feature list.", model, llmMs);
    }
    items = complete;
    partial = true;
  }
  const { proposals, stats } = validateProposals(items, text, maxProposals);
  const result: ProposeResult = { proposals, model, llmMs, stats, outputChars: content.length, partial };
  if (partial) result.partialReason = "truncated";
  const tokens = usageTokens(output);
  if (tokens !== undefined) result.outputTokens = tokens;
  return result;
}

/**
 * Contract error for an extraction where no proposal could be grounded. When
 * the answer was cut at the deadline the empty result says nothing about the
 * notes, so it is a retryable timeout; otherwise it is NO_TERMS_FOUND (T39).
 */
export function noGroundedTermsCode(result: Pick<ProposeResult, "partial" | "partialReason">):
  | "UPSTREAM_TIMEOUT"
  | "NO_TERMS_FOUND" {
  return result.partial && result.partialReason === "deadline" ? "UPSTREAM_TIMEOUT" : "NO_TERMS_FOUND";
}

/**
 * Accumulates the text of a Workers AI server-sent-event stream. Handles the
 * `{"response": "..."}` events of Workers AI chat models and OpenAI-style
 * `{"choices":[{"delta":{"content": "..."}}]}` events. Exported for tests.
 */
export class SseText {
  text = "";
  outputTokens?: number;
  private buffer = "";

  /** Feed decoded bytes; returns true once `data: [DONE]` was seen. */
  push(chunk: string): boolean {
    this.buffer += chunk;
    let done = false;
    let nl: number;
    while ((nl = this.buffer.indexOf("\n")) !== -1) {
      const line = this.buffer.slice(0, nl).trim();
      this.buffer = this.buffer.slice(nl + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") {
        done = true;
        continue;
      }
      const event = tryParse(data);
      if (!isRecord(event)) continue;
      // Workers AI chat models may send the same token both as `response`
      // and as an OpenAI-style delta in one event, or leave one of them
      // empty; take the non-empty one, once.
      const response = typeof event.response === "string" ? event.response : "";
      let delta = "";
      if (Array.isArray(event.choices)) {
        for (const c of event.choices) {
          if (isRecord(c) && isRecord(c.delta) && typeof c.delta.content === "string") delta += c.delta.content;
        }
      }
      this.text += response.length >= delta.length ? response : delta;
      const tokens = usageTokens(event);
      if (tokens !== undefined) this.outputTokens = tokens;
    }
    return done;
  }
}

/**
 * Complete feature objects at the start of a cut-off model answer such as
 * `{"features":[{...},{...},{"phrase":"half`. Only objects that parse in full
 * are returned; the unfinished tail is dropped. Exported for tests.
 */
export function parsePartialItems(content: string): unknown[] {
  const stripped = content.replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/```(?:json)?/gi, "").trim();
  const full = itemsFrom(tryParse(stripped));
  if (full) return full;
  const key = stripped.search(/"(?:features|proposals|terms|items)"\s*:\s*\[/);
  let i = key === -1 ? stripped.indexOf("[") : stripped.indexOf("[", key);
  if (i === -1) return [];
  const items: unknown[] = [];
  for (i = i + 1; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch === "]") break;
    if (ch !== "{") continue;
    const end = findBalancedEnd(stripped, i);
    if (end === -1) break;
    const value = tryParse(stripped.slice(i, end + 1));
    if (isRecord(value)) items.push(value);
    i = end;
  }
  return items;
}

// ---------------------------------------------------------------------------
// Request building per model family
// ---------------------------------------------------------------------------

/** Model id actually used for `candidate` (env.LLM_MODEL); exported for /api/health. */
export function pickModel(candidate: string | undefined): string {
  const m = typeof candidate === "string" ? candidate.trim() : "";
  // Workers AI ids look like "@cf/vendor/name"; anything else falls back.
  return /^@[a-z0-9-]+\/[\w.\-]+\/[\w.\-]+$/i.test(m) ? m : DEFAULT_LLM_MODEL;
}

function userMessage(text: string): string {
  return `Notes (between the markers):\n<<<NOTES\n${text}\nNOTES>>>\n\nReturn the JSON object now.`;
}

/** Exported for tests. Builds the Workers AI input object for `model`. */
export function buildRequest(model: string, text: string): Record<string, unknown> {
  const id = model.toLowerCase();

  // OpenAI gpt-oss on Workers AI: Responses API shape; reasoning cannot be
  // disabled, low effort keeps latency down.
  if (id.includes("/gpt-oss-")) {
    return {
      instructions: SYSTEM_PROMPT,
      input: userMessage(text),
      reasoning: { effort: "low" },
      max_output_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0,
    };
  }

  const req: Record<string, unknown> = {
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage(text) },
    ],
    // Several Workers AI models default to 256 output tokens, which truncates
    // the JSON for longer notes.
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0,
  };

  // Kimi supports switching thinking off; extraction does not need it.
  if (id.includes("/kimi-")) {
    req.chat_template_kwargs = { enable_thinking: false };
  }
  return req;
}

// ---------------------------------------------------------------------------
// Output parsing (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Pull the assistant text out of the response shapes Workers AI uses:
 * `{response}` (Meta and older models), OpenAI chat `{choices[].message.content}`,
 * and OpenAI Responses `{output[].content[].text}` / `{output_text}`.
 * If the model already returned parsed JSON, re-serialise it.
 */
export function extractContent(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (!isRecord(output)) return null;

  const response = output.response;
  if (typeof response === "string" && response.trim()) return response;
  if (isRecord(response) || Array.isArray(response)) return JSON.stringify(response);

  if (typeof output.output_text === "string" && output.output_text.trim()) return output.output_text;

  if (Array.isArray(output.choices)) {
    for (const choice of output.choices) {
      if (!isRecord(choice)) continue;
      const message = choice.message;
      if (isRecord(message) && typeof message.content === "string" && message.content.trim()) {
        return message.content;
      }
      if (typeof choice.text === "string" && choice.text.trim()) return choice.text;
    }
  }

  if (Array.isArray(output.output)) {
    const parts: string[] = [];
    for (const item of output.output) {
      if (!isRecord(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
      for (const c of item.content) {
        if (isRecord(c) && typeof c.text === "string") parts.push(c.text);
      }
    }
    if (parts.length) return parts.join("");
  }

  if (Array.isArray(output.features)) return JSON.stringify(output);
  return null;
}

/**
 * Find the feature array in model text. Accepts `{"features":[...]}`, a bare
 * array, code fences, and leading or trailing chatter. Returns null if nothing
 * parses.
 */
export function parseItems(content: string): unknown[] | null {
  const stripped = content
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/```(?:json)?/gi, "")
    .trim();

  const direct = tryParse(stripped);
  const fromDirect = itemsFrom(direct);
  if (fromDirect) return fromDirect;

  // Scan for the first balanced JSON object or array that yields items.
  for (let i = 0; i < stripped.length; i++) {
    const ch = stripped[i];
    if (ch !== "{" && ch !== "[") continue;
    const end = findBalancedEnd(stripped, i);
    if (end === -1) continue;
    const items = itemsFrom(tryParse(stripped.slice(i, end + 1)));
    if (items) return items;
  }
  return null;
}

function itemsFrom(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    for (const key of ["features", "proposals", "terms", "items"]) {
      if (Array.isArray(value[key])) return value[key] as unknown[];
    }
  }
  return null;
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Index of the bracket closing the one at `start`, string-aware; -1 if none. */
function findBalancedEnd(s: string, start: number): number {
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch === "{" ? "}" : "]");
    else if (ch === "}" || ch === "]") {
      if (stack.pop() !== ch) return -1;
      if (stack.length === 0) return i;
    }
  }
  return -1;
}

// ---------------------------------------------------------------------------
// Validation (exported for tests)
// ---------------------------------------------------------------------------

/**
 * Keep only well-formed proposals whose phrase occurs in `text`.
 * A phrase that differs from the text only in letter case, whitespace or
 * curly vs straight quotes is replaced by the exact span from the text, so
 * every returned phrase is an exact substring.
 */
export function validateProposals(
  items: unknown[],
  text: string,
  maxProposals: number = DEFAULT_MAX_PROPOSALS,
): { proposals: TermProposal[]; stats: ProposeStats } {
  const stats: ProposeStats = {
    raw: items.length,
    droppedMalformed: 0,
    droppedNotInText: 0,
    repairedPhrase: 0,
    droppedDuplicate: 0,
    droppedOverCap: 0,
  };
  const proposals: TermProposal[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    if (!isRecord(item)) {
      stats.droppedMalformed++;
      continue;
    }
    const rawPhrase = typeof item.phrase === "string" ? item.phrase.trim() : "";
    const label = typeof item.label === "string" ? cleanLabel(item.label) : "";
    const negated = toBoolean(item.negated);
    if (
      !rawPhrase ||
      rawPhrase.length > MAX_PHRASE_CHARS ||
      !label ||
      label.length > MAX_LABEL_CHARS ||
      negated === null
    ) {
      stats.droppedMalformed++;
      continue;
    }

    let phrase: string;
    if (text.includes(rawPhrase)) {
      phrase = rawPhrase;
    } else {
      const repaired = findLooseSpan(text, rawPhrase);
      if (repaired === null) {
        stats.droppedNotInText++;
        continue;
      }
      phrase = repaired;
      stats.repairedPhrase++;
    }

    const proposal: TermProposal = {
      phrase,
      label,
      negated,
      confidence: toConfidence(item.confidence),
    };
    const hpoId = typeof item.hpoId === "string" ? item.hpoId.trim().toUpperCase() : "";
    if (HPO_ID_RE.test(hpoId)) proposal.hpoId = hpoId;
    const alternatives = cleanAlternatives(item.alternatives, label);
    if (alternatives.length > 0) proposal.alternatives = alternatives;

    const key = `${phrase}\u0000${label.toLowerCase()}\u0000${negated}`;
    if (seen.has(key)) {
      stats.droppedDuplicate++;
      continue;
    }
    seen.add(key);

    if (proposals.length >= maxProposals) {
      stats.droppedOverCap++;
      continue;
    }
    proposals.push(proposal);
  }
  return { proposals, stats };
}

/**
 * Find `phrase` in `text` ignoring case, runs of whitespace and quote style.
 * Returns the exact matching span of `text`, or null.
 */
function findLooseSpan(text: string, phrase: string): string | null {
  const tokens = phrase.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return null;
  const pattern = tokens.map((t) => escapeRegExp(t).replace(/['\u2018\u2019]/g, "['\u2018\u2019]")).join("\\s+");
  const m = new RegExp(pattern, "i").exec(text);
  return m ? m[0] : null;
}

/**
 * Label as a JAX search query: curly quotes and dashes made ASCII, accents
 * removed, spaces collapsed. Returns "" (malformed) if anything outside
 * printable ASCII remains or it looks like an id: the JAX search answers 400
 * to non-ASCII queries such as "Gowers\u2019 sign" (checked 2026-10-24), and
 * one 400 there fails the whole extraction.
 */
function cleanLabel(raw: string): string {
  const s = collapseSpaces(
    raw
      .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
      .replace(/[\u201c\u201d\u2033]/g, '"')
      .replace(/[\u2010-\u2015]/g, "-")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, ""),
  );
  if (!/^[\x20-\x7e]*$/.test(s) || ID_LIKE_RE.test(s)) return "";
  return s;
}

/** Up to 2 cleaned alternative labels, without the main label or repeats; anything else ignored. */
function cleanAlternatives(raw: unknown, label: string): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set([label.toLowerCase()]);
  for (const v of raw) {
    if (out.length >= MAX_ALTERNATIVES) break;
    if (typeof v !== "string") continue;
    const alt = cleanLabel(v);
    if (alt.length < 2 || alt.length > MAX_LABEL_CHARS || seen.has(alt.toLowerCase())) continue;
    seen.add(alt.toLowerCase());
    out.push(alt);
  }
  return out;
}

function toBoolean(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (v === undefined || v === null) return false;
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

function toConfidence(v: unknown): Confidence {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  return s === "high" || s === "medium" || s === "low" ? s : "low";
}

// ---------------------------------------------------------------------------
// Small utilities
// ---------------------------------------------------------------------------

/** Output token count from a Workers AI `usage` object, if present. */
function usageTokens(output: unknown): number | undefined {
  if (!isRecord(output) || !isRecord(output.usage)) return undefined;
  const u = output.usage;
  const n = u.completion_tokens ?? u.output_tokens;
  return typeof n === "number" && Number.isFinite(n) ? n : undefined;
}

class TimeoutError extends Error {}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError()), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function clampInt(v: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(v)));
}

function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
