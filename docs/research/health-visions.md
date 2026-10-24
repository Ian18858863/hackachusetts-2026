# Healthcare & Biotech track: fact check of three "big vision" pitches

Research date: 2026-10-24 (hackathon day). Written for the team pitch, so it is in English.

**How to read this file**
- Every claim below has a URL that was opened during this research (by WebFetch, curl, or the Europe PMC / Crossref / GitHub APIs). Where only the abstract was read, it says "abstract".
- **UNVERIFIED** means the page could not be opened (bot check, 403, or 404) or the figure was only found second-hand. Do not put UNVERIFIED numbers on a slide.
- "Live test 2026-10-24" means the API call was actually run today and returned data.
- Text is paraphrased. Direct quotes are under 15 words.

---

## 0. Bottom line (ranking for a 3-minute demo video)

| Rank | Vision | Eye-catching | Credibility | Saturation | One-line reason |
|---|---|---|---|---|---|
| **1** | **A. Rare disease detective** | High | High | Medium | Strong human story, peer-reviewed numbers, and a Nature 2026 paper. Free no-key APIs (HPO, Monarch, Orphadata) support a real, live demo. The gap is a hybrid tool (ontology + LLM) that produces a specialist-ready brief. |
| 2 | B. Digital-twin trials | Low–medium | High | Medium | The regulatory evidence is the best of the three (EMA 2022, FDA 2023 guidance). But the honest gain is about 10–35% fewer patients, not "far fewer". There is no same-day public patient-level data, and a statistics demo is hard to make eye-catching. Unlearn already owns the story. |
| 3 | C. Wearable health twin | High | Medium | **Very high** | The science is real (median 3 days early for COVID in a prospective study), but Oura, Apple, WHOOP and Google already ship this feature, and the finals are at WHOOP. Illness-prediction claims also pull the product toward FDA device rules (see the WHOOP warning letter, 2025). |

**Wording fix for A.** "Years to minutes" implies the tool diagnoses. It does not, and the evidence does not support that claim. Use: *"Turn years of scattered notes into a specialist-ready brief in minutes."* The 4.7-year figure is the mean; the median is 0.8 years.

---

## Vision A — Rare disease detective

### A1. Burden numbers

| Figure | Value | Year of data | Source (opened) |
|---|---|---|---|
| People with a rare disease, worldwide | **263–446 million** (3.5–5.9% of the population) | Orphanet database, analysed in a paper published online 2019 (issue Feb 2020) | Nguengang Wakap et al., *Eur J Hum Genet* 2020;28:165–173 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6974615/ |
| People with a rare disease, US | **~30 million** (about 1 in 10 Americans) | 2018 paper by NCATS leadership | Kaufmann, Pariser, Austin, *Orphanet J Rare Dis* 2018 — https://pmc.ncbi.nlm.nih.gov/articles/PMC6219030/ |
| US, claims-based lower bound | **15.5 million** people with any of 379 rare diseases; total economic burden **$997 billion** | 2019 | Yang et al., *Orphanet J Rare Dis* 2022 (abstract via Europe PMC; PMC page showed a captcha) — https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=PMCID:PMC9004040&resultType=core&format=json |
| NCATS "25–30 million Americans" | 25–30 million | 2021 | **UNVERIFIED** (NCATS site returned 403/404): https://ncats.nih.gov/news-events/news/nih-study-suggests-people-with-rare-diseases-face-significantly-higher-health-care-costs |
| Number of known rare diseases | **>10,000** (10,393 Mondo leaf terms; 6,370 of them appear in 3 or more resources) | 2020 | Haendel et al., "How many rare diseases are there?", *Nat Rev Drug Discov* 2020 — https://pmc.ncbi.nlm.nih.gov/articles/PMC7771654/ |
| Same, NIH wording | "more than an estimated 10,000" | Page undated; links a GARD disease list dated Sep 2026 | NIH GARD — https://rarediseases.info.nih.gov/about |
| Orphanet disease count | 6,172 unique rare diseases | 2019/2020 paper | Nguengang Wakap 2020 (link above). A newer Orphanet count (~6,500 disorders, 2025) was found only in search snippets — **UNVERIFIED** |
| Share that are genetic | **71.9%** (4,440 of 6,172) | 2019/2020 | Nguengang Wakap 2020 |
| Share genetic, advocacy wording | "8 in 10" | Page undated; no source tied to the figure | Global Genes — https://globalgenes.org/learn/rare-disease-facts/ |
| Exclusively paediatric onset | **69.9%** of diseases with a known onset age | 2019/2020 | Nguengang Wakap 2020 |
| **Average time to diagnosis** | **4.7 years** mean (median 0.8 years); 56% diagnosed more than 6 months after first medical contact | Survey run Mar–Jun 2022; paper 2024 | Faye et al., *Eur J Hum Genet* 2024;32:1116–1126; 6,507 respondents, 41 European countries — https://pmc.ncbi.nlm.nih.gov/articles/PMC11369105/ |
| **Number of clinicians seen** | **22%** consulted 8 or more healthcare professionals (paper). EURORDIS press release: 25% saw 8 or more | 2022 survey | Faye 2024 (above); EURORDIS press release, 16 May 2024 — https://www.eurordis.org/survey-reveals-lengthy-diagnostic-delays |
| Misdiagnosis | **73%** misdiagnosed at least once | 2022 survey | Faye 2024 |
| Subgroups (press release) | Women 5.4 years vs men 3.7; onset at age 10–20: 10.4 years; referral to a Centre of Expertise: 4.3 vs 5.4 years | 2022 survey | EURORDIS (above) |
| Advocacy figure | "6+ years" average to an accurate diagnosis | Page undated | Global Genes (above). The page lists references but does not tie this figure to any of them |
| Cost of a delayed diagnosis | up to $517,000 per patient | 2021 EveryLife report, as cited by Global Genes | Global Genes (above). The original report was not opened (secondary) |
| Shire 2013: 7.6 years (US) / 5.6 years (UK), ~8 physicians | — | 2013 | **UNVERIFIED.** The report PDF would not render. The Takeda release page opened but does not contain these figures: https://www.takeda.com/newsroom/shire-news-releases/2013/rare-disease-index-report/ |
| "95% have no FDA-approved treatment" | — | — | Global Genes page only (no source given). NCATS "about 10%" is **UNVERIFIED** |

