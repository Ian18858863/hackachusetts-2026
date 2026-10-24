# Tasks: Rare Disease Case Intelligence (T38)

Ticked only when done and checked. Branch `peter/t38-case-intelligence`, local commits only.

- [x] 1. Project structure and specs (R1–R6)
- [x] 2. Source verification: Europe PMC metadata and quote checks; held-out cases from T33 re-verified; 7 development cases (R1, R4.1)
  - [x] 2.1 Licence classification from PMC OAI-PMH; exceptions documented for HO-04, HO-09, HO-10 (R1.1, R1.1a)
  - [ ] 2.2 Peter confirms or rejects the three access exceptions
- [x] 3. HPO validation: JAX records for every id; id and name checks (R2)
- [x] 4. Dictionary: verified and rejected lay mappings from development cases; T37 import tooling (R3)
  - [x] 4.1 Importer accepts the real T37 header with BOM; integration tests (R3.5)
  - [ ] 4.2 Import the real T37 CSV as unverified candidates (blocked: file not found in Downloads)
- [x] 5. Dataset validation: integrity and leakage checks with tests (R4, R5)
- [x] 6. Offline evaluation: blind inputs, baseline extractor, metrics, one frozen held-out run (R6)
  - [x] 6.1 Formal vs exploratory scoring; completeness and provenance checks (R6.4a–c)
  - [ ] 6.2 Score a real ranker (Top-1/Top-5); not run in T38 (R6.2)
- [x] 7. Documentation, results and review materials
