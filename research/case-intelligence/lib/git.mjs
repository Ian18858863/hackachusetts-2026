// Small git helpers used to stamp and check evaluation results.
import { execFileSync } from 'node:child_process';
import { ROOT } from './load.mjs';

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();

export function headSha() {
  return git('rev-parse', 'HEAD');
}

/** Uncommitted changes under the given paths (relative to research/case-intelligence). */
export function dirtyPaths(paths) {
  const out = git('status', '--porcelain', '--', ...paths);
  return out ? out.split('\n') : [];
}

/** True if sha is a commit that is HEAD or an ancestor of HEAD. */
export function isAncestor(sha) {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', sha, 'HEAD'], { cwd: ROOT, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** File contents at a commit (path relative to research/case-intelligence), or null if absent. */
export function showAt(sha, relPath) {
  try {
    return execFileSync('git', ['show', `${sha}:./${relPath}`], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}
