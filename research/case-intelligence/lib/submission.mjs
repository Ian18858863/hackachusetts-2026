// Submission checks for evaluation.
//
// Formal evaluation (the default) accepts a predictions file only if it is
// complete and its provenance matches the frozen inputs. Exploratory
// evaluation scores whatever is there but is labelled as such and never
// reported as an official Top-1 / Top-5 result.
import { sha256, blindInputs } from './eval-inputs.mjs';

const FULL_SHA = /^[0-9a-f]{40}$/;

/**
 * Structural completeness of a predictions object against the expected cases.
 * Returns { complete, issues: [{ code, caseId?, message }], hasRanking }.
 */
export function checkSubmission(predictions, cases) {
  const issues = [];
  const add = (code, message, caseId) => issues.push({ code, message, ...(caseId ? { caseId } : {}) });
  const expected = new Set(cases.map((c) => c.caseId));
  const list = predictions?.cases;
  if (!Array.isArray(list)) {
    add('NO_CASES', 'predictions.cases must be an array');
    return { complete: false, issues, hasRanking: false };
  }
  const seen = new Map();
  for (const p of list) {
    const id = p?.caseId;
    if (typeof id !== 'string' || !id) { add('MALFORMED_PREDICTION', 'a prediction has no caseId'); continue; }
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (!expected.has(id)) add('UNKNOWN_CASE_ID', `${id} is not a case of this split`, id);
    if (p.extracted !== undefined && (!Array.isArray(p.extracted) || p.extracted.some((x) => typeof x?.hpoId !== 'string'))) {
      add('MALFORMED_EXTRACTED', 'extracted must be an array of { hpoId }', id);
    }
    if (p.ranking !== undefined && (!Array.isArray(p.ranking) || p.ranking.some((d) => typeof d !== 'string'))) {
      add('MALFORMED_RANKING', 'ranking must be an array of disease id strings', id);
    }
  }
  for (const [id, n] of seen) if (n > 1) add('DUPLICATE_CASE_ID', `${id} appears ${n} times`, id);
  for (const id of expected) if (!seen.has(id)) add('MISSING_CASE', `no prediction for ${id}`, id);
  const withRanking = list.filter((p) => p?.ranking !== undefined).length;
  if (withRanking > 0 && withRanking < list.length) {
    add('PARTIAL_RANKING', `${withRanking} of ${list.length} predictions have a ranking; a formal ranking evaluation needs one for every case`);
  }
  return { complete: issues.length === 0, issues, hasRanking: withRanking > 0 && withRanking === list.length };
}

/**
 * Provenance of a predictions file for formal scoring.
 * deps: { inputsFile, cases, gitShow(sha, path) -> string|null, isAncestor(sha) -> boolean, inputsPath }
 * Checks: split matches; extractor named; gitSha is a full commit SHA that is
 * an ancestor of HEAD; inputsSha256 equals the committed inputs file, which
 * equals the current case notes; and the inputs file at gitSha has the same
 * hash (the extractor revision ran on exactly these frozen inputs).
 */
export function checkProvenance(predictions, split, deps) {
  const issues = [];
  const add = (code, message) => issues.push({ code, message });
  if (predictions?.split !== split) add('SPLIT_MISMATCH', `predictions.split is ${JSON.stringify(predictions?.split)}, expected "${split}"`);
  if (!predictions?.extractor) add('NO_EXTRACTOR', 'predictions.extractor is missing');
  const recomputed = sha256(blindInputs(deps.cases));
  if (deps.inputsFile?.sha256 !== recomputed) add('INPUTS_FILE_STALE', 'committed inputs file does not match the current case notes; run export-inputs');
  if (!predictions?.inputsSha256) add('NO_INPUTS_HASH', 'predictions.inputsSha256 is missing');
  else if (predictions.inputsSha256 !== recomputed) add('INPUTS_HASH_MISMATCH', 'predictions were made on different inputs than the frozen inputs');
  const sha = predictions?.gitSha;
  if (!sha) add('NO_GIT_SHA', 'predictions.gitSha is missing');
  else if (!FULL_SHA.test(sha)) add('GIT_SHA_FORMAT', `gitSha ${sha} is not a full 40-character SHA`);
  else if (!deps.isAncestor(sha)) add('GIT_SHA_UNKNOWN', `gitSha ${sha} is not a commit in the history of HEAD`);
  else {
    const atSha = deps.gitShow(sha, deps.inputsPath);
    if (atSha === null) add('INPUTS_NOT_AT_SHA', `${deps.inputsPath} did not exist at ${sha.slice(0, 7)}; the extractor revision cannot have used the frozen inputs`);
    else {
      let fileAtSha = null;
      try { fileAtSha = JSON.parse(atSha); } catch { /* reported below */ }
      if (fileAtSha?.sha256 !== recomputed) add('INPUTS_CHANGED_SINCE_SHA', `${deps.inputsPath} at ${sha.slice(0, 7)} has a different hash`);
    }
  }
  return { ok: issues.length === 0, issues };
}
