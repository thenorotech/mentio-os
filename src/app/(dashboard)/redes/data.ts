/** Reading scrapes for the "Redes y web" pages: runs from Apify, items normalized, metrics computed. */
import { datasetItems, listAllRuns, runInput, type ApifyRun } from '@/lib/apify';
import { computeMetrics } from '@/lib/scraping/metrics';
import { at, list, text } from '@/lib/scraping/read';
import { normalizeItems, type ScrapedItem, type SourceKey } from '@/lib/scraping/sources';

/** The campaign's clock for days and hours, `DASHBOARD_TIMEZONE` (default Mexico City). */
export const timeZone = () => process.env.DASHBOARD_TIMEZONE || 'America/Mexico_City';

export async function runItems(run: ApifyRun, limit?: number): Promise<ScrapedItem[]> {
  return normalizeItems(run.source, await datasetItems(run, limit));
}

/**
 * The latest `perSource` finished runs of each source, merged: an item seen
 * by two runs counts once (the newer run's numbers win, runs come newest first).
 */
export async function loadLatest(sources: readonly SourceKey[], perSource: number) {
  const { runs, failed } = await listAllRuns(sources, { limit: perSource, succeeded: true });
  const settled = await Promise.allSettled(runs.map((r) => runItems(r)));
  const seen = new Set<string>();
  const items = settled
    .flatMap((r) => (r.status === 'fulfilled' ? r.value : []))
    .filter((i) => {
      const key = `${i.source}:${i.id}`;
      return seen.has(key) ? false : (seen.add(key), true);
    });
  const unread = runs.filter((_, i) => settled[i].status === 'rejected').map((r) => r.source);
  return { runs, items, failed: [...new Set([...failed, ...unread])], metrics: computeMetrics(items, timeZone()) };
}

/** What a run was asked to scrape, from its input: handles, hashtags, terms and URLs. */
export async function runTargets(run: ApifyRun): Promise<string[]> {
  const input = await runInput(run);
  const strings = (key: string, prefix = '') => list(at(input, key)).flatMap((v) => text(v, at(v, 'url')) ?? []).map((v) => `${prefix}${v}`);
  const targets = [
    ...strings('directUrls'),
    ...strings('startUrls'),
    ...strings('postURLs'),
    ...strings('twitterHandles', '@'),
    ...strings('profiles', '@'),
    ...strings('hashtags', '#'),
    ...strings('searchTerms'),
    ...strings('searchQueries'),
    ...(text(at(input, 'queries'))?.split('\n') ?? strings('queries')),
  ];
  if (targets.length === 0) {
    const query = text(at(input, 'query'));
    if (query) targets.push(query);
  }
  return [...new Set(targets.map((t) => t.replace(/\s+since:\S+/, '').trim()).filter(Boolean))];
}
