// Fallback for searchTrials (docs/CONTRACT.md section 7.6), used only while
// the engine function is a placeholder (T18b).
// ClinicalTrials.gov API v2, recruiting studies only, at most 5, 6 s timeout.
// Shape checked on 2026-10-24: studies[].protocolSection.{identificationModule,
// statusModule, designModule.phases, conditionsModule, contactsLocationsModule}.

import type { Trial, TrialsResponse } from "../../../engine/index";
import { getJson } from "./http";
import type { FallbackDeps } from "./http";

const CT_STUDIES = "https://clinicaltrials.gov/api/v2/studies";
const PAGE_SIZE = 5;
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

export async function fallbackSearchTrials(
  req: { condition: string; ids: string[] },
  deps: FallbackDeps,
): Promise<TrialsResponse> {
  const now = deps.now ?? (() => new Date());
  const params = new URLSearchParams({
    "query.cond": req.condition,
    "filter.overallStatus": "RECRUITING",
    pageSize: String(PAGE_SIZE),
    countTotal: "true",
    fields: "NCTId,BriefTitle,OverallStatus,Phase,Condition,LocationCountry",
  });
  const body = obj(await getJson("clinicalTrials", `${CT_STUDIES}?${params.toString()}`, deps, { notFound: "error" }));
  const fetchedAt = now().toISOString();
  const studies = (Array.isArray(body.studies) ? (body.studies as unknown[]) : [])
    .map(toTrial)
    .filter((t): t is Trial => t !== null)
    .slice(0, PAGE_SIZE);
  const total = typeof body.totalCount === "number" && Number.isFinite(body.totalCount) ? body.totalCount : studies.length;
  return {
    version: "0.1",
    source: "live",
    studies,
    query: { condition: req.condition, ids: req.ids, status: "RECRUITING" },
    total,
    fetchedAt,
    dataVersions: { fetchedAt },
  };
}