**Best one-liners for the pitch (all verified):**
- 263–446 million people worldwide; about 30 million Americans.
- More than 10,000 rare diseases; about 72% are genetic; about 70% start in childhood.
- Average 4.7 years to diagnosis; 1 in 5 patients sees 8 or more clinicians; 73% are misdiagnosed at least once (Europe, 2022 survey of 6,507 patients).

### A2. Evidence that phenotype-driven and AI tools help (best papers)

| # | Paper | Venue, year | Key result | Why it matters for the pitch |
|---|---|---|---|---|
| 1 | Köhler et al., *Clinical diagnostics in human genetics with semantic similarity searches in ontologies* (Phenomizer) | *Am J Hum Genet*, 2009 | Semantic similarity over HPO beat plain term matching, especially with noisy or imprecise descriptions. The ontology can also suggest which **extra features would best separate** the candidate diagnoses. | The theory behind phenotype matching, and the basis for a "what to check next" feature. https://pmc.ncbi.nlm.nih.gov/articles/PMC2756558/ (abstract via Europe PMC) |
| 2 | Gurovich et al., *Identifying facial phenotypes of genetic disorders using deep learning* (DeepGestalt / Face2Gene) | *Nature Medicine*, Jan 2019 | **91% top-10 accuracy** on 502 images. Trained on more than 17,000 images of more than 200 syndromes. Beat clinicians in three experiments. | Shows AI pattern recognition works for rare genetic syndromes. https://www.nature.com/articles/s41591-018-0279-0 |
| 3 | Smedley et al., *100,000 Genomes Pilot on Rare-Disease Diagnosis* | *NEJM*, Nov 2021 | 4,660 participants. Phenotypes coded in HPO plus automated prioritisation gave a genetic diagnosis in **25% of probands** (35% for likely monogenic disorders). Genomics England's own validation of Exomiser: diagnostic variant ranked **#1 in 71% and top-5 in 92%** of 62 solved cases. | HPO-coded phenotypes are national-scale infrastructure, not a toy. https://pmc.ncbi.nlm.nih.gov/articles/PMC7613219/ (abstract via Europe PMC); https://re-docs.genomicsengland.co.uk/exomiser/ |
| 4 | Reese et al., *Systematic benchmarking demonstrates LLMs have not reached the diagnostic accuracy of traditional rare-disease decision support tools* | *Eur J Hum Genet*, Apr 2026 | 5,213 published cases (phenopackets), 7 LLMs. Best LLM (o1-preview) ranked the right diagnosis first in **23.6%** of cases vs **35.5% for Exomiser**. Top-10: 36.8% vs 58.5% (medRxiv v3 numbers). | An honest limit: **an LLM on its own is not enough.** This argues for a hybrid design. https://www.nature.com/articles/s41431-026-02054-5 ; preprint https://pmc.ncbi.nlm.nih.gov/articles/PMC11302616/ |
| 5 | Zhao et al., *An agentic system for rare disease diagnosis with traceable reasoning* (DeepRare) | *Nature*, Feb/Mar 2026 | An LLM agent using more than 40 tools. Average **Recall@1 57.18%** on HPO-based tasks, 23.79 points above the next-best method. **69.1% vs Exomiser 55.9%** on 168 cases with genetic data. Experts agreed with **95.4%** of its reasoning chains. 9 datasets, 2,919 diseases. | State of the art: LLM plus ontology tools plus traceable evidence works. https://www.nature.com/articles/s41586-025-10097-9 ; code https://github.com/magic-ai4med/DeepRare |

