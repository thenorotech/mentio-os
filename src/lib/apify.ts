/**
 * The Apify client, server side only, like src/lib/mentio.ts: the token is
 * read here and nowhere else. Apify holds the scrapes themselves (runs and
 * their datasets), so Ágora still keeps no database: a run is listed, read
 * and exported straight from Apify. REST over fetch, no SDK.
 */
import { apiErrorMessage } from '@/lib/action';
import { at, count, isObj, list, text, when } from '@/lib/scraping/read';
import { SOURCES, SOURCE_KEYS, type Json, type ScrapeRequest, type SourceKey } from '@/lib/scraping/sources';

if (typeof window !== 'undefined') {
  throw new Error('Este módulo solo se ejecuta en el servidor: el token nunca debe llegar al navegador.');
}

const STATUSES = ['READY', 'RUNNING', 'SUCCEEDED', 'FAILED', 'ABORTING', 'ABORTED', 'TIMING-OUT', 'TIMED-OUT'] as const;
export type RunStatus = (typeof STATUSES)[number];
const RUNNING: readonly RunStatus[] = ['READY', 'RUNNING', 'ABORTING', 'TIMING-OUT'];
const isStatus = (value: unknown): value is RunStatus => typeof value === 'string' && (STATUSES as readonly string[]).includes(value);

export type ApifyRun = {
  id: string;
  source: SourceKey;
  status: RunStatus;
  startedAt: string | null;
  finishedAt: string | null;
  datasetId: string | null;
  storeId: string | null;
  items: number;
  /** What the run cost, in USD, when Apify reports it. */
  costUsd: number | null;
};

export const isRunning = (status: RunStatus) => RUNNING.includes(status);

export const apifyConfigured = () => Boolean(process.env.APIFY_TOKEN);

/** The actor a source runs here: `APIFY_ACTOR_<KEY>` or the adapter's default. */
export const actorFor = (source: SourceKey) => process.env[`APIFY_ACTOR_${source.toUpperCase()}`] || SOURCES[source].actor;

/** Country and language for search and news, `APIFY_COUNTRY` / `APIFY_LANGUAGE` (default México, español). */
export const searchLocale = () => ({ country: (process.env.APIFY_COUNTRY || 'mx').toLowerCase(), language: (process.env.APIFY_LANGUAGE || 'es').toLowerCase() });

/** Apify's path form of an actor: `user/name` becomes `user~name`. */
const actorPath = (source: SourceKey) => encodeURIComponent(actorFor(source).replace('/', '~'));

async function request(path: string, init: { method?: 'GET' | 'POST'; body?: Json } = {}): Promise<unknown> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('La recolección no está configurada.');
  const base = (process.env.APIFY_API_URL || 'https://api.apify.com').replace(/\/$/, '');
  const response = await fetch(`${base}/v2${path}`, {
    method: init.method ?? 'GET',
    headers: { authorization: `Bearer ${token}`, ...(init.body === undefined ? {} : { 'content-type': 'application/json' }) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    cache: 'no-store',
  });
  if (!response.ok) {
    // Apify's own message stays in the server log; the page shows a localized one.
    const detail = await response.text().catch(() => '');
    console.error('Error del servicio de recolección', { status: response.status, path: path.split('?')[0], detail: detail.slice(0, 300) });
    const error = new Error(apiErrorMessage(response.status)) as Error & { apiStatus?: number };
    error.apiStatus = response.status;
    throw error;
  }
  return response.json();
}

function toRun(source: SourceKey, raw: unknown): ApifyRun {
  const status = at(raw, 'status');
  return {
    id: text(at(raw, 'id')) ?? '',
    source,
    status: isStatus(status) ? status : 'READY',
    startedAt: when(at(raw, 'startedAt')),
    finishedAt: when(at(raw, 'finishedAt')),
    datasetId: text(at(raw, 'defaultDatasetId')),
    storeId: text(at(raw, 'defaultKeyValueStoreId')),
    // Runs do not report their item count; `withItemCounts` reads it from the dataset.
    items: count(at(raw, 'stats', 'datasetItemCount')),
    costUsd: typeof at(raw, 'usageTotalUsd') === 'number' ? count(at(raw, 'usageTotalUsd')) : null,
  };
}

