// Unit tests for functions/_lib/rateLimit.ts (fixed-window per-IP limit).
// Run: node --test --experimental-strip-types functions/_lib/rateLimit.test.ts
// Uses an in-memory stand-in for caches.default; no network.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EXTRACT_LIMIT_PER_HOUR,
  EXTRACT_LIMIT_PER_MINUTE,
  checkAndCount,
  clientIp,
  extractWindows,
  type CounterCache,
} from "./rateLimit.ts";

/** In-memory cache stub keyed by URL; ignores max-age (expiry comes from the window key). */
class MemoryCache implements CounterCache {
  store = new Map<string, string>();
  async match(request: Request): Promise<Response | undefined> {
    const v = this.store.get(request.url);
    return v === undefined ? undefined : new Response(v);
  }
  async put(request: Request, response: Response): Promise<void> {
    this.store.set(request.url, await response.text());
  }
}

const T0 = Date.UTC(2026, 9, 24, 16, 0, 0); // start of a minute and of an hour
const windows = extractWindows(undefined);

test("allows the first 10 per minute, limits the 11th with Retry-After to the minute end", async () => {
  const cache = new MemoryCache();
  for (let i = 0; i < EXTRACT_LIMIT_PER_MINUTE; i++) {
    assert.deepEqual(await checkAndCount(cache, "203.0.113.7", windows, T0 + i * 1000), { limited: false });
  }
  const d = await checkAndCount(cache, "203.0.113.7", windows, T0 + 15_500);
  assert.deepEqual(d, { limited: true, retryAfterSec: 45 });
});

test("a rejected request is not counted", async () => {
  const cache = new MemoryCache();
  for (let i = 0; i < EXTRACT_LIMIT_PER_MINUTE + 5; i++) await checkAndCount(cache, "a", windows, T0);
  const counts = [...cache.store.values()];
  assert.deepEqual(counts, [String(EXTRACT_LIMIT_PER_MINUTE), String(EXTRACT_LIMIT_PER_MINUTE)]);
});

test("the next minute window allows again", async () => {
  const cache = new MemoryCache();
  for (let i = 0; i < EXTRACT_LIMIT_PER_MINUTE; i++) await checkAndCount(cache, "a", windows, T0);
  assert.equal((await checkAndCount(cache, "a", windows, T0 + 59_999)).limited, true);
  assert.equal((await checkAndCount(cache, "a", windows, T0 + 60_000)).limited, false);
});

test("the hour limit applies across minute windows", async () => {
  const cache = new MemoryCache();
  for (let i = 0; i < EXTRACT_LIMIT_PER_HOUR; i++) {
    const at = T0 + Math.floor(i / EXTRACT_LIMIT_PER_MINUTE) * 60_000;
    assert.equal((await checkAndCount(cache, "a", windows, at)).limited, false, `request ${i + 1}`);
  }
  const at = T0 + 10 * 60_000; // fresh minute window, hour full
  assert.deepEqual(await checkAndCount(cache, "a", windows, at), { limited: true, retryAfterSec: 3000 });
});

test("IPs are counted separately and the IP is not stored in clear", async () => {
  const cache = new MemoryCache();
  for (let i = 0; i < EXTRACT_LIMIT_PER_MINUTE; i++) await checkAndCount(cache, "198.51.100.1", windows, T0);
  assert.equal((await checkAndCount(cache, "198.51.100.1", windows, T0)).limited, true);
  assert.equal((await checkAndCount(cache, "198.51.100.2", windows, T0)).limited, false);
  for (const key of cache.store.keys()) {
    assert.ok(key.startsWith("https://rdd.internal/ratelimit/extract/"), key);
    assert.ok(!key.includes("198.51.100"), key);
  }
});

test("fails open without a cache or when the cache throws", async () => {
  assert.deepEqual(await checkAndCount(undefined, "a", windows, T0), { limited: false });
  const broken: CounterCache = {
    match: async () => {
      throw new Error("cache down");
    },
    put: async () => {
      throw new Error("cache down");
    },
  };
  assert.deepEqual(await checkAndCount(broken, "a", windows, T0), { limited: false });
});

test("env override lowers the per-minute limit; invalid values keep the default", async () => {
  assert.equal(extractWindows({ RDD_EXTRACT_LIMIT_PER_MIN: "2" })[0].limit, 2);
  for (const bad of ["0", "-1", "abc", "", "1.5"]) {
    assert.equal(extractWindows({ RDD_EXTRACT_LIMIT_PER_MIN: bad })[0].limit, EXTRACT_LIMIT_PER_MINUTE, bad);
  }
  assert.equal(extractWindows({ RDD_EXTRACT_LIMIT_PER_MIN: "2" })[1].limit, EXTRACT_LIMIT_PER_HOUR);
  const cache = new MemoryCache();
  const low = extractWindows({ RDD_EXTRACT_LIMIT_PER_MIN: "2" });
  await checkAndCount(cache, "a", low, T0);
  await checkAndCount(cache, "a", low, T0);
  assert.equal((await checkAndCount(cache, "a", low, T0)).limited, true);
});

test("clientIp reads CF-Connecting-IP, else 'unknown'", () => {
  assert.equal(clientIp(new Request("https://x/", { headers: { "CF-Connecting-IP": " 192.0.2.4 " } })), "192.0.2.4");
  assert.equal(clientIp(new Request("https://x/")), "unknown");
});
