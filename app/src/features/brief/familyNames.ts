/**
 * Neutral names for family mode (T30a). Demo case ids such as "demo-marfan"
 * name a disease, so nothing a family sees or saves (print title, file name,
 * phenopacket id) is built from a case id or a phenopacket id. Pure; tested in
 * familyNames.test.ts.
 */
import type { Phenopacket } from '../../shared/contract';

/** "2026-10-24T20:23:08.123Z" -> "20261024T202308Z"; "" for an unreadable date. */
export function familyStamp(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}${m[2]}${m[3]}T${m[4]}${m[5]}${m[6]}Z` : '';
}

export function familyFileName(generatedAt: string): string {
  const stamp = familyStamp(generatedAt);
  return stamp ? `notes-for-my-specialist-${stamp}.json` : 'notes-for-my-specialist.json';
}

/** `title` is the translated "Notes for my specialist"; `day` is YYYY-MM-DD or "". */
export function familyPrintTitle(title: string, day: string): string {
  return `${title} ${day}`.trim();
}

/** A copy with a neutral id and subject.id; every other field is the server's, unchanged. */
export function neutralPhenopacket(p: Phenopacket, generatedAt: string): Phenopacket {
  const id = `notes-${familyStamp(generatedAt) || 'export'}`;
  return { ...p, id, subject: { ...p.subject, id } };
}
