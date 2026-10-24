// Specialist brief and GA4GH Phenopacket export (pure, no network).
// toPhenopacket is implemented. buildBrief and specialistsFor are placeholders
// until the specialist mapping table (engine/data/specialists.ts, open
// question 4) is approved in task 1.8.

import { NotImplementedError } from "./errors";
import { CREATED_BY, DEMO_PHENOPACKET_REFERENCE } from "./text";
import type {
  Brief,
  CaseObject,
  CaseTerm,
  DataVersions,
  IsoDateTime,
  Phenopacket,
  PhenotypicFeature,
  SpecialistSuggestion,
} from "./types";

/** PLACEHOLDER (task 1.8): build the one-page specialist brief. Always throws. */
export function buildBrief(
  _c: CaseObject,
  _opts: { generatedAt: IsoDateTime; dataVersions: DataVersions },
): Brief {
  throw new NotImplementedError("buildBrief");
}

/** PLACEHOLDER (task 1.8, open question 4): organ-system -> specialty table. Always throws. */
export function specialistsFor(_categories: string[]): SpecialistSuggestion[] {
  throw new NotImplementedError("specialistsFor");
}

/** "2026-10-24T16:10:00.000Z" -> "20261024T161000Z" (used in phenopacket ids). */
function compactTimestamp(iso: IsoDateTime): string {
  return iso.replace(/\.\d+(?=Z$)/, "").replace(/[-:]/g, "");
}

/** Observed and excluded terms in case order, removed terms dropped, first entry per id kept. */
function activeTerms(terms: readonly CaseTerm[]): CaseTerm[] {
  const seen = new Set<string>();
  const out: CaseTerm[] = [];
  for (const term of terms) {
    if (term.status === "removed" || seen.has(term.hpoId)) continue;
    seen.add(term.hpoId);
    out.push(term);
  }
  return out;
}

/**
 * GA4GH Phenopacket v2 subset with phenotypic features only (CONTRACT.md 7.7).
 * Deliberately no `diseases` or `interpretations`, so it never states a
 * diagnosis. No names, birth dates or free-text notes; quotes go into
 * `description`. Sex is always UNKNOWN_SEX because the case object has none.
 */
export function toPhenopacket(
  c: CaseObject,
  opts: { created: IsoDateTime; hpoVersion: string },
): Phenopacket {
  const stamp = compactTimestamp(opts.created);
  const demo = c.demo;

  const phenotypicFeatures: PhenotypicFeature[] = activeTerms(c.terms).map((term) => {
    const feature: PhenotypicFeature = { type: { id: term.hpoId, label: term.label } };
    if (term.status === "excluded") feature.excluded = true;
    if (term.quote !== undefined && term.quote !== "") feature.description = term.quote;
    return feature;
  });

  const packet: Phenopacket = {
    // Non-demo id format is not fixed by the contract; proposed as "rdd-case-<timestamp>".
    id: demo ? `rdd-${demo.caseId}-${stamp}` : `rdd-case-${stamp}`,
    subject: { id: demo ? `DEMO-synthetic-${demo.caseId}` : "rdd-subject-1", sex: "UNKNOWN_SEX" },
    phenotypicFeatures,
    metaData: {
      created: opts.created,
      createdBy: CREATED_BY,
      resources: [
        {
          id: "hp",
          name: "human phenotype ontology",
          url: "http://purl.obolibrary.org/obo/hp.owl",
          version: opts.hpoVersion,
          namespacePrefix: "HP",
          iriPrefix: "http://purl.obolibrary.org/obo/HP_",
        },
      ],
      phenopacketSchemaVersion: "2.0",
    },
  };

  if (demo) {
    packet.metaData.externalReferences = [
      {
        id: `phenopacket-store:${demo.sourcePhenopacketId}`,
        description: DEMO_PHENOPACKET_REFERENCE,
      },
    ];
  }
  return packet;
}
