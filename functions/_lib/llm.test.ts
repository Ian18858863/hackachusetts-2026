// Unit tests for functions/_lib/llm.ts streaming with a deadline (T39).
// Run: node --test --experimental-strip-types functions/_lib/llm.test.ts
// Uses a stubbed AI binding; no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  LlmError,
  SseText,
  buildRequest,
  describeBindingFailure,
  llmFailureCode,
  noGroundedTermsCode,
  parsePartialItems,
  proposeTerms,
} from "./llm.ts";

const TEXT = "My son is 8. He keeps falling, his calves look very big, and he struggles to climb stairs.";
const F1 = { phrase: "keeps falling", label: "Frequent falls", alternatives: [], negated: false, confidence: "high" };
const F2 = {
  phrase: "his calves look very big",
  label: "Calf muscle hypertrophy",
  alternatives: ["Calf muscle pseudohypertrophy"],
  negated: false,
  confidence: "medium",
};
const F3 = { phrase: "struggles to climb stairs", label: "Difficulty climbing stairs", negated: false, confidence: "high" };

function sse(pieces: string[], done = true): string[] {
  const events = pieces.map((p) => `data: ${JSON.stringify({ response: p })}\n\n`);
  if (done) events.push("data: [DONE]\n\n");
  return events;
}

/** A stream that sends `chunks`, then (if `hang`) never ends. */
function streamOf(chunks: string[], hang: boolean): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  let i = 0;
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (i < chunks.length) {
        controller.enqueue(enc.encode(chunks[i++]));
        return;
      }
      if (!hang) {
        controller.close();
        return;
      }
      return new Promise<void>(() => {}); // the model is still "writing"
    },
  });
}

function aiReturning(stream: ReadableStream<Uint8Array>, seen: Array<Record<string, unknown>> = []) {
  return {
    async run(_model: string, inputs: Record<string, unknown>) {
      seen.push(inputs);
      return stream;
    },
  };
}

test("SseText joins response events split across chunks and stops at [DONE]", () => {
  const s = new SseText();
  const all = sse(['{"features":[', JSON.stringify(F1), "]}"]).join("");
  assert.equal(s.push(all.slice(0, 17)), false);
  assert.equal(s.push(all.slice(17)), true);
  assert.equal(s.text, `{"features":[${JSON.stringify(F1)}]}`);
});

test("parsePartialItems keeps only complete feature objects of a cut-off answer", () => {
  const cut = `{"features":[${JSON.stringify(F1)},${JSON.stringify(F2)},{"phrase":"struggles to cl`;
  assert.deepEqual(parsePartialItems(cut), [F1, F2]);
  assert.deepEqual(parsePartialItems('{"features":[{"phrase":"kee'), []);
  assert.deepEqual(parsePartialItems(""), []);
});

test("a finished stream gives all proposals, partial false, and requests stream: true", async () => {
  const body = `{"features":[${[F1, F2, F3].map((f) => JSON.stringify(f)).join(",")}]}`;
  const seen: Array<Record<string, unknown>> = [];
  const r = await proposeTerms(TEXT, { AI: aiReturning(streamOf(sse([body.slice(0, 40), body.slice(40)]), false), seen) });
  assert.equal(r.partial, false);
  assert.deepEqual(r.proposals.map((p) => p.label), ["Frequent falls", "Calf muscle hypertrophy", "Difficulty climbing stairs"]);
  assert.equal(seen[0].stream, true);
});

test("on the deadline the complete features so far are returned with partial true", async () => {
  const head = `{"features":[${JSON.stringify(F1)},${JSON.stringify(F2)},{"phrase":"strug`;
  const r = await proposeTerms(TEXT, { AI: aiReturning(streamOf(sse([head], false), true)) }, { timeoutMs: 150 });
  assert.equal(r.partial, true);
  assert.deepEqual(r.proposals.map((p) => p.phrase), ["keeps falling", "his calves look very big"]);
  // Every phrase is still an exact substring of the notes.
  for (const p of r.proposals) assert.ok(TEXT.includes(p.phrase));
});

test("on the deadline with no complete feature it is still a timeout", async () => {
  await assert.rejects(
    proposeTerms(TEXT, { AI: aiReturning(streamOf(sse(['{"features":[{"phr'], false), true)) }, { timeoutMs: 150 }),
    (err: unknown) => err instanceof LlmError && err.code === "timeout",
  );
});

test("alternatives are capped at 2 and the output cap is 2,048 tokens", async () => {
  const many = { ...F2, alternatives: ["Calf muscle pseudohypertrophy", "Pseudohypertrophy of the calves", "Big calves"] };
  const body = `{"features":[${JSON.stringify(many)}]}`;
  const r = await proposeTerms(TEXT, { AI: aiReturning(streamOf(sse([body]), false)) });
  assert.equal(r.proposals[0].alternatives?.length, 2);
  assert.equal(buildRequest("@cf/meta/llama-3.3-70b-instruct-fp8-fast", TEXT).max_tokens, 2048);
});

test("a binding that ignores stream and returns an object is parsed as before", async () => {
  const ai = { async run() { return { response: `{"features":[${JSON.stringify(F1)}]}` }; } };
  const r = await proposeTerms(TEXT, { AI: ai });
  assert.equal(r.partial, false);
  assert.equal(r.proposals.length, 1);
});

test("an event carrying both response and an OpenAI delta adds the token once", () => {
  const s = new SseText();
  s.push(`data: ${JSON.stringify({ response: "ab", choices: [{ delta: { content: "ab" } }] })}\n\n`);
  s.push(`data: ${JSON.stringify({ choices: [{ delta: { content: "c" } }] })}\n\n`);
  assert.equal(s.text, "abc");
});

