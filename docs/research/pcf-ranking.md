# PubCaseFinder as a ranking source (T36): what we built, what we measured, what we decided

Our own small evaluation on published cases, 2026-10-24. Not a clinical validation.

**Decision (coordinator, 18:01 ET): production stays on Monarch semantic similarity, and the PubCaseFinder switch stays off.** The code is merged so the measurement can be repeated, but no deployment sets the switch.

## What T36 built

Commit `7c70745` on branch `ian/t36-pcf`, cherry-picked in T11p as `1284d4c`. Files: `functions/_lib/fallback/pcf.ts` (new), `functions/api/rank.ts` (the switch), four helpers exported from `functions/_lib/fallback/rank.ts`, `scripts/rank-benchmark.mjs` (new), attribution in `README.md` and `THIRD_PARTY_NOTICES.md`, and a commented-out line in `wrangler.toml`.

- **Switch.** `RDD_RANK_SOURCE = "pcf"` makes `/api/rank` order candidates by PubCaseFinder (PCF). Unset, the code path, the cache key and the response are unchanged (checked: smoke 14 passed, 0 failed, `X-RDD-Path: engine`). With the switch on, the rank cache key gets a `pcf:` prefix and the response header says `X-RDD-Path: pcf`.
- **PCF call.** `GET https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=tsv&hpo_id=…`. Only the first 40 rows are read from the stream (the JSON body is 10.9 MB; the TSV 0.84 MB). Timeout 20 s, no retry, because PCF took 8.6–10.3 s before the first byte and a 12 s timeout failed on `demo-kabuki`.
- **Ids and names.** Each OMIM row goes through the JAX annotation (MONDO id) and the Monarch entity record (ORPHA cross-reference). The disease id rule is ORPHA, else OMIM, as in the fallback; names follow the same rule as `/api/next-questions`, so the "why" lines name the same diseases as the match cards (checked for the PCF top 5 of `demo-npc1` and `demo-dmd`).
- **Evidence.** PCF returns only an order and a score. The matched and broader-term evidence comes from one Monarch `semsim/compare` call per candidate (about 0.6 s), observed terms against the disease's annotated terms, passed through the existing `buildCandidate`. So the HP-only shared-ancestor rule, the organ-system cut-off and the exact + 0.5 × broader weighting are the same code as on the Monarch path (contract §7.4 steps 5 and 8).
- **Score.** The PCF score (0–1) is shown only as the raw service score. Candidates get `pubCaseFinderRank`, `"pubcasefinder"` in `sources` and `dataVersions.pubCaseFinder` (fetch date).
- **Budget.** At most 34 upstream fetches and 12 cache operations per request, under the Workers limit of 50 subrequests.
- **Fallback.** If PCF fails or times out, the same request answers from the Monarch path with `X-RDD-Path: pcf->engine`, and that answer is not cached. This happened naturally twice in testing (kabuki in a first run, the TIMES case below); a deliberate forced-failure test is NOT RUN.
- **Attribution.** `PubCaseFinder (DBCLS), CC BY 4.0.` (contract §13), in the app footer whenever a candidate's `sources` includes `pubcasefinder`, in `README.md` and in `THIRD_PARTY_NOTICES.md`.

## Terms of use (checked by Kiro in T36 before any code)

- https://pubcasefinder.dbcls.jp/ works without registration or key; the footer says "© 2018 DBCLS, Licensed under … (CC-BY 4.0)".
- https://pubcasefinder.dbcls.jp/termsofservice: the service "should not be used to make medical decisions without the advice of a physician". Prohibited uses (including "massive information transfer") are at https://dbcls.rois.ac.jp/policy-en.html.
- The API description (`/static/data/api/swagger-pubcasefinder.json`) asks users to stay under 10 requests per minute, 100 per hour or 1,000 per day. T36 caches each PCF list for 24 h and caps live PCF calls per data centre at 8 per minute and 90 per hour.

## Result 1: 14 cases through our `/api/rank` (T36, about 17:40 ET)

Same 14 cases as [ranking-benchmark.md](ranking-benchmark.md) (4 demo cases and 10 phenopacket-store cases picked by its pre-registered rule; observed terms only, no excluded terms). `node scripts/rank-benchmark.mjs http://127.0.0.1:8848 --limit 10` against a local server with the switch on; all 14 answered HTTP 200.

| Case | Expected | Terms | Rank with PCF | Path |
|---|---|---|---|---|
| demo-dmd | OMIM:310200 | 12 | 4 | pcf |
| demo-marfan | OMIM:154700 | 9 | 1 | pcf |
| demo-kabuki | OMIM:147920 | 14 | 1 | pcf |
| demo-cdls | OMIM:122470 | 9 | 1 | pcf |
| PMID_15266616_100 | OMIM:147791 | 7 | > 10 | pcf |
| PMID_14742428_DM | OMIM:620698 | 6 | 1 | pcf |
| PMID_37913506_II_3 | OMIM:620734 | 4 | > 10 | pcf |
| PMID_33275657_Family_A_III_2 | OMIM:301071 | 1 | > 10 | pcf |
| PMID_26153216_Patient_1 | OMIM:616977 | 13 | 2 | pcf |
| PMID_39623139_Patient_1 | OMIM:621056 | 26 | 1 | pcf->engine (PCF over 20 s) |
| PMID_27900365_patient | OMIM:257220 | 12 | 1 | pcf |
| PMID_39132680_Family_1_16DG0991 | OMIM:620962 | 12 | 1 | pcf |
| PMID_38609546_patient_P1 | OMIM:620795 | 10 | 1 | pcf |
| PMID_18423521_Patient_1a | OMIM:113620 | 5 | 1 | pcf |

