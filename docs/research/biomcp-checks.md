# biomcp checks for the demo cases (T20b)

Recorded by Ian's Kiro on 2026-10-24 (America/New_York). Development research only: the shipped app does not call biomcp or any MCP server. Demo cases are synthetic (docs/CONTRACT.md §9); nothing here is medical advice or a diagnosis.

## Setup

- Tool: `biomcp` 0.9.3 (`uv tool install biomcp-cli`, MIT, https://github.com/genomoncology/biomcp), installed at `~/.local/bin/biomcp`.
- MCP server: `.kiro/settings/mcp.json` entry `biomcp` = `biomcp serve` (stdio), the config printed by `biomcp mcp-config --client json`.
- Agent: `rdd-builder`, with `@biomcp` in `tools` and `allowedTools`.
- biomcp tools exposed over MCP: `biomcp` (generic read-only CLI), `gene_cspec`, `get`, `search`, `variant_articles`, `variant_erepo`, `variant_normalize_car`. The typed `search` tool has no phenotype entity, so phenotype search goes through the generic `biomcp` tool.
- Sessions: `kiro-cli chat --no-interactive --trust-all-tools --agent rdd-builder "<prompt>"`, with the prompt limited to biomcp tools and no file edits.
  - Session 1: 2026-10-24T16:38:24Z to 16:39:19Z
  - Session 2: 2026-10-24T16:39:38Z to 16:40:10Z
  - Neither session changed any file (`git status` was the same before and after).

## (a) Phenotype search for `demo-dmd` (Monarch semsim via biomcp)

Input: the 12 observed terms of `demo-dmd` (CONTRACT §9.1). The negated term (Seizure) is left out, as in CONTRACT §7.4.

**Call a1:** `@biomcp/biomcp` with `command: search phenotype "HP:0001270 HP:0003551 HP:0003391 HP:0003707 HP:0012378 HP:0003750 HP:0030235 HP:0031956 HP:0031964 HP:0025435 HP:0002380 HP:0040129" --limit 5`, `json: true`

```
Error: Invalid argument: Phenotype search accepts at most 10 unique HPO terms
```

This 10-term cap is in biomcp. The direct Monarch call accepts all 12 (see the cross-check below).

**Call a2:** the same, using only the first 10 ids (drops `HP:0002380`, `HP:0040129`), `--limit 5`

| Rank | Disease id | Name | Score |
|---|---|---|---|
| 1 | MONDO:0018485 | glycogen storage disease due to acid maltase deficiency, late-onset | 13.690955048657331 |
| 2 | MONDO:0859322 | myopathy with myalgia, increased serum creatine kinase, and with or without episodic rhabdomyolysis 1 | 13.390493870153383 |
| 3 | MONDO:0013161 | autosomal recessive limb-girdle muscular dystrophy type 2O | 13.33815070375402 |
| 4 | MONDO:0013686 | distal myopathy, Tateyama type | 13.316626308192886 |
| 5 | MONDO:0029135 | muscular dystrophy-dystroglycanopathy (limb-girdle), type C, 8 | 13.305541947366658 |

**Call a3 (session 2):** first 10 ids, `--limit 50`. It returned 50 rows (`"count": 50`, `"total": null`).
- MONDO:0010679 Duchenne muscular dystrophy: rank 32, score `11.832009459929228`.
- MONDO:0010311 Becker muscular dystrophy: rank 10, score `12.68863217189922`.
- biomcp's `direct_support` field for Duchenne marks 4 of the 10 terms as supported (HP:0001270, HP:0003551, HP:0003391, HP:0003707). The other 6, including HP:0030235 Extremely elevated creatine kinase, are `not_supported`.

**Call a4 (session 2):** last 10 ids (`HP:0003391 … HP:0040129`, which drops `HP:0001270` and `HP:0003551`), `--limit 50`. It returned 50 rows.
- Duchenne muscular dystrophy: not in the top 50.
- Becker muscular dystrophy (MONDO:0010311): rank 9, score `12.407337779257572`.
- Top 5:
  1. MONDO:0013686 distal myopathy, Tateyama type (13.380329954966854)
  2. MONDO:0018485 glycogen storage disease due to acid maltase deficiency, late-onset (12.966989883966644)
  3. MONDO:0859322 myopathy with myalgia, increased serum creatine kinase, and with or without episodic rhabdomyolysis 1 (12.779501058938962)
  4. MONDO:0013049 DPM3-congenital disorder of glycosylation (12.69936428578)
  5. MONDO:0957270 muscular dystrophy, limb-girdle, autosomal recessive 28 (12.664975907471144)

Ranks are 1-based positions in biomcp's `results`, which are ordered by descending score. biomcp does not return a rank field. Session 2's prompt also asked about MONDO:0010542 for Becker; that id was my mistake, and the responses use MONDO:0010311.

**Cross-check without biomcp (direct Monarch call, the exact call in CONTRACT §7.4 / §10):** run by Kiro with `curl` at 2026-10-24T16:40:27Z.

`GET https://api.monarchinitiative.org/v3/api/semsim/search/<all 12 ids, comma-joined>/Human%20Diseases?limit=50` returned 50 rows.

| Rank | Disease id | Name | Score |
|---|---|---|---|
| 1 | MONDO:0018485 | glycogen storage disease due to acid maltase deficiency, late-onset | 13.191492904351943 |
| 2 | MONDO:0029135 | muscular dystrophy-dystroglycanopathy (limb-girdle), type C, 8 | 13.060738849827274 |
| 3 | MONDO:0979897 | congenital myopathy 27 | 13.049395931409938 |
| 4 | MONDO:0013686 | distal myopathy, Tateyama type | 12.982890164664203 |
| 5 | MONDO:0013161 | autosomal recessive limb-girdle muscular dystrophy type 2O | 12.972662212071103 |
| 15 | MONDO:0010311 | Becker muscular dystrophy | 12.531975508959857 |
| 40 | MONDO:0010679 | Duchenne muscular dystrophy | 11.739528911010684 |

## (b) Recruiting ClinicalTrials.gov studies for Duchenne muscular dystrophy

> **Recorded fixture candidate** for Jerry's demo cache (`engine/demo/**`) and the T16 trials panel. Retrieved 2026-10-24 between 16:38:24Z and 16:39:19Z (session 1) from ClinicalTrials.gov through biomcp. Trial listings change; re-record before use and keep this retrieval time with the fixture.

**Call:** `@biomcp/search` with `entity: "trial"`, `condition: ["Duchenne muscular dystrophy"]`, `status: "recruiting"`, `limit: 5`. It was run once as Markdown and once with `json: true` for the full titles. It returned 5 of 64 total results.

| NCT id | Title | Phase | Status |
|---|---|---|---|
| NCT06769633 | Pharmacokinetics and Safety of Givinostat in DMD Patients Ages From at Least 2 Years to Less Then 6 Years Old | PHASE2 | RECRUITING |
| NCT07038824 | A Study in Participants With Duchenne Muscular Dystrophy Amenable to Exon 45 Skipping to Evaluate the Safety and Efficacy of ENTR-601-45 | PHASE1/PHASE2 | RECRUITING |
| NCT02069756 | The Duchenne Registry | (none) | RECRUITING |
| NCT07890883 | Bone Health in Adults With Duchenne Muscular Dystrophy: A Survey on Osteoporosis, Fractures and Treatment. | (none) | RECRUITING |
| NCT06756633 | Respiratory Functions, Thoracoabdominal Movements and Exercise Capacity in Neuromuscular Diseases | (none) | RECRUITING |

Titles are verbatim from ClinicalTrials.gov, including "Less Then". "(none)" means the record has no phase field.

## (c) Disease lookup for each expected diagnosis (CONTRACT §9)

**Calls:** `@biomcp/get` with `entity: "disease"` and `id` set to each OMIM id, run once as Markdown and once with `json: true`. Only the JSON output contains `xrefs`.

| Demo case | Input | Returned name | MONDO id | OMIM xref | Orphanet xref |
|---|---|---|---|---|---|
| `demo-dmd` | OMIM:310200 | Duchenne muscular dystrophy | MONDO:0010679 | 310200 | 98896 |
| `demo-marfan` | OMIM:154700 | Marfan syndrome | MONDO:0007947 | 154700 | 558 |
| `demo-kabuki` | OMIM:147920 | Kabuki syndrome 1 | MONDO:0007843 | 147920 | none returned |
| `demo-cdls` | OMIM:122470 | Cornelia de Lange syndrome 1 | MONDO:0007387 | 122470 | none returned (other xrefs: SNOMED 40354009, DOID:0080505, UMLS C4551851) |

All four returned names match the `expectedDiagnosis` labels in CONTRACT §9.

## What this means for the demo

- **Duchenne does not rank in the top 5 for `demo-dmd`.** With the contract's own Monarch call (all 12 observed terms, Human Diseases), Duchenne muscular dystrophy is rank 40 of 50 and Becker muscular dystrophy is rank 15. With `limit 5` as in the demo cache (§9), neither would appear. The top 5 are other myopathies and muscular dystrophies.
- **biomcp agrees in direction.** Through biomcp (10-term cap), Duchenne is rank 32 with the first 10 terms and absent from the top 50 with the last 10. biomcp marks the CK, AST, ALT, LDH and fatigue terms as `not_supported` for Duchenne.
- **The id cross-check passes.** The other three expected diagnoses resolve in biomcp to the same names as CONTRACT §9.
- **Kabuki and CdLS have no Orphanet id here.** biomcp returned no Orphanet xref for Kabuki syndrome 1 or Cornelia de Lange syndrome 1. If the engine prefers `ORPHA:` ids (CONTRACT §5 `DiseaseId`), those two will probably fall back to OMIM ids. This was not checked against Orphadata directly.
- **The trial list is usable as a fixture.** It is a live snapshot of 5 of 64 recruiting studies at the time above.
- **Not run here:** phenotype search for `demo-marfan`, `demo-kabuki` and `demo-cdls`.
