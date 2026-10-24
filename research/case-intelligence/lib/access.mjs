// Classify an article's licence from its PMC OAI-PMH front-matter record.
// Classes:
//   oa-cc              in the PMC open-access set with a Creative Commons licence
//   author-manuscript  NIH author manuscript: free to read, text mining allowed, no CC licence
//   free-to-read       readable on PMC but under publisher copyright (not open-access licensed)
// Publicly readable is NOT the same as open-access licensed.

const CC = [
  [/by-nc-nd|attribution[- ]non-?commercial[- ]no-?deriv/i, 'CC BY-NC-ND'],
  [/by-nc-sa|attribution[- ]non-?commercial[- ]share/i, 'CC BY-NC-SA'],
  [/by-nc|attribution[- ]non-?commercial/i, 'CC BY-NC'],
  [/by-sa|attribution[- ]share/i, 'CC BY-SA'],
  [/licenses\/by\b|creative commons attribution|\(cc by\)|cc by\b/i, 'CC BY'],
  // Last: BMC/Springer statements add a CC0 waiver for *data*; it only names
  // the article licence when no CC BY variant is present.
  [/cc0|publicdomain\/zero/i, 'CC0'],
];

const text = (s) => String(s ?? '').replace(/<[^>]+>/g, ' ').replace(/&#169;/g, '©').replace(/\s+/g, ' ').trim();

export function classifyAccess(xml) {
  const sets = [...String(xml).matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((m) => m[1]);
  const permissions = text(String(xml).match(/<permissions>([\s\S]*?)<\/permissions>/)?.[1]);
  const licenseHref = String(xml).match(/<license[^>]*?(?:xlink:)?href="([^"]+)"/)?.[1] ?? null;
  const manuscriptId = String(xml).match(/pub-id-type="manuscript-id">([^<]+)</)?.[1] ?? null;
  const inOpenSet = sets.includes('pmc-open');
  const ccSource = `${licenseHref ?? ''} ${permissions}`;
  const cc = /creativecommons|creative commons|\bcc by\b/i.test(ccSource) ? (CC.find(([re]) => re.test(ccSource))?.[1] ?? 'CC (unspecified)') : null;
  let classification;
  if (manuscriptId || /available for text mining/i.test(permissions)) classification = 'author-manuscript';
  else if (inOpenSet && cc) classification = 'oa-cc';
  else classification = 'free-to-read';
  return {
    classification,
    license: classification === 'oa-cc' ? cc : null,
    inPmcOpenSet: inOpenSet,
    manuscriptId,
    statement: permissions.slice(0, 200) || null,
  };
}
