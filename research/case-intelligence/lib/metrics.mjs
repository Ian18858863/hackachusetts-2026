// Evaluation metrics computed only from a predictions object and the case
// records. No per-disease or per-case rules.
//
// predictions = { cases: [{ caseId, extracted?: [{hpoId}], ranking?: [diseaseId, ...] }] }
import { checkTerm } from './hpo-check.mjs';

const ratio = (a, b) => (b ? a / b : null);
const round = (x) => (x === null ? null : Math.round(x * 1000) / 1000);

/** All ids that count as a correct diagnosis: accepted MONDO ids plus their OMIM/Orphanet xrefs. */
export function acceptedDiseaseIds(c, diseases) {
  const ids = new Set(c.diagnosis.acceptedIds);
  for (const m of c.diagnosis.acceptedIds) {
    for (const x of diseases?.diseases?.[m]?.xrefs ?? []) {
      ids.add(x);
      if (x.startsWith('Orphanet:')) ids.add(x.replace('Orphanet:', 'ORPHA:'));
    }
  }
  return ids;
}

export function evaluate(predictions, cases, { hpo, diseases } = {}) {
  const byId = new Map((predictions?.cases ?? []).map((p) => [p.caseId, p]));
  const unknown = [...byId.keys()].filter((id) => !cases.some((c) => c.caseId === id));
  const perCase = [];
  let gold = 0, tp = 0, predicted = 0, notInGold = 0, articleOnly = 0, invalid = 0;
  let ranked = 0, top1 = 0, top5 = 0;
  const missingPredictions = [];

  for (const c of cases) {
    const p = byId.get(c.caseId);
    if (!p) missingPredictions.push(c.caseId);
    const goldNote = new Set(c.phenotypes.filter((x) => x.inNote).map((x) => x.hpoId));
    const goldArticle = new Set(c.phenotypes.map((x) => x.hpoId));
    const pred = new Set((p?.extracted ?? []).map((x) => x.hpoId));
    const hit = [...pred].filter((id) => goldNote.has(id));
    const missed = [...goldNote].filter((id) => !pred.has(id));
    const extra = [...pred].filter((id) => !goldNote.has(id));
    const extraArticle = extra.filter((id) => goldArticle.has(id));
    const extraNone = extra.filter((id) => !goldArticle.has(id));
    const invalidIds = hpo ? [...pred].filter((id) => checkTerm(id, undefined, hpo)) : [];

    gold += goldNote.size; tp += hit.length; predicted += pred.size;
    notInGold += extraNone.length; articleOnly += extraArticle.length; invalid += invalidIds.length;

    let rank = null;
    if (Array.isArray(p?.ranking)) {
      ranked += 1;
      const ok = acceptedDiseaseIds(c, diseases);
      const pos = p.ranking.findIndex((d) => ok.has(d));
      rank = pos >= 0 ? pos + 1 : null;
      if (rank === 1) top1 += 1;
      if (rank !== null && rank <= 5) top5 += 1;
    }
    perCase.push({
      caseId: c.caseId,
      goldInNote: goldNote.size,
      predicted: pred.size,
      hit: hit.length,
      coverage: round(ratio(hit.length, goldNote.size)),
      missed,
      predictedNotInGold: extraNone,
      predictedArticleOnly: extraArticle,
      invalidIds,
      correctDiagnosisRank: rank,
    });
  }

  return {
    n: cases.length,
    missingPredictions,
    unknownPredictionIds: unknown,
    extraction: {
      goldInNoteTerms: gold,
      predictedTerms: predicted,
      truePositives: tp,
      coverage: round(ratio(tp, gold)),
      missedPhenotypeRate: round(gold ? 1 - tp / gold : null),
      precision: round(ratio(tp, predicted)),
      macroCoverage: round(ratio(perCase.reduce((s, x) => s + (x.coverage ?? 0), 0), perCase.filter((x) => x.goldInNote).length)),
      predictedNotInGold: notInGold,
      predictedArticleOnly: articleOnly,
      invalidHpoIds: invalid,
    },
    ranking: {
      casesWithRanking: ranked,
      top1Accuracy: round(ratio(top1, ranked)),
      top5Recall: round(ratio(top5, ranked)),
      note: ranked ? null : 'No ranking in the predictions; Top-1 and Top-5 were not computed.',
    },
    perCase,
  };
}
