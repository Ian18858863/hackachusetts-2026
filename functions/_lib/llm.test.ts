// Unit tests for functions/_lib/llm.ts streaming with a deadline (T39).
// Run: node --test --experimental-strip-types functions/_lib/llm.test.ts
// Uses a stubbed AI binding; no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import { LlmError, SseText, buildRequest, parsePartialItems, proposeTerms } from "./llm.ts";

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
