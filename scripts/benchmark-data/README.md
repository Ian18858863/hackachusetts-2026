# Benchmark cache

`scripts/ranking-benchmark.ts` stores each upstream response here (GitHub phenopacket-store listings and files, Monarch semsim, JAX HPO annotations) as one JSON file with its URL and fetch time. The files are not committed: they are about 9 MB.

Running `node --experimental-strip-types scripts/ranking-benchmark.ts` with an empty folder fetches everything again from the live upstreams. Those services change over time (new HPO releases, Monarch knowledge-graph updates, new phenopacket-store cases), so a fresh run may select different cases or give different ranks than the table in `docs/research/ranking-benchmark.md`, which was computed from data fetched on 2026-10-24.