Supporting studies:
- **Undiagnosed Diseases Network, 424 real patients** (*Stud Health Technol Inform* 2025, PMID 40776018). GPT-4o differential accuracy **22.4%** vs Exomiser 13.9%. **GPT-4o plus Exomiser together reached 30%**, better than either alone. Abstract: https://pmc.ncbi.nlm.nih.gov/articles/PMC13075642/ (opened via Europe PMC API: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%2210.3233/SHTI251000%22&resultType=core&format=json)
- **Ada DX retrospective study** (Ronicke et al., *Orphanet J Rare Dis* 2019). The correct disease was in Ada's top 5 **before** the clinical diagnosis in 53.8% of 93 cases, with a median of 3 months earlier. Limits: retrospective, unblinded, one person entering data. Abstract via Europe PMC: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%2210.1186/s13023-019-1040-6%22&resultType=core&format=json (DOI 10.1186/s13023-019-1040-6)
- **Phen2Gene** (*NAR Genom Bioinform* 2020): ranks genes from HPO terms; MIT license; has a REST API. https://pmc.ncbi.nlm.nih.gov/articles/PMC7252576/ (abstract)
- **HPO 2024 update** (*Nucleic Acids Res* 2024): 2,239 new terms and 49,235 new annotations since the previous report; translations into 10 languages. https://pmc.ncbi.nlm.nih.gov/articles/PMC10767975/ (abstract)

**Design argument from the evidence:** LLM alone < ontology tool (Reese 2026); LLM + ontology > either alone (UDN 2025, DeepRare 2026). So the demo should run HPO semantic matching (Monarch / PubCaseFinder) for the ranking, use the LLM to extract HPO terms from plain language and to explain the ranking, and show the evidence for every suggestion.

### A3. Open data and APIs (licenses checked; live-tested 2026-10-24)