| Source | Top-1 | Top-3 | Top-10 |
|---|---|---|---|
| PCF through `/api/rank` | 9 / 14 | 10 / 14 | 11 / 14 |
| Monarch (13:04 ET run in ranking-benchmark.md) | 5 / 14 | 6 / 14 | 6 / 14 |

- `demo-dmd` is #4, where the direct PCF check below has #3. PCF ties OMIM:620793 and Duchenne at rank 3; our tie-break is `diseaseId` ascending (contract §7.4 step 9), and `OMIM:` sorts before `ORPHA:98896`. The tie-break was not changed after seeing the result.
- The TIMES case counts as a hit, but its answer came from the Monarch fallback because PCF took over 20 s.
- Cold PCF requests took 10.4–23.5 s end to end; warm (cached) requests 1.4–1.6 s. The app's client timeout for `/api/rank` is 14 s (`app/src/shared/api.ts`), so a cold call would abort in the app with the switch on.

## Result 2: the coordinator's direct PCF check (about 17:20 ET)

The coordinator called the PCF API directly (`format=json`, sorted ids, no excluded terms) on the same case set, outside our code. Source: `handoff/pcf_benchmark.md` (outside the repo).

- 14 cases: top-1 Monarch 5 → PCF 10; top-3 6 → 12.
- The 10 non-demo cases: top-1 5 → 6; top-3 6 → 7.
- PCF loses cases Monarch had: Hypertrophic cardiomyopathy 30 goes from #2 to #603, and Jacobsen syndrome is #1424.
- A Duchenne-like symptom set from a Chinese free-text note (Gait disturbance, Frequent falls, Difficulty climbing stairs, Gowers sign) gave a production top 5 on Monarch of hereditary progressive chorea without dementia, myoclonus familial 1, atonic-astatic syndrome of Foerster, CMT 1D and bagassosis. In T36 the PCF path gave five muscular dystrophies for the same kind of set.

Most of the gain is on the four demo cases, which were chosen because Monarch misses them. On the 10 cases picked by the pre-registered rule the gain is one case at top-1 and one at top-3.

## Result 3: the held-out decision (18:01 ET)

Jerry ran a pre-registered 50-case held-out evaluation (Jerry's held-out run, `docs/research/ranking-benchmark-50.md`, added separately; not on `main` when this note was written). PCF answered HTTP 429 (rate limited) after 10 cases, so only those 10 cases have all three sources:

| Source | Top-1 | Top-3 | Top-10 |
|---|---|---|---|
| Monarch | 3 / 10 | 5 / 10 | 6 / 10 |
| PCF | 3 / 10 | 5 / 10 | 5 / 10 |
| Reciprocal rank fusion (RRF) of both | 2 / 10 | 4 / 10 | 9 / 10 |

No source improved top-1 or top-3 on held-out cases. On that basis the coordinator decided at 18:01 ET to keep Monarch in production and the switch off. A follow-up that had started (an RRF mode in `pcf.ts` and a package to flip production to PCF, with a new landing screenshot and a contract note) was stopped at that decision; neither has a commit on `main`.

## Caveats

- **Leakage.** PubCaseFinder is built partly from published case reports, and every case here comes from a publication. PCF may have seen these exact cases, so its numbers are likely optimistic, more so than Monarch's.
- **Small samples.** 14 cases and 10 held-out cases. One case moves a count by 1 of 10.
- **Ranking only.** The input was the published HPO terms, not extraction from notes.
- **Not in the contract.** `RDD_RANK_SOURCE`, the 20 s PCF timeout, the TSV format and the `pcf` path values are not in `docs/CONTRACT.md`, which still says 6 s for PCF (§10).
- **Footer wording.** With the switch on, the app would also show the Monarch line ("Ranking by the Monarch Initiative…"), because Monarch supplies the broader-term evidence. That wording would need a §13 change before the switch could be used.
- **Landing card.** In T36, `demo-npc1` on the PCF path showed 7 exact and 5 broader matches of 12; production on Monarch shows 6 and 6, which is what the landing and the app describe.

## Evidence

- Code: commit `7c70745` (T36), cherry-picked as `1284d4c` (T11p).
- T36 session output (tables above, terms check, gates): assistant's run log (`t36.log`).
- Coordinator's direct PCF check: `handoff/pcf_benchmark.md` (outside the repo).
- Held-out run: Jerry's `docs/research/ranking-benchmark-50.md` (added separately) and the coordinator's 18:01 ET decision in the team chat.
