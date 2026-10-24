// GET /api/health (docs/CONTRACT.md section 7.1). Liveness check; no engine call.
// Reports whether the Workers AI binding `AI` is present and which model
// /api/extract would use. Earlier fields (`service`, `commit`) are kept.

import { pickModel } from "../_lib/llm";
import type { LlmEnv } from "../_lib/llm";
import { CONTRACT_VERSION, json, methodNotAllowed } from "../_lib/respond";
import type { PagesContext } from "../_lib/respond";

interface Env extends LlmEnv {
  // Set by Cloudflare Pages on Git-integrated builds; absent on local dev and
  // on most direct uploads.
  CF_PAGES_COMMIT_SHA?: string;
}

interface HealthBody {
  version: typeof CONTRACT_VERSION;
  source: "live";
  ok: true;
  service: string;
  time: string;
  llm: { binding: boolean; model: string | null };
  commit?: string;
}

export const onRequest = (context: PagesContext<Env>): Response => {
  const method = context.request.method;
  if (method !== "GET" && method !== "HEAD") return methodNotAllowed(["GET", "HEAD"]);

  const { env } = context;
  const binding = typeof env.AI?.run === "function";
  const body: HealthBody = {
    version: CONTRACT_VERSION,
    source: "live",
    ok: true,
    service: "hackachusetts-2026",
    time: new Date().toISOString(),
    llm: { binding, model: binding ? pickModel(env.LLM_MODEL) : null },
  };
  const sha = env.CF_PAGES_COMMIT_SHA;
  if (sha) body.commit = sha;

  const response = json(body);
  // HEAD: same status and headers, no body (uptime probes).
  return method === "HEAD" ? new Response(null, { status: response.status, headers: response.headers }) : response;
};
