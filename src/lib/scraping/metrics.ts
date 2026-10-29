/**
 * Every number the "Redes y web" pages show, computed once from normalized
 * items: pure, so a page and a test read the same result.
 */
import { interactions, type ScrapedItem } from './sources';

export type Ranked = { label: string; value: number };

export type PlatformRow = { platform: string; posts: number; interactions: number; views: number; avgInteractions: number; engagementRate: number | null };

export type AuthorRow = { author: string; platform: string; posts: number; interactions: number; followers: number | null };

export type DomainRow = { domain: string; results: number; bestPosition: number; queries: number };

export type ScrapeMetrics = {
  totals: {
    posts: number;
    articles: number;
    results: number;
    interactions: number;
    likes: number;
    comments: number;
    shares: number;
    views: number;
    authors: number;
    avgInteractions: number;
    /** Interactions over views, where views were reported. */
    engagementRate: number | null;
    first: string | null;
    last: string | null;
  };
  platforms: PlatformRow[];
  /** One key per day (YYYY-MM-DD, in `timeZone`), the last 90 at most. */
  days: string[];
  postsByDay: Array<{ platform: string; values: number[] }>;
  interactionsByDay: number[];
  articlesByDay: number[];
  /** Posts and mean interactions by hour of day, 0 to 23. */
  hours: Array<{ posts: number; avgInteractions: number }>;
  topPosts: ScrapedItem[];
  hashtags: Ranked[];
  words: Ranked[];
  authors: AuthorRow[];
  outlets: Ranked[];
  articles: ScrapedItem[];
  domains: DomainRow[];
  results: ScrapedItem[];
};

/** Words that say nothing about a topic, Spanish and English. */
const STOPWORDS = new Set(
  ('a al algo ante antes como con contra cual cuando de del desde donde durante e el ella ellas ellos en entre era es esa ese eso esta estas este esto estos fue fueron ha han hasta hay la las le les lo los mas más me mi mis muy ni no nos o os otra otro para pero por porque que qué se sea ser si sí sin sobre son su sus también te tiene tienen todo todos tu tus un una uno unos y ya yo hoy aquí así está están vamos va van hace hacer cada solo sólo nuestro nuestra nuestros nuestras vez ver bien gracias the and for with this that you your are was from have will our http https www com amp rt via').split(' '),
);

const MAX_DAYS = 90;

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

function rank(counts: Map<string, number>, max: number): Ranked[] {
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, max).map(([label, value]) => ({ label, value }));
}

const bump = (counts: Map<string, number>, key: string, by = 1) => counts.set(key, (counts.get(key) ?? 0) + by);

function dayKeys(first: string, last: string): string[] {
  const keys: string[] = [];
  const end = Date.parse(`${last}T00:00:00Z`);
  for (let t = Math.max(Date.parse(`${first}T00:00:00Z`), end - (MAX_DAYS - 1) * 86_400_000); t <= end; t += 86_400_000) keys.push(new Date(t).toISOString().slice(0, 10));
  return keys;
}

