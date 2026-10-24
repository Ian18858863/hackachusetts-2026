# Tasks: Rare Disease Case Intelligence (T38)

Ticked only when done and checked. Branch `peter/t38-case-intelligence`, local commits only.

- [x] 1. Project structure and specs (R1–R6)
- [x] 2. Source verification: Europe PMC metadata and quote checks; held-out cases from T33 re-verified; 7 development cases (R1, R4.1)
- [x] 3. HPO validation: JAX records for every id; id and name checks (R2)
- [x] 4. Dictionary: verified and rejected lay mappings from development cases; T37 import tooling (R3)
  - [ ] 4.1 Import the T37 CSV as unverified candidates (blocked: file not found in Downloads) (R3.5)
- [x] 5. Dataset validation: integrity and leakage checks with tests (R4, R5)
- [x] 6. Offline evaluation: blind inputs, baseline extractor, metrics, one frozen held-out run (R6)
  - [ ] 6.1 Score a real ranker (Top-1/Top-5); not run in T38 (R6.2)
- [x] 7. Documentation, results and review materials
