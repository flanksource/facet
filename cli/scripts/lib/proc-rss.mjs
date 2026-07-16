import { readFileSync } from 'node:fs';

export function processTreeRss(pid, seen = new Set()) {
  if (process.platform !== 'linux' || seen.has(pid)) return 0;
  seen.add(pid);
  let rss = 0;
  try {
    rss = Number(readFileSync(`/proc/${pid}/statm`, 'utf8').trim().split(/\s+/)[1] ?? 0) * 4096;
  } catch { return 0; }
  try {
    const children = readFileSync(`/proc/${pid}/task/${pid}/children`, 'utf8')
      .trim().split(/\s+/).filter(Boolean);
    for (const child of children) rss += processTreeRss(Number(child), seen);
  } catch { /* process exited while sampling */ }
  return rss;
}
