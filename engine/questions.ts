// "What to check next" questions.
// PLACEHOLDER until task 1.6 (frequency-midpoint spread over HPO annotations).

import { NotImplementedError } from "./errors";
import type { EngineDeps, NextQuestionsRequest, NextQuestionsResponse } from "./types";

/** PLACEHOLDER (task 1.6): discriminating questions for the top candidates. Always throws. */
export async function nextQuestions(
  _req: NextQuestionsRequest,
  _deps: EngineDeps,
): Promise<NextQuestionsResponse> {
  throw new NotImplementedError("nextQuestions");
}