| Resource | No-key access? | Live test 2026-10-24 | License / terms (opened) |
|---|---|---|---|
| **HPO ontology API** (JAX) | **Yes** | `https://ontology.jax.org/api/hp/terms/HP:0001250`, `/api/hp/search?q=seizure`, `/api/network/annotation/HP:0001166` → HTTP 200 JSON. The last one lists diseases (ORPHA/OMIM) annotated with a phenotype | **Free to use, under 3 conditions:** (1) acknowledge and cite the HPO; (2) show the version/date of any HPO file displayed publicly; (3) do not alter the HPO content. HPO also asks for a statement that the product uses the HPO, plus the HPO logo. The site's own text is for research and education, not medical advice. Source: https://hpo.jax.org/license (a JavaScript-rendered page; the text was read from the site's own script bundle at https://hpo.jax.org/chunk-BTDEGCNK.js). The OBO Foundry entry points to the same license: https://obofoundry.org/ontology/hp.html |
| **HPO annotations** (`phenotype.hpoa`, disease → phenotype with frequencies) | **Yes** | `https://github.com/obophenotype/human-phenotype-ontology/releases/latest/download/phenotype.hpoa` → 200, 35.8 MB | Same HPO license |
| **Monarch Initiative API v3** | **Yes** | `https://api.monarchinitiative.org/v3/api/search?q=marfan` → 200. **Ranked phenotype → disease matching:** `https://api.monarchinitiative.org/v3/api/semsim/search/HP:0001166,HP:0000098,HP:0001083/Human%20Diseases?limit=3` → 200; top hits were MASS syndrome and others | Web app code is BSD-3. Data licenses follow each original source. Monarch says its tools must **not be used for diagnosis or medical decisions**. Source: https://raw.githubusercontent.com/monarch-initiative/monarch-app/main/frontend/src/pages/knowledgeGraph/PageTerms.vue . Knowledge graph downloads (latest 2026-10-07): https://data.monarchinitiative.org/monarch-kg/latest/ |
| **Orphadata / Orphanet** | **Worked without a key today**, even though the site says to "request access" to the APIs | `https://api.orphadata.com/rd-cross-referencing/orphacodes/558?lang=en` → 200. The response carries a `CC-BY-4.0` license block; record date 2026-06-23 | **CC BY 4.0** for Orphanet scientific knowledge and ORPHAcodes; "conditions may apply" to Orphadata products. https://www.orphadata.com/ . Keep a downloaded copy as backup in case the API starts requiring keys |
| **OMIM** | **No.** An API key is required, must be renewed yearly, and goes with every request. A no-key call returned HTTP 400 | — | Free registration for single-user academic, non-profit and government use (JHU replies in about 2 business days). **No commercial use, no derived database, no redistribution** without a JHU license. Downloaded data must be refreshed weekly. The live site showed a bot check, so this was read from the Wayback copies of https://www.omim.org/api (snapshot 2025-12-18) and https://www.omim.org/downloads (2025-12-29). **Recommendation: leave OMIM out of the demo.** HPO annotations already carry OMIM disease IDs and names |
| **PubCaseFinder** (DBCLS, Japan) | **Yes** | `https://pubcasefinder.dbcls.jp/api/pcf_get_ranked_list?target=omim&format=json&hpo_id=...` → 200, ranked diseases | The site footer says CC BY 4.0: https://pubcasefinder.dbcls.jp/api . Terms specific to the API are **UNVERIFIED** |
| **phenopacket-store** (test patients for the demo) | Yes (GitHub) | Release 0.1.27 (2026-06-09), `all_phenopackets.zip` | BSD-3-Clause. https://github.com/monarch-initiative/phenopacket-store |
| **ClinicalTrials.gov API v2** (to link matching trials) | **Yes** | See B2 | US government work, so not under US copyright: https://www.nlm.nih.gov/web_policies.html |

### A4. Saturation: who already does this

| Product / project | Audience | What it does | Status / evidence (opened) |
|---|---|---|---|
| **DxGPT / Dx29** (Foundation29, Spain) | **Patients and caregivers, plus clinicians** | Free. Plain-language symptoms → differential diagnoses → suggested tests. Also builds a chronological medical history from uploaded records and links to trials and patient groups. Its earlier version used HPO, Monarch, Mondo and Orphanet | Global Rare Disease Commission case study (2024): more than 62,000 new users in a year and more than 450 daily users; accuracy similar to pediatric hospital staff in a July 2024 evaluation. https://globalrarediseasecommission.com/wp-content/uploads/2024/10/Case-study-DxGPT.pdf . dxgpt.app itself was **UNVERIFIED** (Cloudflare 403). The Microsoft partnership and "~60% accuracy" were found only second-hand (**UNVERIFIED**) |
| **Face2Gene** (FDNA) | Clinicians (sign-up is free and open) | Suite of facial phenotyping apps | https://www.face2gene.com/ |
| **Ada DX** | Clinicians (prototype) | Probabilistic decision support | 2019 study above. Ada's current product line was not checked |
| **Mendelian** (UK) | Primary care / NHS | Scans EHRs to find rare-disease cases; trial recruitment | https://www.mendelian.co/ . The MHRA Class I status and "10 million records" figures are **UNVERIFIED** (parliament page 403) |
| **DeepRare** | Research / clinicians | Agentic LLM diagnosis | *Nature* 2026; GitHub ~300 stars, license NOASSERTION — https://github.com/magic-ai4med/DeepRare |
| Open-source tools | Clinicians / bioinformaticians | Exomiser (AGPL-3.0, ~267 stars), Phen2Gene (MIT), RareBench (KDD 2024, Apache-2.0), PhEval (Apache-2.0) | GitHub API, 2026-10-24: https://github.com/exomiser/Exomiser , https://github.com/WGLab/Phen2Gene , https://github.com/chenxz1111/RareBench , https://github.com/monarch-initiative/pheval |
| Prior hackathon project | **Clinicians** | **RareSense**, winner of the Harvard Rare Disease Hackathon 2025: a Streamlit app that matches HPO phenotypes to rank diagnoses | https://malavgajera.is-a.dev/projects/rare-disease-hackathon |
| GitHub crowding | — | A search for "rare disease diagnosis llm" found only 11 repos, the top one with 5 stars | GitHub search API, 2026-10-24 |

