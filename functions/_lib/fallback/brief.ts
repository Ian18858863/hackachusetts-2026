// Fallback for buildBrief (docs/CONTRACT.md section 7.7), used only while the
// engine function is a placeholder (T18b). Pure: built from the case object
// only, no network.
//
// - Features: observed and excluded terms (removed dropped, first per id kept)
//   with their source quotes.
// - Candidates and questions: as last ranked by the app (top 5, max 8 questions).
// - specialists: always [] here. The organ-system -> specialty table
//   (engine/data/specialists.ts, open question 4) is not approved yet, and
//   without a mapping row a suggestion would not be grounded.
// - testsToAsk: only genes annotated to a top-3 candidate whose sources include
//   "hpo-annotations", with the contract's exact sentence.
// - Disclaimer and attributions verbatim from engine/text.ts (section 13).
// The notes text is not copied into the brief.

/** Contract 13 v0.1.7 (T36c): ranking credit when PubCaseFinder ordered the list. Keeps Monarch's caveat. */
export const PCF_RANKING_ATTRIBUTION =
  "Ranking: PubCaseFinder (DBCLS, CC BY 4.0) with evidence from the Monarch Initiative and HPO annotations. Monarch tools are not for diagnosis or medical decisions.";

import {
  DISCLAIMER,
  MONARCH_ATTRIBUTION,
  ORPHANET_ATTRIBUTION,
  PHENOPACKET_STORE_ATTRIBUTION,
  PUBCASEFINDER_ATTRIBUTION,
  demoLabel,
  hpoAttribution,
} from "../../../engine/index";
import type {
  Brief,
  BriefFeature,
  Candidate,
  CaseObject,
  DataVersions,
  DiseaseId,
  IsoDateTime,
  TestSuggestion,
} from "../../../engine/index";

const BRIEF_TITLE = "Specialist brief: features and possible matches to discuss";
const MAX_CANDIDATES = 5;
const MAX_QUESTIONS = 8;
const TOP_FOR_TESTS = 3;

/** The OMIM id behind a candidate's OMIM link, else its diseaseId. */
function geneSource(c: Candidate): DiseaseId {
  if (c.diseaseId.startsWith("OMIM:")) return c.diseaseId;
  const m = /omim\.org\/entry\/(\d+)$/.exec(c.links.omim ?? "");
  return m ? `OMIM:${m[1]}` : c.diseaseId;
}

function testsFor(candidates: readonly Candidate[]): TestSuggestion[] {
  const out: TestSuggestion[] = [];
  const seen = new Set<string>();
  for (const c of candidates.slice(0, TOP_FOR_TESTS)) {
    if (!c.sources.includes("hpo-annotations")) continue;
    for (const gene of c.genes) {
      const key = `${c.diseaseId}|${gene.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        text: `Ask whether genetic testing that includes ${gene.symbol} is appropriate (gene associated with ${c.name} in HPO annotations)`,
        gene: { id: gene.id, symbol: gene.symbol },
        diseaseId: c.diseaseId,
        source: geneSource(c),
      });
    }
  }
  return out;
}

function usesOrphanet(candidates: readonly Candidate[]): boolean {
  return candidates.some(
    (c) =>
      c.sources.includes("orphadata") ||
      c.matched.some((e) => e.frequency?.source.startsWith("ORPHA:")) ||
      c.notReported.some((f) => f.frequency.source.startsWith("ORPHA:")) ||
      c.contradicted.some((f) => f.frequency.source.startsWith("ORPHA:")),
  );
}

export function fallbackBuildBrief(
  c: CaseObject,
  opts: { generatedAt: IsoDateTime; dataVersions: DataVersions },
): Brief {
  const observed: BriefFeature[] = [];
  const excluded: BriefFeature[] = [];
  const seen = new Set<string>();
  for (const t of c.terms) {
    if (t.status === "removed" || seen.has(t.hpoId)) continue;
    seen.add(t.hpoId);
    const f: BriefFeature = { id: t.hpoId, label: t.label, provenance: t.provenance };
    if (t.quote) f.quote = t.quote;
    (t.status === "excluded" ? excluded : observed).push(f);
  }

  const candidates = (c.lastRanking?.response.candidates ?? []).slice(0, MAX_CANDIDATES);
  const hpoVersion = opts.dataVersions.hpo ?? "unknown";

  const attributions = [hpoAttribution(hpoVersion)];
  // Contract 13 v0.1.7 (T36c): credit whichever service ordered the list.
  const rankedByPcf =
    (c.lastRanking?.response.dataVersions as { rankingSource?: string } | undefined)?.rankingSource === "pubcasefinder" ||
    candidates.some((x) => x.sources.includes("pubcasefinder"));
  if (rankedByPcf) attributions.push(PCF_RANKING_ATTRIBUTION);
  else if (candidates.some((x) => x.sources.includes("monarch-semsim"))) attributions.push(MONARCH_ATTRIBUTION);
  if (usesOrphanet(candidates)) attributions.push(ORPHANET_ATTRIBUTION);
  if (!rankedByPcf && candidates.some((x) => x.sources.includes("pubcasefinder"))) attributions.push(PUBCASEFINDER_ATTRIBUTION);
  if (c.demo) attributions.push(PHENOPACKET_STORE_ATTRIBUTION);

  const patientSummary: Brief["patientSummary"] = { demo: c.demo !== null };
  if (c.demo) patientSummary.demoLabel = demoLabel(c.demo.sourcePhenopacketId);

  return {
    title: BRIEF_TITLE,
    generatedAt: opts.generatedAt,
    patientSummary,
    features: { observed, excluded },
    candidates,
    questions: c.questions.slice(0, MAX_QUESTIONS),
    specialists: [],
    testsToAsk: testsFor(candidates),
    disclaimer: DISCLAIMER,
    attributions,
    dataVersions: opts.dataVersions,
  };
}
