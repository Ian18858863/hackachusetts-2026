/** Phenopacket file name and JSON download, shared by the clinician and family briefs. */
import type { Phenopacket } from '../../shared/contract';
import { fileSafe } from './format';

export function phenopacketFileName(p: Phenopacket): string {
  return `phenopacket-${fileSafe(p.id)}.json`;
}

export function downloadJson(fileName: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the blob.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