**The gap for a patient/family "prepare for the specialist" tool.** DxGPT already covers "symptoms in plain words → list of diseases", so do not pitch that as new. What is still open and defensible:
1. **Traceable hybrid ranking.** Each suggested condition shows which of the patient's HPO terms matched, how often they occur in the disease (HPO annotation frequency), and links to Orphanet. The ranking comes from the ontology; the LLM only translates and explains. Evidence: Reese 2026, UDN 2025, DeepRare 2026.
2. **"What to check next."** The features that would best separate the top candidates (Phenomizer idea, Köhler 2009), turned into plain-language questions and observations for the family to bring to the appointment.
3. **A specialist-ready output.** A one-page brief (timeline, HPO-coded features, candidates with evidence, questions) plus a **GA4GH phenopacket export**, so a genetics clinic can run Exomiser on it directly. No product above advertises this export for families.
4. **US navigation.** Matching recruiting trials from the ClinicalTrials.gov API, plus GARD and patient-organisation links. (Specific UDN application steps were not checked.)
5. **Safety framing.** "Decision support for a conversation with a doctor, not a diagnosis." This matches the Monarch and HPO terms and avoids FDA device claims.

---

## Vision B — Digital-twin clinical trials

### B1. Evidence for prognostic covariate adjustment (PROCOVA) and "digital twins"

