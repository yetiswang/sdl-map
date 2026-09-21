// Build-time dates from git, so sitemaps and structured data say when content
// actually changed rather than when the site was last built. Falls back to
// today when git is unavailable (fresh checkout without history, CI tarball).
import { execSync } from 'node:child_process';

export const today = () => new Date().toISOString().slice(0, 10);

const memo = new Map<string, string>();
export function gitDate(path: string): string {
  const hit = memo.get(path);
  if (hit) return hit;
  const d = gitDateUncached(path);
  memo.set(path, d);
  return d;
}
function gitDateUncached(path: string): string {
  try {
    const d = execSync(`git log -1 --format=%cs -- "${path}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : today();
  } catch {
    return today();
  }
}

export const maxDate = (...ds: string[]) => ds.filter(Boolean).sort().pop() || today();