export function computeMetrics(items: ScrapedItem[], timeZone = 'UTC'): ScrapeMetrics {
  const dayOf = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' });
  const hourOf = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' });
  const localDay = (iso: string) => dayOf.format(new Date(iso));
  const localHour = (iso: string) => Number(hourOf.format(new Date(iso))) % 24;

  const posts = items.filter((i) => i.kind === 'post');
  const articles = items.filter((i) => i.kind === 'article');
  const results = items.filter((i) => i.kind === 'result');

  const totalInteractions = sum(posts.map(interactions));
  const viewed = posts.filter((p) => p.views > 0);
  const viewedInteractions = sum(viewed.map(interactions));
  const viewedViews = sum(viewed.map((p) => p.views));

  // Platforms.
  const byPlatform = new Map<string, ScrapedItem[]>();
  for (const p of posts) byPlatform.set(p.platform, [...(byPlatform.get(p.platform) ?? []), p]);
  const platforms: PlatformRow[] = [...byPlatform.entries()]
    .map(([platform, rows]) => {
      const total = sum(rows.map(interactions));
      const seen = rows.filter((r) => r.views > 0);
      const views = sum(seen.map((r) => r.views));
      return { platform, posts: rows.length, interactions: total, views: sum(rows.map((r) => r.views)), avgInteractions: total / rows.length, engagementRate: views ? sum(seen.map(interactions)) / views : null };
    })
    .sort((a, b) => b.interactions - a.interactions);

  // Days.
  const dated = items.filter((i): i is ScrapedItem & { publishedAt: string } => i.publishedAt !== null && i.kind !== 'result');
  const sorted = dated.map((i) => i.publishedAt).sort();
  const first = sorted[0] ?? null;
  const last = sorted.at(-1) ?? null;
  const days = first && last ? dayKeys(localDay(first), localDay(last)) : [];
  const dayIndex = new Map(days.map((d, i) => [d, i]));
  const postsByDay = platforms.map((p) => ({ platform: p.platform, values: days.map(() => 0) }));
  const platformRow = new Map(postsByDay.map((row) => [row.platform, row]));
  const interactionsByDay = days.map(() => 0);
  const articlesByDay = days.map(() => 0);
  for (const i of dated) {
    const d = dayIndex.get(localDay(i.publishedAt));
    if (d === undefined) continue;
    if (i.kind === 'article') articlesByDay[d] += 1;
    else {
      const row = platformRow.get(i.platform);
      if (row) row.values[d] += 1;
      interactionsByDay[d] += interactions(i);
    }
  }

  // Hours.
  const hourPosts = Array.from({ length: 24 }, () => 0);
  const hourInteractions = Array.from({ length: 24 }, () => 0);
  for (const p of posts) {
    if (!p.publishedAt) continue;
    const h = localHour(p.publishedAt);
    hourPosts[h] += 1;
    hourInteractions[h] += interactions(p);
  }
  const hours = hourPosts.map((n, h) => ({ posts: n, avgInteractions: n ? hourInteractions[h] / n : 0 }));

  // Hashtags and words.
  const tags = new Map<string, number>();
  const words = new Map<string, number>();
  for (const i of [...posts, ...articles]) {
    for (const t of i.hashtags) bump(tags, `#${t}`);
    const body = `${i.title ?? ''} ${i.text}`.toLowerCase().replace(/https?:\/\/\S+/g, ' ').replace(/[#@][\p{L}\p{N}_]+/gu, ' ');
    for (const w of new Set(body.match(/\p{L}[\p{L}'’-]{3,}/gu) ?? [])) if (!STOPWORDS.has(w)) bump(words, w);
  }

  // Authors.
  const authorRows = new Map<string, AuthorRow>();
  for (const p of posts) {
    if (!p.author) continue;
    const key = `${p.platform}:${p.author.toLowerCase()}`;
    const row = authorRows.get(key) ?? { author: p.author, platform: p.platform, posts: 0, interactions: 0, followers: null };
    row.posts += 1;
    row.interactions += interactions(p);
    if (p.authorFollowers !== null) row.followers = Math.max(row.followers ?? 0, p.authorFollowers);
    authorRows.set(key, row);
  }

  // Press.
  const outlets = new Map<string, number>();
  for (const a of articles) if (a.outlet) bump(outlets, a.outlet);

  // Search.
  const domains = new Map<string, DomainRow & { querySet: Set<string> }>();
  for (const r of results) {
    if (!r.outlet) continue;
    const row = domains.get(r.outlet) ?? { domain: r.outlet, results: 0, bestPosition: Infinity, queries: 0, querySet: new Set<string>() };
    row.results += 1;
    row.bestPosition = Math.min(row.bestPosition, r.position ?? Infinity);
    row.querySet.add(r.query ?? '');
    domains.set(r.outlet, row);
  }

  return {
    totals: {
      posts: posts.length,
      articles: articles.length,
      results: results.length,
      interactions: totalInteractions,
      likes: sum(posts.map((p) => p.likes)),
      comments: sum(posts.map((p) => p.comments)),
      shares: sum(posts.map((p) => p.shares)),
      views: sum(posts.map((p) => p.views)),
      authors: authorRows.size,
      avgInteractions: posts.length ? totalInteractions / posts.length : 0,
      engagementRate: viewedViews ? viewedInteractions / viewedViews : null,
      first,
      last,
    },
    platforms,
    days,
    postsByDay,
    interactionsByDay,
    articlesByDay,
    hours,
    topPosts: [...posts].sort((a, b) => interactions(b) - interactions(a) || b.views - a.views).slice(0, 10),
    hashtags: rank(tags, 12),
    words: rank(words, 12),
    authors: [...authorRows.values()].sort((a, b) => b.interactions - a.interactions).slice(0, 10),
    outlets: rank(outlets, 10),
    articles: [...articles].sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')).slice(0, 10),
    domains: [...domains.values()]
      .map(({ querySet, ...row }) => ({ ...row, queries: querySet.size, bestPosition: Number.isFinite(row.bestPosition) ? row.bestPosition : 0 }))
      .sort((a, b) => b.results - a.results || a.bestPosition - b.bestPosition)
      .slice(0, 10),
    results: [...results].sort((a, b) => (a.query ?? '').localeCompare(b.query ?? '') || (a.position ?? 0) - (b.position ?? 0)).slice(0, 30),
  };
}
