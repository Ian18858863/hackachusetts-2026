// Per-IP rate limit for the live LLM path of POST /api/extract (T18p).
//
// Purpose: keep public traffic from using up the Workers AI allocation on the
// project's Cloudflare account. Only live extractions are counted; requests
// answered from a prepared demo extraction never reach this code.
//
// Method: fixed windows (one per minute, one per hour). Counters live in the
// Workers Cache API (caches.default) under synthetic URLs
// https://rdd.internal/ratelimit/extract/<window>/<windowStart>/<ipHash>
// with a max-age that ends shortly after the window.
//
// This is APPROXIMATE, on purpose:
// - The Cache API is per data centre, so a client that reaches several data
//   centres gets a separate allowance in each.
// - Read-then-write is not atomic, so parallel requests can overshoot a limit
//   by a few.
// - The cache may evict an entry early, which only makes the limit looser.
// It is a cheap guard against casual abuse, not a quota system.
//
// Fail open: if the Cache API is missing or any cache call throws, the request
// is allowed. Privacy: the IP is only used as a SHA-256 hash inside the cache
// key; it is never logged or returned. No note text is seen here.
//
// No imports, so `node --test --experimental-strip-types` can load this file
// directly (functions/_lib/rateLimit.test.ts).

/** At most this many live extractions per IP per minute (fixed window). */
export const EXTRACT_LIMIT_PER_MINUTE = 10;
/** At most this many live extractions per IP per hour (fixed window). */
export const EXTRACT_LIMIT_PER_HOUR = 60;
/**
 * Env var that overrides the per-minute limit (positive integer), e.g. to test
 * the 429 path locally with a low value. Unset or invalid -> the default above.
 */
export const LIMIT_PER_MIN_ENV = "RDD_EXTRACT_LIMIT_PER_MIN";

const KEY_BASE = "https://rdd.internal/ratelimit/extract";
/** Extra cache lifetime after a window ends, so clock skew does not reset a counter early. */
const MAX_AGE_SLACK_SEC = 5;

/** The subset of the Cache API this module uses (caches.default, or a test stub). */
export interface CounterCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

export interface RateWindow {
  name: string;
  seconds: number;
  limit: number;
}

export type RateDecision = { limited: false } | { limited: true; retryAfterSec: number };

/** Waits under this many seconds are worded "in a minute"; longer ones "in about an hour". */
const MINUTE_WORDING_MAX_SEC = 120;

/** User-facing 429 message, worded from the wait (contract section 4: say what the user can do). */
export function rateLimitMessage(retryAfterSec: number): string {
  const when = retryAfterSec < MINUTE_WORDING_MAX_SEC ? "in a minute" : "in about an hour";
  return `Too many requests from this address. Your notes are kept. Try again ${when}, or use a demo case.`;
}

/** Schedules background work after the response (Pages `context.waitUntil`). */
export type WaitUntil = (promise: Promise<unknown>) => void;

/** Minute and hour windows, with the optional per-minute override from env. */
export function extractWindows(env: { RDD_EXTRACT_LIMIT_PER_MIN?: unknown } | undefined): RateWindow[] {
  let perMinute = EXTRACT_LIMIT_PER_MINUTE;
  const raw = env?.RDD_EXTRACT_LIMIT_PER_MIN; // name: LIMIT_PER_MIN_ENV
  if (typeof raw === "string" && /^\d{1,6}$/.test(raw.trim())) {
    const n = Number(raw.trim());
    if (n >= 1) perMinute = n;
  }
  return [
    { name: "min", seconds: 60, limit: perMinute },
    { name: "hour", seconds: 3600, limit: EXTRACT_LIMIT_PER_HOUR },
  ];
}

/** Client IP from Cloudflare's header, else "unknown" (all such clients share one counter). */
export function clientIp(request: Request): string {
  const ip = request.headers.get("CF-Connecting-IP")?.trim();
  return ip ? ip : "unknown";
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function readCount(cache: CounterCache, key: Request): Promise<number> {
  const hit = await cache.match(key);
  if (!hit) return 0;
  const n = Number.parseInt(await hit.text(), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Check every window and, when none is full, count this request in all of
 * them. A rejected request is not counted. Never throws.
 *
 * With `waitUntil`, the counter writes run in the background after the
 * response, so they add no latency. This makes the count a little more
 * approximate (a request that arrives before the write lands reads the old
 * value); without `waitUntil` (tests) the writes are awaited.
 */
export async function checkAndCount(
  cache: CounterCache | undefined,
  ip: string,
  windows: readonly RateWindow[],
  nowMs: number = Date.now(),
  waitUntil?: WaitUntil,
): Promise<RateDecision> {
  if (!cache) return { limited: false };
  try {
    const ipHash = await sha256Hex(ip);
    const slots = windows.map((w) => {
      const sizeMs = w.seconds * 1000;
      const start = Math.floor(nowMs / sizeMs) * sizeMs;
      const endMs = start + sizeMs;
      return { w, endMs, key: new Request(`${KEY_BASE}/${w.name}/${start}/${ipHash}`) };
    });
    const counts = await Promise.all(slots.map((s) => readCount(cache, s.key)));

    let retryAfterSec = 0;
    slots.forEach((s, i) => {
      if (counts[i] >= s.w.limit) {
        retryAfterSec = Math.max(retryAfterSec, Math.max(1, Math.ceil((s.endMs - nowMs) / 1000)));
      }
    });
    if (retryAfterSec > 0) return { limited: true, retryAfterSec };

    const writes = Promise.all(
      slots.map((s, i) => {
        const maxAge = Math.max(1, Math.ceil((s.endMs - nowMs) / 1000)) + MAX_AGE_SLACK_SEC;
        return cache.put(
          s.key,
          new Response(String(counts[i] + 1), {
            headers: { "Content-Type": "text/plain", "Cache-Control": `max-age=${maxAge}` },
          }),
        );
      }),
    ).catch(() => undefined); // fail open: a failed write only loosens the limit
    if (waitUntil) waitUntil(writes);
    else await writes;
    return { limited: false };
  } catch {
    // Fail open: a broken cache must never block extraction.
    return { limited: false };
  }
}
