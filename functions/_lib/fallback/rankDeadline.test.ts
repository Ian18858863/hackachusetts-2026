// Deadline test for POST /api/rank under RDD_RANK_SOURCE = "pcf" (T36c).
// Run: engine/node_modules/.bin/vite-node functions/_lib/fallback/rankDeadline.test.ts
// (vite-node because rank.ts imports the engine without file extensions.)
//
// Upstreams are stubbed by URL; nothing goes to the network. Timing is scaled
// down 10x (deadline 1.7 s, PCF wait 1.2 s) so the test is quick. A "slow"
// upstream never answers unless its request is aborted, so only the
// handler's own deadline can end the request. The HPO ids are real; the
// PubCaseFinder row is a hand-made fixture.

import assert from "node:assert/strict";
import { test } from "node:test";
import { RANK_TIMING, onRequest } from "../../api/rank";

RANK_TIMING.deadlineMs = 1700;
RANK_TIMING.pcfWaitMs = 1200;
RANK_TIMING.evidenceReserveMs = 150;
const SLACK_MS = 150;

type Pcf = "fail-early" | "late-list" | "never";

function hang(init?: RequestInit): Promise<Response> {
  return new Promise((_, reject) => {
    const s = init?.signal;
    if (!s) return;
    if (s.aborted) reject(s.reason);
    else s.addEventListener("abort", () => reject(s.reason), { once: true });
  });
}

function stubFetch(pcf: Pcf): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("pubcasefinder")) {
      if (pcf === "fail-early") {
        await new Promise((r) => setTimeout(r, 50));
        return new Response("busy", { status: 503 });
      }
      if (pcf === "late-list") {
        // The list arrives at 1.19 s of a 1.2 s wait (11.9 s of 12 s in production).
        await new Promise((r) => setTimeout(r, 1190));
        return new Response("Rank\tScore\tOMIM_ID\tDisease_Name\n1\t0.9\tOMIM:257220\tExample row\n", { status: 200 });
      }
      return hang(init);
    }
    // Monarch, JAX annotations and everything else: slow.
    return hang(init);
  }) as typeof fetch;
}

async function timeRank(pcf: Pcf, enginePath = "engine"): Promise<{ ms: number; status: number; path: string | null; enrichment: string | null }> {
  stubFetch(pcf);
  const request = new Request("http://local.test/api/rank", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ observed: ["HP:0001250", "HP:0001263"], excluded: [], limit: 5 }),
  });
  const context = {
    request,
    env: { RDD_RANK_SOURCE: "pcf", RDD_ENGINE_PATH_RANK: enginePath },
    waitUntil: (p: Promise<unknown>) => void p.catch(() => undefined),
    params: {},
    next: () => Promise.resolve(new Response(null, { status: 404 })),
    data: {},
  };
  const t0 = Date.now();
  const res = await onRequest(context as never);
  return { ms: Date.now() - t0, status: res.status, path: res.headers.get("X-RDD-Path"), enrichment: res.headers.get("X-RDD-Enrichment") };
}

for (const [name, pcf, enginePath] of [
  ["PCF fails early, Monarch slow (engine path)", "fail-early", "engine"],
  ["PCF list at 11.9 s (scaled), evidence and Monarch slow", "late-list", "engine"],
  ["PCF and Monarch both slow (engine path)", "never", "engine"],
  ["PCF and Monarch both slow (fallback path, 10 s Monarch timeout)", "never", "fallback"],
] as const) {
  test(name, async () => {
    const r = await timeRank(pcf, enginePath);
    console.log(`${name}: ${r.status} ${r.path} ${r.enrichment ?? "-"} ${r.ms} ms (deadline ${RANK_TIMING.deadlineMs} ms)`);
    assert.ok(r.ms <= RANK_TIMING.deadlineMs + SLACK_MS, `answered after ${r.ms} ms`);
    assert.ok([200, 502, 504].includes(r.status), `status ${r.status}`);
    if (pcf === "late-list" && r.path === "pcf") {
      // The list was used, but its evidence could not finish: served as incomplete (never cached).
      assert.equal(r.enrichment, "incomplete");
    } else {
      const expected = { "fail-early": "pcf->", "late-list": "pcf-late->", never: "pcf-timeout->" }[pcf];
      assert.ok(r.path?.startsWith(expected), `path ${r.path}`);
    }
  });
}