| Evidence | Year | Key content | Source (opened) |
|---|---|---|---|
| **Theory: Schuler et al.**, *Increasing the efficiency of randomized trial estimates via linear adjustment for a prognostic score* | *Int J Biostat*, online Dec 2021 (2022 issue) | Train a model on historical data; adjust the trial analysis for each patient's predicted outcome. Type-I error stays controlled, and the method is proved efficient. **Sample size reductions of 10–30%** with realistic prognostic models | Abstract via Europe PMC: https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=DOI:%2210.1515/ijb-2021-0072%22&resultType=core&format=json (DOI 10.1515/ijb-2021-0072) |
| **EMA CHMP qualification opinion for PROCOVA** | Adopted **15 Sep 2022**; document dated 20 Sep 2022 | Qualified as an acceptable **primary analysis** for Phase 2/3 RCTs with **continuous outcomes** (a special case of ANCOVA). It may be used to reduce sample size if the uncertainty in the assumptions is accounted for. EMA did not endorse it as the only method. Applicant's Alzheimer's example: a random-forest prognostic score cut the total required subjects by **10%** (and **15%** in a second analysis). Rule of thumb: a prognostic score with correlation 0.5 cuts variance by 25%; 0.8 cuts it by about 64% | https://www.ema.europa.eu/en/documents/regulatory-procedural-guideline/qualification-opinion-prognostic-covariate-adjustment-procovatm_en.pdf |
| **FDA final guidance: Adjusting for Covariates in Randomized Clinical Trials** | **May 2023** (final) | Adjusting for prognostic baseline covariates generally narrows confidence intervals and increases power. Prior studies may be used to build prognostic indices. **But the guidance explicitly does not cover machine-learning methods for covariate adjustment** | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/adjusting-covariates-randomized-clinical-trials-drugs-and-biological-products ; PDF https://www.fda.gov/media/148910/download |
| **FDA CDER letter to Unlearn** (reported by Unlearn) | Blog dated 2 Jan 2024 | FDA did not accept the ISTAND letter of intent because PROCOVA is already covered by the guidance above. CDER agreed with EMA that it is a form of ANCOVA. FDA warned that power calculations may be optimistic if external data differ from the trial | https://www.unlearn.ai/blog/us-fda-comments-on-unlearns-procova-methodology (company source) |
| FDA draft guidance on AI to support regulatory decisions | **Jan 2025, still draft** | A risk-based framework for judging whether an AI model is credible for a given use. The page does not mention digital twins | https://www.fda.gov/regulatory-information/search-fda-guidance-documents/considerations-use-artificial-intelligence-support-regulatory-decision-making-drug-and-biological . A law-firm write-up of FDA feedback on a digital-twin phase 2/3 plan is **UNVERIFIED** (403) |
| Unlearn simulation of TRAILBLAZER-ALZ 2 (Kusiak et al.) | *Alzheimer's & Dementia* 2025 (conference abstract; **all authors from Unlearn**) | Up to **24% fewer control-arm** participants; up to 15% more power for secondary endpoints | https://pmc.ncbi.nlm.nih.gov/articles/PMC12740155/ |
| Trade-press claim | 29 Sep 2022 | Control arms "up to 35%" smaller (the publication's own narrative) | https://www.clinicaltrialsarena.com/news/ema-qualifies-unlearn-approach/ |

**Honest summary for the pitch:** the realistic gain is **10–35% fewer patients, mostly in the control arm**, for continuous endpoints. That is valuable but not "far fewer patients". Say "smaller, faster control arms".

**Trial cost, duration and recruitment**

| Figure | Source (opened) |
|---|---|
| **$2.558 billion** capitalized pre-approval R&D cost per approved new drug (2013 dollars); $1.395 billion out-of-pocket; $2.870 billion including post-approval R&D. Tufts CSDD survey of 106 drugs from 10 firms | DiMasi, Grabowski, Hansen, *J Health Econ* 2016 (abstract): https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=TITLE:%22Innovation%20in%20the%20pharmaceutical%20industry:%20New%20estimates%20of%20R%26D%20costs%22&resultType=core&format=json (DOI 10.1016/j.jhealeco.2016.01.012) |
| **Tufts CSDD enrollment study** (151 Phase II/III trials, ~16,000 sites, 2008–2010): 11% of activated sites enrolled no patients; 41% of activated sites missed their target; **only 47% of studies finished enrollment on schedule**; **1 in 6 took more than twice as long** as planned | Ken Getz (Tufts CSDD), *Applied Clinical Trials*, 1 May 2012: https://www.appliedclinicaltrialsonline.com/view/enrollment-performance-weighing-facts |
| **19%** of 2,579 phase 2/3 trials closed in 2011 were terminated for failed accrual or ended below 85% of target; 48,027 patients were in those trials | Carlisle et al., *Clinical Trials* 2015: https://pmc.ncbi.nlm.nih.gov/articles/PMC4516407/ (abstract via Europe PMC) |
| **Own count from ClinicalTrials.gov API, 2026-10-24:** 30,012 terminated interventional studies; **9,220 (~31%)** give a "why stopped" reason containing accrual / enrollment / enrolment / recruitment / recruit. This is a crude keyword match, not peer-reviewed; label it that way on any slide | Query: `https://clinicaltrials.gov/api/v2/studies?filter.overallStatus=TERMINATED&query.term=AREA[StudyType]INTERVENTIONAL AND (AREA[WhyStopped]accrual OR AREA[WhyStopped]enrollment OR AREA[WhyStopped]enrolment OR AREA[WhyStopped]recruitment OR AREA[WhyStopped]recruit)&countTotal=true` |
| Fierce Biotech version of Tufts (11% / 37% / 39% / 13%) | **UNVERIFIED** (403) |
| "80% of trials fail to meet enrollment timelines" | **UNVERIFIED.** No primary source found. Use the Tufts figure (47% on time) instead |

### B2. Public data for a demo

| Data | Access | Fit for B |
|---|---|---|
| **ClinicalTrials.gov API v2** | **No key.** Live test 2026-10-24: `https://clinicaltrials.gov/api/v2/version` → apiVersion 2.0.5, data as of 2026-10-23. Returns study design, enrollment, `whyStopped`, and so on. Public domain (https://www.nlm.nih.gov/web_policies.html) | Good for trial design and feasibility. **No patient-level outcomes** |
| **Synthea** | Apache-2.0, ~3,400 stars, active (pushed 2026-10-21): https://github.com/synthetichealth/synthea . The sample CSV zip downloads | Synthetic patient records. Fine for the UI, but **no trial outcomes**, so it cannot honestly validate a digital twin |
| **PRO-ACT** (ALS) | 13,717 anonymised patients from 44 Phase II/III trials; **registration required** (approval time **UNVERIFIED**) | The real patient-level control-arm data Unlearn-style work uses. Risky to rely on the same day: https://ncri1.partners.org/ProACT |
| **postcard** R package (Novo Nordisk) | MIT, v1.1.0, 2025-09-17, on CRAN | Implements prognostic covariate adjustment and prospective power calculation, so it can do the maths: https://cran.r-project.org/web/packages/postcard/index.html |

### B3. Saturation

| Player | What | Source (opened) |
|---|---|---|
| **Unlearn** | Digital twins / PROCOVA, the only EMA-qualified method of this kind. Its homepage says it won Fierce's 2026 AI Innovation Award for trial design | https://www.unlearn.ai/ |
| **Medidata** (Dassault) | Synthetic Control Arm® (external control arm) | https://www.medidata.com/en/study-experience/real-world-data/synthetic-control-arm/ |
| **QuantHealth** | AI simulation of drug–patient outcomes; quote from a Sanofi executive on its site | https://quanthealth.ai/ |
| **Phesi** | Trial simulation and "digital twins"; claims real-world data on 325 million patients | https://www.phesi.com/ |
| Open source | `postcard` (Novo Nordisk) | CRAN link above |
| Merck KGaA × Unlearn collaboration | — | **UNVERIFIED** (VentureBeat bot check) |

The gap a student team could own is narrow. One option is a "trial feasibility copilot" on ClinicalTrials.gov: it flags trials at risk of low accrual from eligibility complexity and history (Carlisle found that more eligibility criteria are linked to failed accrual). This is a different pitch from "digital twins".

---

## Vision C — Health digital twin from wearables

### C1. Evidence that wearables detect illness before symptoms

| Study | Venue, year | Key numbers | Source (opened) |
|---|---|---|---|
| **Mishra et al.** (Stanford, Snyder lab), *Pre-symptomatic detection of COVID-19 from smartwatch data* | *Nature Biomedical Engineering*, Dec 2020 | Cohort of about 5,300; 32 infected; 26 (81%) showed changes in heart rate, steps or sleep. Of 25 with symptom dates, 22 were flagged **before or at symptom onset**, and 4 at least **9 days early**. A real-time resting-heart-rate algorithm would have caught **63%** before symptoms | https://www.nature.com/articles/s41551-020-00640-6 |
| **Alavi et al.** (Stanford), prospective real-time alerting | *Nature Medicine*, Jan 2022 | 3,318 participants, 84 infected; alerts in **67 (80%)**; **median 3 days before symptoms**. Stress, alcohol and travel also triggered alerts (1.15 vs 3.42 alert-days per person) | https://www.nature.com/articles/s41591-021-01593-2 |
| **Quer et al.** (Scripps DETECT) | *Nature Medicine*, Jan 2021 | 30,529 enrolled. Among people with symptoms (54 positive, 279 negative), symptoms + sensor data gave **AUC 0.80** vs 0.71 for symptoms alone. Not a pre-symptomatic test | https://www.nature.com/articles/s41591-020-1123-x |
| **Natarajan et al.** (Fitbit) | *npj Digital Medicine*, 2020 | 2,745 COVID-positive users; physiological signals predicted illness on a given day with **AUC 0.77** | https://www.nature.com/articles/s41746-020-00363-7 |
| **Miller et al.** (WHOOP, respiratory rate) | *PLOS ONE*, Dec 2020 | 271 people (81 positive). Night-time respiratory rate flagged **20% in the 2 days before symptoms** and **80% by day 3 of symptoms** | https://pmc.ncbi.nlm.nih.gov/articles/PMC7728254/ (abstract via Europe PMC) |
| **Mason et al.** (Oura, UCSF TemPredict) | *Scientific Reports*, 2022 | 63,153 participants; 73 used for training. Detection on average **2.75 days before testing**; sensitivity 82%, specificity 63%; AUC 0.819. Temperature helped | https://www.nature.com/articles/s41598-022-07314-0 |
| **Grzesiak et al.** (influenza / cold viral challenge) | *JAMA Network Open*, 2021 | Small (H1N1 n=31, rhinovirus n=18). Infection detected before symptoms with accuracy up to 92% / 88%; severity predicted **24 h before symptoms** with 90% / 89% accuracy | https://pmc.ncbi.nlm.nih.gov/articles/PMC8482058/ (abstract via Europe PMC) |
| **Perez et al., Apple Heart Study** | *NEJM*, Nov 2019 | 419,297 participants; 0.52% got an irregular-pulse alert; 34% of those had AF on a later ECG patch; PPV 0.84 for a simultaneous alert. (Screens for AF; not "illness before symptoms") | https://pmc.ncbi.nlm.nih.gov/articles/PMC8112605/ (abstract via Europe PMC) |

Caveats: almost all of this is COVID-era work with small numbers of infected people. Specificity is modest (63% in TemPredict), so false alarms are common. Life events trigger alerts too.

### C2. Chronic disease burden (US)

| Figure | Year of data | Source (opened) |
|---|---|---|
| **3 in 4 US adults** have at least one chronic condition; **more than half** have two or more. Chronic disease is a leading driver of the nation's **$5.3 trillion** annual health care costs | Page dated 14 May 2026 | CDC: https://www.cdc.gov/chronic-disease/about/index.html |
| Underlying study: **76.4% (194 million)** adults with ≥1 condition; **51.4% (130 million)** with two or more; young adults (18–34) rose from 52.5% to 59.5% between 2013 and 2023 | BRFSS 2023 | Watson et al., *Prev Chronic Dis* 2025;22:240539 — https://pmc.ncbi.nlm.nih.gov/articles/PMC12007472/ (abstract via Europe PMC) |

The older "6 in 10 adults" CDC line is outdated; use 3 in 4.

### C3. Saturation (very high)

| Company | Feature already shipping | Source (opened) |
|---|---|---|
| **Oura** | **Symptom Radar** (launched Dec 2024): flags "signs of strain" **up to 2 days** before a member logs an illness tag; developed with UCSF on 2 years of member data; needs a subscription | https://ouraring.com/blog/inside-the-ring-symptom-radar/ |
| **Oura** | **Oura Advisor**, an LLM chat over ring data, available to all members from 31 Mar 2025 | https://9to5google.com/2025/03/31/oura-ring-app-launches-advisor-ai/ |
| **Apple** | **Vitals app**: learns a personal range and notifies when at least 2 overnight metrics are out of range, with possible causes including illness. Series 12 / Ultra 4 add daytime vitals and HRV. Apple says the watch is not a medical device | https://support.apple.com/guide/watch/apd15aa7ed96/watchos |
| **Google / Fitbit** | **Gemini personal health coach**, public preview for US Fitbit Premium users (Android) from Oct 2025 | https://research.google/blog/how-we-are-building-the-personal-health-coach/ (27 Oct 2025) |
| **WHOOP** | WHOOP Coach powered by OpenAI (Sep 2023); Advanced Labs, combining blood tests with wearable data (Sep 2025); ECG and blood pressure on WHOOP MG (May 2025) | https://en.wikipedia.org/wiki/Whoop_(company) . The Health Monitor page and the Coach press release are **UNVERIFIED** (whoop.com and BusinessWire returned 403) |
| **FDA vs WHOOP** | **Warning letter, 14 Jul 2025**: FDA said Blood Pressure Insights is an uncleared medical device, not a general-wellness feature | https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/warning-letters/whoop-inc-709755-07142025 |

**What gap remains:** a narrow one. Options are a cross-device, vendor-neutral "explain my alert" layer with a summary for a clinician, or a caregiver view (for example, an elderly parent's ring). Anything that predicts a specific disease moves toward FDA device territory, as the WHOOP letter shows. With finals at WHOOP, judges will know their own product already ships most of Vision C.

---

## Suggested demo flow for A (fits a 3-minute video)

1. A parent types or pastes plain-language notes (for example "she can't climb stairs, falls a lot, big calves").
2. The LLM extracts HPO terms. Each term is shown with the sentence it came from, and the family confirms or removes it.
3. Live ranking via Monarch semsim or PubCaseFinder (no key), cross-checked against Orphanet. Each candidate shows the matched features and their frequency in that disease.
4. "What to check next": the features that best separate the top 3 candidates, written as questions.
5. Output: a one-page specialist brief (PDF) plus a phenopacket JSON, and recruiting trials from ClinicalTrials.gov.
6. Footer: HPO version and attribution (required by the HPO license); "decision support, not a diagnosis".
7. Demo patients: use phenopacket-store cases (BSD-3), never real patients.

---

## UNVERIFIED items (do not put on slides without re-checking)
- NCATS 2021 "25–30 million Americans" and "about 10% have an FDA-approved therapy" (NCATS site 403/404). Use the 2018 NCATS-authored paper's ~30 million instead.
- Shire 2013: 7.6 / 5.6 years and ~8 physicians.
- Newer Orphanet count (~6,500 disorders, 2025).
- dxgpt.app product page; Microsoft–DxGPT partnership and accuracy figures; the medRxiv DxGPT pediatric numbers (65% vs 60%) and the 2026 *Pediatric Investigation* version.
- Mendelian: MHRA Class I status and "10 million records".
- PubCaseFinder API-specific terms.
- Orphadata API: works without a key today, but the site says to request access. Could change.
- PRO-ACT approval time.
- Merck KGaA × Unlearn; the Hogan Lovells account of FDA digital-twin feedback.
- Fierce Biotech Tufts breakdown (11 / 37 / 39 / 13%); the "80% of trials miss enrollment timelines" claim.
- WHOOP Health Monitor page; WHOOP Coach press release (Wikipedia confirms the launch only).
