// Europe PMC access with a local cache. Network is used only by the fetch and
// verify scripts; validation and evaluation never call this module.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE_DIR = join(ROOT, '.cache');
const REST = 'https://www.ebi.ac.uk/europepmc/webservices/rest';

export function assertPmcid(pmcid) {
  if (!/^PMC\d{4,9}$/.test(pmcid)) throw new Error(`Not a PMC id: ${pmcid}`);
}

async function getText(url, timeoutMs = 30000) {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Metadata record from the Europe PMC search API (resultType=core). */
export async function fetchMeta(pmcid, { refresh = false } = {}) {
  assertPmcid(pmcid);
  const file = join(CACHE_DIR, `${pmcid}.meta.json`);
  if (!refresh && existsSync(file)) return JSON.parse(await readFile(file, 'utf8'));
  const url = `${REST}/search?query=PMCID:${pmcid}&resultType=core&format=json`;
  const body = JSON.parse(await getText(url));
  const r = body?.resultList?.result?.[0];
  if (!r) throw new Error(`Europe PMC has no record for ${pmcid}`);
  const meta = {
    pmcid: r.pmcid,
    pmid: r.pmid ?? null,
    doi: r.doi ?? null,
    title: r.title,
    journal: r.journalInfo?.journal?.title ?? r.journalTitle ?? null,
    year: Number(r.pubYear) || null,
    isOpenAccess: r.isOpenAccess === 'Y',
    license: r.license ?? null,
    pubTypes: r.pubTypeList?.pubType ?? [],
    abstractText: r.abstractText ?? '',
    fetchedAt: new Date().toISOString(),
    fetchedFrom: url,
  };
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, JSON.stringify(meta, null, 2));
  return meta;
}

const EFETCH = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi';

/**
 * Plain text of the article body (tags stripped). Tries Europe PMC full-text
 * XML first, then NCBI PMC efetch. Returns null when neither source allows
 * download (the publisher keeps the article out of the open-access subset);
 * callers must then fall back to the abstract and say so.
 */
export async function fetchFullText(pmcid, { refresh = false } = {}) {
  assertPmcid(pmcid);
  const file = join(CACHE_DIR, `${pmcid}.txt`);
  const srcFile = join(CACHE_DIR, `${pmcid}.source`);
  if (!refresh && existsSync(file)) return readFile(file, 'utf8');
  let xml = null;
  let source = null;
  try {
    xml = await getText(`${REST}/${pmcid}/fullTextXML`);
    source = 'europepmc-fullTextXML';
  } catch {
    const ncbi = await getText(`${EFETCH}?db=pmc&id=${pmcid.slice(3)}&rettype=xml`);
    if (/<body[\s>]/.test(ncbi) && !/does not allow downloading/i.test(ncbi)) {
      xml = ncbi;
      source = 'ncbi-efetch-pmc';
    }
  }
  if (!xml) return null;
  const text = xmlToText(xml);
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(file, text);
  await writeFile(srcFile, source);
  return text;
}

export async function cachedTextSource(pmcid) {
  const f = join(CACHE_DIR, `${pmcid}.source`);
  if (existsSync(f)) return (await readFile(f, 'utf8')).trim();
  // Text cached before the source sidecar existed came from Europe PMC.
  return existsSync(join(CACHE_DIR, `${pmcid}.txt`)) ? 'europepmc-fullTextXML' : null;
}

export function hasCachedText(pmcid) {
  return existsSync(join(CACHE_DIR, `${pmcid}.txt`));
}

export async function readCachedText(pmcid) {
  return readFile(join(CACHE_DIR, `${pmcid}.txt`), 'utf8');
}

/** Strip XML tags and decode the common entities. Keeps paragraph breaks. */
export function xmlToText(xml) {
  return String(xml)
    .replace(/<(\/)?(p|title|sec|caption|td|th|li|abstract)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n')
    .trim();
}
