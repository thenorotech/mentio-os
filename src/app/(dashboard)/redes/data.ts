/** Reading scrapes for the "Redes y web" pages: runs from Apify, items normalized, metrics computed. */
import { datasetItems, listAllRuns, runInput, type ApifyRun } from '@/lib/apify';
import type { TaggedItem } from '@/lib/scraping/compare';
import { computeMetrics } from '@/lib/scraping/metrics';
import { at, list, text } from '@/lib/scraping/read';
import { normalizeItems, type ScrapedItem, type SourceKey } from '@/lib/scraping/sources';

/** The campaign's clock for days and hours, `DASHBOARD_TIMEZONE` (default Mexico City). */
export const timeZone = () => process.env.DASHBOARD_TIMEZONE || 'America/Mexico_City';

export async function runItems(run: ApifyRun, limit?: number): Promise<ScrapedItem[]> {
  return normalizeItems(run.source, await datasetItems(run, limit), run.id);
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

/**
 * Like `loadLatest`, for the comparison: each item with the targets of the
 * run that scraped it. An item two runs saw counts once, with both runs'
 * targets (the newer run's numbers win).
 */
export async function loadTagged(sources: readonly SourceKey[], perSource: number) {
  const { runs, failed } = await listAllRuns(sources, { limit: perSource, succeeded: true });
  const settled = await Promise.allSettled(runs.map(async (r) => ({ items: await runItems(r), targets: await runTargets(r) })));
  const byKey = new Map<string, TaggedItem>();
  for (const result of settled) {
    if (result.status !== 'fulfilled') continue;
    for (const item of result.value.items) {
      const key = `${item.source}:${item.id}`;
      const known = byKey.get(key);
      byKey.set(key, { item: known?.item ?? item, targets: [...new Set([...(known?.targets ?? []), ...result.value.targets])] });
    }
  }
  const unread = runs.filter((_, i) => settled[i].status === 'rejected').map((r) => r.source);
  return { runs, tagged: [...byKey.values()], failed: [...new Set([...failed, ...unread])] };
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
