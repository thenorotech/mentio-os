/**
 * The head-to-head of "Redes y web": the campaign's tracked targets (the
 * candidate's and the adversaries' @accounts, #hashtags, search terms and
 * URLs) side by side. Each item is attributed to the targets of the run that
 * brought it, so a post counts for every target it is about. Pure, like
 * metrics.ts: no network, no environment.
 */
import { interactions, type ScrapedItem } from './sources';

export type TargetKind = 'handle' | 'hashtag' | 'term' | 'url';

/** A target as the comparison reads it; `key` is stable across runs and spellings. */
export type Target = { key: string; label: string; kind: TargetKind };

/** An item with the targets of the run (or runs) that scraped it. */
export type TaggedItem = { item: ScrapedItem; targets: readonly string[] };

export type TargetRow = {
  target: Target;
  posts: number;
  interactions: number;
  views: number;
  avgInteractions: number;
  /** Interactions over views, where views were reported. */
  engagementRate: number | null;
  /** Shares across the compared targets, 0 to 1. */
  shareOfPosts: number;
  shareOfInteractions: number;
  authors: number;
  /** The platform where the target earned the most interaction. */
  topPlatform: string | null;
  /** Posts per day, aligned to `Comparison.days`. */
  daily: number[];
  best: ScrapedItem | null;
};

export type Comparison = {
  /** One key per day (YYYY-MM-DD, in `timeZone`), the last 90 at most. */
  days: string[];
  /** Busiest first, by interactions. */
  rows: TargetRow[];
  /** Posts no target of their run could claim (compared or not). */
  unmatched: number;
};

const MAX_DAYS = 90;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

/** Lowercase, without accents: "Educación" and "educacion" are the same term. */
const fold = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().trim();

/** Letters and digits only: "@Claudia_Sheinbaum" and the page "Claudia Sheinbaum" meet here. */
const squash = (value: string) => fold(value).replace(/[^\p{L}\p{N}]/gu, '');

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Path segments that name a kind of page, not an account. */
const GENERIC_SEGMENTS = new Set(['explore', 'tags', 'hashtag', 'c', 'user', 'channel', 'p', 'reel', 'reels', 'video', 'videos', 'watch', 'shorts', 'pages', 'profile.php', 'search', 'results', 'status', 'posts', 'groups', 'people', 'tv']);

/** Commas would split the key in a URL filter (`?targets=a,b`). */
const keyOf = (value: string) => value.replace(/,/g, ' ').replace(/\s+/g, ' ').trim();

/**
 * A run's target as a comparison target: a profile URL becomes its handle and
 * a hashtag page its hashtag, so the same account reached two ways is one
 * contender. Null for an empty target.
 */
