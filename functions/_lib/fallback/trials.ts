// Fallback for searchTrials (docs/CONTRACT.md section 7.6), used only while
// the engine function is a placeholder (T18b).
// ClinicalTrials.gov API v2, recruiting studies only, at most 5, 6 s timeout.
// Shape checked on 2026-10-24: studies[].protocolSection.{identificationModule,
// statusModule, designModule.phases, conditionsModule, contactsLocationsModule}.

import type { Trial, TrialsResponse } from "../../../engine/index";
import { getJson } from "./http";
import type { FallbackDeps } from "./http";
import { broaderCondition, isRelevantStudy } from "./trialRelevance";

const CT_STUDIES = "https://clinicaltrials.gov/api/v2/studies";
const PAGE_SIZE = 5; // studies returned (contract section 7.6)
const FETCH_SIZE = 20; // studies fetched per call, so the relevance filter still leaves up to 5
const MIN_RELEVANT = 3; // below this, try one broader search
const NCT_RE = /^NCT\d{8}$/;

function strList(v: unknown): string[] {
  return Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === "string" && x.trim() !== "") : [];
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

function toTrial(study: unknown): Trial | null {
  const p = obj(obj(study).protocolSection);
  const nctId = obj(p.identificationModule).nctId;
  const title = obj(p.identificationModule).briefTitle;
  const status = obj(p.statusModule).overallStatus;
  if (typeof nctId !== "string" || !NCT_RE.test(nctId) || typeof title !== "string" || status !== "RECRUITING") {
    return null;
  }
  const countries: string[] = [];
  const locations = obj(p.contactsLocationsModule).locations;
  if (Array.isArray(locations)) {
    for (const loc of locations as unknown[]) {
      const c = obj(loc).country;
      if (typeof c === "string" && c !== "" && !countries.includes(c)) countries.push(c);
    }
  }
  return {
    nctId,
    title,
    status: "RECRUITING",
    // ClinicalTrials.gov uses "NA" for "not applicable"; the contract wants [] when none is listed.
    phases: strList(obj(p.designModule).phases).filter((ph) => ph !== "NA"),
    conditions: strList(obj(p.conditionsModule).conditions),
    countries,
    url: `https://clinicaltrials.gov/study/${nctId}`,
  };
}

interface SearchResult {
  relevant: Trial[];
  /** Upstream count minus the studies dropped as irrelevant on the fetched page (an estimate). */
  relevantTotal: number;
}

/** One ClinicalTrials.gov call, filtered to studies whose conditions match `diseaseName`. */
async function searchOnce(cond: string, diseaseName: string, deps: FallbackDeps): Promise<SearchResult> {
  const params = new URLSearchParams({
    "query.cond": cond,
    "filter.overallStatus": "RECRUITING",
    pageSize: String(FETCH_SIZE),
    countTotal: "true",
    fields: "NCTId,BriefTitle,OverallStatus,Phase,Condition,LocationCountry",
  });
  const body = obj(await getJson("clinicalTrials", `${CT_STUDIES}?${params.toString()}`, deps, { notFound: "error" }));
  const all = (Array.isArray(body.studies) ? (body.studies as unknown[]) : [])
    .map(toTrial)
    .filter((t): t is Trial => t !== null);
  const relevant = all.filter((t) => isRelevantStudy(diseaseName, t.conditions));
  const upstreamTotal =
    typeof body.totalCount === "number" && Number.isFinite(body.totalCount) ? body.totalCount : all.length;
  return { relevant, relevantTotal: Math.max(relevant.length, upstreamTotal - (all.length - relevant.length)) };
}

/**
 * At most 2 ClinicalTrials.gov calls (Workers free plan subrequest budget):
 *   1. the exact condition name, filtered by condition relevance;
 *   2. only if fewer than MIN_RELEVANT relevant studies remain, one broader
 *      search with the subtype suffix removed, same filter, merged after the
 *      exact-name results without duplicates.
 * Example (2026-10-24): "Niemann-Pick disease, type C1" returned only an
 * Alzheimer's study that matched the drug name NPC-1; it is filtered out and
 * "Niemann-Pick disease type C" supplies the relevant studies.
 * The contract has no per-study query field, so `query.condition` echoes the
 * broader search when it was used.
 */
export async function fallbackSearchTrials(
  req: { condition: string; ids: string[] },
  deps: FallbackDeps,
): Promise<TrialsResponse> {
  const now = deps.now ?? (() => new Date());
  const exact = await searchOnce(req.condition, req.condition, deps);
  let studies = exact.relevant.slice(0, PAGE_SIZE);
  let total = exact.relevantTotal;
  let usedCondition = req.condition;

  const broader = studies.length < MIN_RELEVANT ? broaderCondition(req.condition) : null;
  if (broader !== null) {
    const wide = await searchOnce(broader, req.condition, deps);
    const seen = new Set(studies.map((t) => t.nctId));
    const added = wide.relevant.filter((t) => !seen.has(t.nctId));
    if (added.length > 0) {
      studies = [...studies, ...added].slice(0, PAGE_SIZE);
      total = Math.max(studies.length, wide.relevantTotal, exact.relevantTotal);
      usedCondition = broader;
    }
  }

  const fetchedAt = now().toISOString();
  return {
    version: "0.1",
    source: "live",
    studies,
    query: { condition: usedCondition, ids: req.ids, status: "RECRUITING" },
    total,
    fetchedAt,
    dataVersions: { fetchedAt },
  };
}
