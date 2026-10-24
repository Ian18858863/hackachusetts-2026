// Recruiting trials from ClinicalTrials.gov.
// PLACEHOLDER until task 1.7.

import { NotImplementedError } from "./errors";
import type { EngineDeps, TrialsResponse } from "./types";

/** PLACEHOLDER (task 1.7): recruiting studies for a condition. Always throws. */
export async function searchTrials(
  _req: { condition: string; ids?: string[] },
  _deps: EngineDeps,
): Promise<TrialsResponse> {
  throw new NotImplementedError("searchTrials");
}