test("a deadline-cut answer with nothing grounded is a retryable timeout, not NO_TERMS_FOUND", async () => {
  const head = `{"features":[${JSON.stringify(F1)},{"phrase":"strug`;
  const r = await proposeTerms(TEXT, { AI: aiReturning(streamOf(sse([head], false), true)) }, { timeoutMs: 150 });
  assert.equal(r.partial, true);
  assert.equal(r.partialReason, "deadline");
  assert.equal(noGroundedTermsCode(r), "UPSTREAM_TIMEOUT");
  assert.equal(noGroundedTermsCode({ partial: false }), "NO_TERMS_FOUND");
  assert.equal(noGroundedTermsCode({ partial: true, partialReason: "truncated" }), "NO_TERMS_FOUND");
});

test("a finished stream cut by the output cap keeps its complete features with partial true", async () => {
  const capped = `{"features":[${JSON.stringify(F1)},${JSON.stringify(F2)},{"phrase":"struggles to cl`;
  const r = await proposeTerms(TEXT, { AI: aiReturning(streamOf(sse([capped]), false)) });
  assert.equal(r.partial, true);
  assert.equal(r.partialReason, "truncated");
  assert.deepEqual(r.proposals.map((p) => p.phrase), ["keeps falling", "his calves look very big"]);
});

test("a finished plain answer cut by the output cap is also kept as partial", async () => {
  const ai = { async run() { return { response: `{"features":[${JSON.stringify(F3)},{"phrase":"kee` }; } };
  const r = await proposeTerms(TEXT, { AI: ai });
  assert.equal(r.partial, true);
  assert.equal(r.partialReason, "truncated");
  assert.deepEqual(r.proposals.map((p) => p.label), ["Difficulty climbing stairs"]);
});

test("a finished answer with no complete feature is still bad_output", async () => {
  await assert.rejects(
    proposeTerms(TEXT, { AI: aiReturning(streamOf(sse(['{"features":[{"phr']), false)) }),
    (err: unknown) => err instanceof LlmError && err.code === "bad_output",
  );
});

test("a complete answer wrapped in chatter is not marked partial", async () => {
  const ai = { async run() { return { response: `Here you go: {"features":[${JSON.stringify(F1)},${JSON.stringify(F2)}]} Done.` }; } };
  const r = await proposeTerms(TEXT, { AI: ai });
  assert.equal(r.partial, false);
  assert.equal(r.partialReason, undefined);
  assert.equal(r.proposals.length, 2);
});

// ---- T41: a throwing binding is an outage (503), not a 502 ----

function aiThrowing(err: unknown) {
  return {
    async run() {
      throw err;
    },
  };
}

test("a binding that throws a daily-allocation error is unavailable -> 503 LLM_UNAVAILABLE", async () => {
  const quota = new Error(
    "4006: you have used up your daily free allocation of 10,000 neurons, please upgrade to Cloudflare's Workers Paid plan",
  );
  await assert.rejects(proposeTerms(TEXT, { AI: aiThrowing(quota) }), (err: unknown) => {
    if (!(err instanceof LlmError)) return false;
    assert.equal(err.code, "unavailable");
    assert.equal(llmFailureCode(err.code), "LLM_UNAVAILABLE");
    assert.equal(err.failure?.aiCode, "4006");
    assert.equal(err.failure?.kind, "quota");
    assert.equal(err.failure?.errorClass, "Error");
    // The notes never reach the loggable summary.
    assert.ok(!JSON.stringify(err.failure).includes("calves"));
    return true;
  });
});

test("a generic binding exception is also unavailable -> 503 LLM_UNAVAILABLE", async () => {
  class InferenceUpstreamError extends Error {
    constructor(m: string) {
      super(m);
      this.name = "InferenceUpstreamError";
    }
  }
  await assert.rejects(proposeTerms(TEXT, { AI: aiThrowing(new InferenceUpstreamError("network connection lost")) }), (err: unknown) => {
    if (!(err instanceof LlmError)) return false;
    assert.equal(err.code, "unavailable");
    assert.equal(llmFailureCode(err.code), "LLM_UNAVAILABLE");
    assert.equal(err.failure?.errorClass, "InferenceUpstreamError");
    assert.equal(err.failure?.aiCode, undefined);
    assert.equal(err.failure?.kind, "other");
    return true;
  });
  // A thrown non-Error value is still an outage.
  await assert.rejects(proposeTerms(TEXT, { AI: aiThrowing("boom") }), (err: unknown) => err instanceof LlmError && err.code === "unavailable");
});

test("describeBindingFailure reads a numeric code property and caps the message", () => {
  const e = Object.assign(new Error(`model unavailable\n${"x".repeat(500)}`), { code: 5007 });
  const f = describeBindingFailure(e);
  assert.equal(f.aiCode, "5007");
  assert.equal(f.aiMessage, "model unavailable");
  assert.ok(describeBindingFailure(new Error("y".repeat(500))).aiMessage.length <= 200);
});

test("a binding that hangs is still a timeout -> 504, not an outage", async () => {
  const ai = { run: () => new Promise<unknown>(() => {}) };
  await assert.rejects(proposeTerms(TEXT, { AI: ai }, { timeoutMs: 100 }), (err: unknown) => {
    if (!(err instanceof LlmError)) return false;
    assert.equal(err.code, "timeout");
    assert.equal(llmFailureCode(err.code), "UPSTREAM_TIMEOUT");
    return true;
  });
  assert.equal(llmFailureCode("bad_output"), "UPSTREAM_ERROR");
  assert.equal(llmFailureCode("upstream"), "UPSTREAM_ERROR");
});
