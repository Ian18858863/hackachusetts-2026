// GET /api/health — liveness check for the Cloudflare Pages deployment.
// Pages routes this file to /api/health; only the GET handler is defined.

interface Env {
  // Set by Cloudflare Pages on Git-integrated builds; absent on local dev and
  // on most direct uploads.
  CF_PAGES_COMMIT_SHA?: string;
}

interface HealthBody {
  ok: true;
  service: string;
  time: string;
  commit?: string;
}

export const onRequestGet = (context: { env: Env }): Response => {
  const body: HealthBody = {
    ok: true,
    service: "hackachusetts-2026",
    time: new Date().toISOString(),
  };
  const sha = context.env.CF_PAGES_COMMIT_SHA;
  if (sha) body.commit = sha;

  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
};
