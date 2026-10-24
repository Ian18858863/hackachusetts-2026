// Small git helpers used to stamp evaluation results.
import { execFileSync } from 'node:child_process';
import { ROOT } from './load.mjs';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

export function headSha() {
  return git('rev-parse', 'HEAD');
}

/** Uncommitted changes under the given paths (relative to research/case-intelligence). */
export function dirtyPaths(paths) {
  const out = git('status', '--porcelain', '--', ...paths);
  return out ? out.split('\n') : [];
}