/**
 * Starts a scrape; Apify runs it in the background. `maxItems` stops a
 * pay-per-result actor at what was asked; `APIFY_MAX_USD_PER_RUN` caps what
 * a pay-per-event actor may charge.
 */
export async function startRun(source: SourceKey, scrape: ScrapeRequest): Promise<ApifyRun> {
  const query = new URLSearchParams({ maxItems: String(scrape.limit * scrape.targets.length) });
  const cap = Number(process.env.APIFY_MAX_USD_PER_RUN);
  if (Number.isFinite(cap) && cap > 0) query.set('maxTotalChargeUsd', String(cap));
  const body = await request(`/acts/${actorPath(source)}/runs?${query}`, { method: 'POST', body: SOURCES[source].input(scrape) });
  return toRun(source, at(body, 'data'));
}

/** A source's runs, newest first. */
export async function listRuns(source: SourceKey, { limit = 20, succeeded = false } = {}): Promise<ApifyRun[]> {
  const body = await request(`/acts/${actorPath(source)}/runs?desc=1&limit=${limit}${succeeded ? '&status=SUCCEEDED' : ''}`);
  return list(at(body, 'data', 'items')).map((r) => toRun(source, r));
}

/**
 * Every source's runs at once; a source that fails (an actor not rented, a
 * renamed actor) is reported apart instead of emptying the page.
 */
export async function listAllRuns(sources: readonly SourceKey[] = SOURCE_KEYS, options?: { limit?: number; succeeded?: boolean }) {
  const settled = await Promise.allSettled(sources.map((s) => listRuns(s, options)));
  const runs = settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
  const failed = sources.filter((_, i) => settled[i].status === 'rejected');
  return { runs: runs.sort((a, b) => (b.startedAt ?? '').localeCompare(a.startedAt ?? '')), failed };
}

const actorIds = new Map<string, string>();

/** Apify's id for the source's actor, to check a run belongs to it. */
async function actorId(source: SourceKey) {
  const name = actorFor(source);
  const known = actorIds.get(name);
  if (known) return known;
  const id = text(at(await request(`/acts/${actorPath(source)}`), 'data', 'id')) ?? '';
  actorIds.set(name, id);
  return id;
}

/** One run, or null when it is not this source's (the URL was edited): a 404, never another actor's data. */
export async function getRun(source: SourceKey, id: string): Promise<ApifyRun | null> {
  try {
    const [body, expected] = await Promise.all([request(`/actor-runs/${encodeURIComponent(id)}`), actorId(source)]);
    const data = at(body, 'data');
    if (text(at(data, 'actId')) !== expected) return null;
    const [run] = await withItemCounts([toRun(source, data)]);
    return run;
  } catch (error) {
    if (isObj(error) && error.apiStatus === 404) return null;
    throw error;
  }
}

/** The input the run was started with (its targets), read back from the run's store. */
export async function runInput(run: ApifyRun): Promise<unknown> {
  if (!run.storeId) return null;
  try {
    return await request(`/key-value-stores/${encodeURIComponent(run.storeId)}/records/INPUT`);
  } catch {
    return null;
  }
}

const PAGE = 1000;

/** A run's raw dataset items, page by page, at most `limit`. */
export async function datasetItems(run: ApifyRun, limit = 5000): Promise<unknown[]> {
  if (!run.datasetId) return [];
  const items: unknown[] = [];
  while (items.length < limit) {
    const size = Math.min(PAGE, limit - items.length);
    const page = list(await request(`/datasets/${encodeURIComponent(run.datasetId)}/items?clean=1&format=json&offset=${items.length}&limit=${size}`));
    items.push(...page);
    if (page.length < size) break;
  }
  return items;
}

/** The runs with their dataset's item count, which the run itself does not carry; a count that fails stays as it was. */
export async function withItemCounts(runs: ApifyRun[]): Promise<ApifyRun[]> {
  const counts = await Promise.allSettled(runs.map((r) => (r.datasetId ? request(`/datasets/${encodeURIComponent(r.datasetId)}`) : Promise.resolve(null))));
  return runs.map((r, i) => {
    const c = counts[i];
    return c.status === 'fulfilled' && c.value !== null ? { ...r, items: count(at(c.value, 'data', 'itemCount'), r.items) } : r;
  });
}

export async function abortRun(id: string): Promise<void> {
  await request(`/actor-runs/${encodeURIComponent(id)}/abort`, { method: 'POST' });
}