export function parseTarget(raw: string): Target | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      const segments = url.pathname.split('/').map((s) => decodeURIComponent(s).trim()).filter(Boolean);
      const tagAt = segments.findIndex((s) => s === 'tags' || s === 'hashtag');
      if (tagAt >= 0 && segments[tagAt + 1]) return parseTarget(`#${segments[tagAt + 1]}`);
      // "/candidata", "/@canal", "/c/canal": a profile; "/candidata/status/1" is a post.
      const first = segments[0]?.toLowerCase() ?? '';
      const profile = segments.length === 1 && !GENERIC_SEGMENTS.has(first) ? segments[0] : first.startsWith('@') ? segments[0] : (first === 'c' || first === 'user') && segments[1] ? segments[1] : null;
      if (profile) return parseTarget(`@${profile.replace(/^@/, '')}`);
      const bare = `${url.hostname.replace(/^www\./, '')}${url.pathname.replace(/\/$/, '')}${url.search}`;
      return { key: keyOf(`url:${bare.toLowerCase()}`), label: bare, kind: 'url' };
    } catch {
      return { key: keyOf(`term:${fold(value)}`), label: value, kind: 'term' };
    }
  }
  if (value.startsWith('@')) {
    const handle = squash(value);
    return handle ? { key: `@${handle}`, label: value, kind: 'handle' } : null;
  }
  if (value.startsWith('#')) {
    const tag = fold(value.slice(1));
    return tag ? { key: keyOf(`#${tag}`), label: value, kind: 'hashtag' } : null;
  }
  const term = fold(value.replace(/^["“”'‘’]+|["“”'‘’]+$/g, ''));
  return term ? { key: keyOf(`term:${term}`), label: value.replace(/^["“”'‘’]+|["“”'‘’]+$/g, ''), kind: 'term' } : null;
}

/** Whether an item is about a target. */
export function matches(target: Target, item: ScrapedItem): boolean {
  const body = fold(`${item.title ?? ''} ${item.text}`);
  switch (target.kind) {
    case 'handle': {
      const handle = target.key.slice(1);
      if (item.author && squash(item.author) === handle) return true;
      const bare = fold(target.label.replace(/^@/, ''));
      return new RegExp(`(^|[^\\p{L}\\p{N}_])@${escape(bare)}(?![\\p{L}\\p{N}_])`, 'u').test(body);
    }
    case 'hashtag': {
      const tag = target.key.slice(1);
      return item.hashtags.some((h) => fold(h) === tag);
    }
    case 'url': {
      const url = item.url ? item.url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '') : null;
      return url !== null && url.startsWith(target.key.slice('url:'.length));
    }
    case 'term': {
      const term = target.key.slice('term:'.length);
      return body.includes(term) || (item.query !== null && fold(item.query) === term);
    }
  }
}

/** Every target the items' runs asked for, once each, in first-seen order. */
export function targetsOf(tagged: readonly TaggedItem[]): Target[] {
  const found = new Map<string, Target>();
  for (const { targets } of tagged) {
    for (const raw of targets) {
      const target = parseTarget(raw);
      if (target && !found.has(target.key)) found.set(target.key, target);
    }
  }
  return [...found.values()];
}

function dayKeys(first: string, last: string): string[] {
  const keys: string[] = [];
  const end = Date.parse(`${last}T00:00:00Z`);
  for (let t = Math.max(Date.parse(`${first}T00:00:00Z`), end - (MAX_DAYS - 1) * 86_400_000); t <= end; t += 86_400_000) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}

/**
 * The comparison of the targets in `only` (every target when omitted).
 * Social posts only: news and search results carry no interaction to compare.
 * An item that matches no target of its run still counts for that run's
 * target when the run had just one (a profile's own posts, whatever they say).
 */
export function compareTargets(tagged: readonly TaggedItem[], { timeZone = 'UTC', only }: { timeZone?: string; only?: readonly string[] } = {}): Comparison {
  const dayOf = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const localDay = (iso: string) => dayOf.format(new Date(iso));
  const wanted = only ? new Set(only) : null;
  const compared = targetsOf(tagged).filter((t) => !wanted || wanted.has(t.key));
  const comparedKeys = new Set(compared.map((t) => t.key));
  const parsed = new Map<string, Target | null>();
  const parse = (raw: string) => {
    if (!parsed.has(raw)) parsed.set(raw, parseTarget(raw));
    return parsed.get(raw) ?? null;
  };

  const byTarget = new Map<string, ScrapedItem[]>(compared.map((t) => [t.key, []]));
  let unmatched = 0;
  for (const { item, targets } of tagged) {
    if (item.kind !== 'post') continue;
    const own = [...new Map(targets.flatMap((raw) => parse(raw) ?? []).map((t) => [t.key, t])).values()];
    const hits = own.filter((t) => matches(t, item));
    const attributed = hits.length ? hits : own.length === 1 ? own : [];
    if (attributed.length === 0) unmatched += 1;
    for (const t of attributed) if (comparedKeys.has(t.key)) byTarget.get(t.key)?.push(item);
  }

  const dated = [...byTarget.values()].flat().flatMap((i) => (i.publishedAt ? [localDay(i.publishedAt)] : [])).sort();
  const days = dated.length ? dayKeys(dated[0], dated[dated.length - 1]) : [];
  const dayIndex = new Map(days.map((d, i) => [d, i]));

  const rows = compared.map((target) => {
    const posts = byTarget.get(target.key) ?? [];
    const total = sum(posts.map(interactions));
    const seen = posts.filter((p) => p.views > 0);
    const seenViews = sum(seen.map((p) => p.views));
    const platforms = new Map<string, { interactions: number; posts: number }>();
    for (const p of posts) {
      const row = platforms.get(p.platform) ?? { interactions: 0, posts: 0 };
      row.interactions += interactions(p);
      row.posts += 1;
      platforms.set(p.platform, row);
    }
    const daily = days.map(() => 0);
    for (const p of posts) {
      const d = p.publishedAt ? dayIndex.get(localDay(p.publishedAt)) : undefined;
      if (d !== undefined) daily[d] += 1;
    }
    return {
      target,
      posts: posts.length,
      interactions: total,
      views: sum(posts.map((p) => p.views)),
      avgInteractions: posts.length ? total / posts.length : 0,
      engagementRate: seenViews ? sum(seen.map(interactions)) / seenViews : null,
      shareOfPosts: 0,
      shareOfInteractions: 0,
      authors: new Set(posts.flatMap((p) => (p.author ? [`${p.platform}:${p.author.toLowerCase()}`] : []))).size,
      topPlatform: [...platforms.entries()].sort((a, b) => b[1].interactions - a[1].interactions || b[1].posts - a[1].posts)[0]?.[0] ?? null,
      daily,
      best: [...posts].sort((a, b) => interactions(b) - interactions(a) || b.views - a.views)[0] ?? null,
    } satisfies TargetRow;
  });

  const allPosts = sum(rows.map((r) => r.posts));
  const allInteractions = sum(rows.map((r) => r.interactions));
  for (const row of rows) {
    row.shareOfPosts = allPosts ? row.posts / allPosts : 0;
    row.shareOfInteractions = allInteractions ? row.interactions / allInteractions : 0;
  }

  return { days, rows: rows.sort((a, b) => b.interactions - a.interactions || b.posts - a.posts), unmatched };
}
