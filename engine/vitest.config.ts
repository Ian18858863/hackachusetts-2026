// Engine test configuration (T08). Only affects tests: the runtime code and
// the Workers bundle are unchanged.
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // questions.test.ts marks its blocks concurrent; let all of its real-timer
    // budget tests and retry-backoff properties overlap (default is 5).
    maxConcurrency: 40,
  },
});
