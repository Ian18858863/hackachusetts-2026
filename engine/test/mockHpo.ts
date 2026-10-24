// Mocked JAX HPO API for tests. Term records are trimmed copies of real JAX
// responses read on 2026-10-24 (ids, names, synonyms). The search mock is a
// simple substring simulator that lists distractors first, like the real API
// does for "Seizures" (HP:0001250 was result 9 of 20 on 2026-10-24).

import type { EngineDeps, FetchLike, HpoTerm } from "../types";

export const DB: readonly HpoTerm[] = [
  // distractors first so a naive "take the top result" would be wrong
  { id: "HP:0002199", label: "Hypocalcemic seizures", synonyms: ["Low calcium seizures", "Seizures due to hypocalcemia"] },
  { id: "HP:0031951", label: "Nocturnal seizures", synonyms: ["Sleep seizures"] },
  { id: "HP:0100807", label: "Long fingers", synonyms: ["Long fingers"] },
  { id: "HP:0001250", label: "Seizure", synonyms: ["Epileptic seizure", "Seizures", "Epilepsy"] },
  { id: "HP:0001166", label: "Arachnodactyly", synonyms: ["Long slender fingers", "Long, slender fingers", "Spider fingers"] },
  { id: "HP:0003707", label: "Calf muscle pseudohypertrophy", synonyms: ["Enlarged calf muscles"] },
  { id: "HP:0012378", label: "Fatigue", synonyms: ["Tiredness"] },
  { id: "HP:0002650", label: "Scoliosis", synonyms: [] },
];

export interface MockOptions {
  /** Force this HTTP status for every request (e.g. 500). */
  status?: number;
  /** Fail when fetch is called with a `this` other than undefined (Workers "Illegal invocation"). */
  strictThis?: boolean;
}

export interface MockHpo {
  deps: EngineDeps;
  calls: string[];
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function toJax(t: HpoTerm): Record<string, unknown> {
  return { id: t.id, name: t.label, definition: "", synonyms: t.synonyms ?? [] };
}

export function mockHpo(opts: MockOptions = {}): MockHpo {
  const calls: string[] = [];
  const fetch: FetchLike = async function (this: unknown, input: string) {
    if (opts.strictThis && this !== undefined) throw new TypeError("Illegal invocation");
    calls.push(input);
    if (opts.status !== undefined) return json({ error: "mock" }, opts.status);
    const url = new URL(input);
    const termMatch = /^\/api\/hp\/terms\/(.+)$/.exec(url.pathname);
    if (termMatch) {
      const id = decodeURIComponent(termMatch[1] ?? "");
      const t = DB.find((d) => d.id === id);
      return t ? json(toJax(t)) : json({ message: "not found" }, 404);
    }
    if (url.pathname === "/api/hp/search") {
      const q = (url.searchParams.get("q") ?? "").toLowerCase();
      const limit = Number(url.searchParams.get("limit") ?? "10");
      const hits = DB.filter(
        (d) => d.label.toLowerCase().includes(q) || (d.synonyms ?? []).some((s) => s.toLowerCase().includes(q)),
      ).slice(0, limit);
      return json({ terms: hits.map(toJax), totalCount: hits.length });
    }
    return json({ message: "unexpected path" }, 404);
  };
  return {
    deps: { fetch, now: () => new Date("2026-10-24T16:30:00.000Z") },
    calls,
  };
}
