// Lay-language lexicon loader (T45).
//
// functions/_lib/lexicon.json is data only: an array of
// { "phrase", "hpoId", "label", "source" } entries, empty by default. Build or
// update it with `node scripts/validate-lexicon.mjs <file.csv|file.json> --write`,
// which checks every id against the JAX HPO API and takes the label from the
// HPO primary name. Entries are re-checked for shape here (parseLexicon), so a
// malformed row is ignored instead of failing the request.

import raw from "./lexicon.json";
import { parseLexicon } from "./grounding";
import type { LexiconEntry } from "./grounding";

export type { LexiconEntry } from "./grounding";

export const LEXICON: readonly LexiconEntry[] = Object.freeze(parseLexicon(raw));
