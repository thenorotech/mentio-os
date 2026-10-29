/**
 * The sources Ágora scrapes through Apify, one adapter each: which actor,
 * how a campaign's targets (handles, hashtags, terms, URLs) become that
 * actor's input, and how its dataset items become one `ScrapedItem` shape the
 * metrics read. Pure: no network, no environment; the actor a deployment
 * really runs can be swapped with `APIFY_ACTOR_<KEY>` (src/lib/apify.ts).
 */
import { at, count, hashtags, host, list, maybeCount, text, when } from './read';

export const SOURCE_KEYS = ['instagram', 'facebook', 'x', 'tiktok', 'youtube', 'google', 'news'] as const;
export type SourceKey = (typeof SOURCE_KEYS)[number];

export const isSourceKey = (value: unknown): value is SourceKey => typeof value === 'string' && (SOURCE_KEYS as readonly string[]).includes(value);

/** A social post, a news article, or an organic search result. */
export type ItemKind = 'post' | 'article' | 'result';

export type ScrapedItem = {
  source: SourceKey;
  kind: ItemKind;
  /** The platform for logos and breakdowns (`news` and `google` included). */
  platform: string;
  id: string;
  url: string | null;
  title: string | null;
  text: string;
  author: string | null;
  authorFollowers: number | null;
  publishedAt: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  hashtags: string[];
  /** The news outlet, or the result's domain. */
  outlet: string | null;
  /** The search term a result answered, and its rank. */
  query: string | null;
  position: number | null;
};

export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/** What the "new scrape" form asks for, already validated. */
export type ScrapeRequest = {
  targets: string[];
  limit: number;
  /** Only posts from the last N days, where the actor can filter. */
  days: number | null;
  country: string;
  language: string;
};

export type Source = {
  key: SourceKey;
  label: string;
  platform: string;
  kind: ItemKind;
  /** The default Apify actor, `username/name`. */
  actor: string;
  description: string;
  placeholder: string;
  /** The targets this actor can take; the rest are left out of its run. */
  accepts: (target: string) => boolean;
  input: (request: ScrapeRequest) => { [key: string]: Json };
  /** `fallback` identifies an item that carries no id of its own (run id and position). */
  normalize: (raw: unknown, fallback: string) => ScrapedItem[];
};

const isUrl = (target: string) => /^https?:\/\//i.test(target);
const urlOn = (target: string, ...hosts: string[]) => {
  const h = host(target);
  return h !== null && hosts.some((x) => h === x || h.endsWith(`.${x}`));
};
/** One word, no spaces: a page or account name typed without @. */
const isName = (target: string) => /^[\p{L}\p{N}._-]+$/u.test(target);
const isHandle = (target: string) => target.startsWith('@');
const isTag = (target: string) => target.startsWith('#');
const bare = (target: string) => target.replace(/^[@#]/, '').trim();
const isoDay = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

function item(source: SourceKey, kind: ItemKind, platform: string, fields: Partial<ScrapedItem> & { id: string }): ScrapedItem {
  return {
    source,
    kind,
    platform,
    url: null,
    title: null,
    text: '',
    author: null,
    authorFollowers: null,
    publishedAt: null,
    likes: 0,
    comments: 0,
    shares: 0,
    views: 0,
    hashtags: [],
    outlet: null,
    query: null,
    position: null,
    ...fields,
  };
}

/** An item's id: the actor's, else its URL, else its run and position. */
const idOf = (raw: unknown, fallback: string, ...keys: string[]) => text(...keys.map((k) => at(raw, k))) ?? fallback;

export const SOURCES: Record<SourceKey, Source> = {
  instagram: {
    key: 'instagram',
    label: 'Instagram',
    platform: 'instagram',
    kind: 'post',
    actor: 'apify/instagram-scraper',
    description: 'Publicaciones de perfiles (@usuario) y hashtags (#tema): likes, comentarios y reproducciones.',
    placeholder: '@candidata, #seguridad, https://www.instagram.com/…',
    accepts: (t) => isHandle(t) || isTag(t) || urlOn(t, 'instagram.com'),
    input: ({ targets, limit, days }) => ({
      directUrls: targets.map((t) => (isUrl(t) ? t : isTag(t) ? `https://www.instagram.com/explore/tags/${encodeURIComponent(bare(t))}/` : `https://www.instagram.com/${bare(t)}/`)),
      resultsType: 'posts',
      resultsLimit: limit,
      addParentData: false,
      ...(days ? { onlyPostsNewerThan: isoDay(days) } : {}),
    }),
    normalize: (raw, fallback) => {
      const body = text(at(raw, 'caption')) ?? '';
      return [item('instagram', 'post', 'instagram', {
        id: idOf(raw, fallback, 'id', 'shortCode', 'url'),
        url: text(at(raw, 'url')),
        text: body,
        author: text(at(raw, 'ownerUsername'), at(raw, 'ownerFullName')),
        authorFollowers: maybeCount(at(raw, 'ownerFollowersCount')),
        publishedAt: when(at(raw, 'timestamp')),
        likes: count(at(raw, 'likesCount')),
        comments: count(at(raw, 'commentsCount')),
        views: count(at(raw, 'videoPlayCount'), at(raw, 'videoViewCount')),
        hashtags: hashtags(body, at(raw, 'hashtags')),
      })];
    },
  },
  facebook: {
    key: 'facebook',
    label: 'Facebook',
    platform: 'facebook',
    kind: 'post',
    actor: 'apify/facebook-posts-scraper',
    description: 'Publicaciones de páginas y perfiles públicos: reacciones, comentarios, compartidos y vistas.',
    placeholder: 'NombreDeLaPagina, https://www.facebook.com/…',
    accepts: (t) => isHandle(t) || (!isTag(t) && isName(t)) || urlOn(t, 'facebook.com', 'fb.com'),
    input: ({ targets, limit, days }) => ({
      startUrls: targets.map((t) => ({ url: isUrl(t) ? t : `https://www.facebook.com/${bare(t)}` })),
      resultsLimit: limit,
      ...(days ? { onlyPostsNewerThan: isoDay(days) } : {}),
    }),
    normalize: (raw, fallback) => {
      const body = text(at(raw, 'text'), at(raw, 'postText')) ?? '';
      return [item('facebook', 'post', 'facebook', {
        id: idOf(raw, fallback, 'postId', 'id', 'url'),
        url: text(at(raw, 'url'), at(raw, 'topLevelUrl')),
        text: body,
        author: text(at(raw, 'pageName'), at(raw, 'user', 'name')),
        authorFollowers: maybeCount(at(raw, 'pageFollowers'), at(raw, 'followers')),
        publishedAt: when(at(raw, 'time'), at(raw, 'timestamp')),
        likes: count(at(raw, 'likes'), at(raw, 'reactionsCount'), at(raw, 'topReactionsCount')),
        comments: count(at(raw, 'comments'), at(raw, 'commentsCount')),
        shares: count(at(raw, 'shares'), at(raw, 'sharesCount')),
        views: count(at(raw, 'viewsCount'), at(raw, 'videoViewCount')),
        hashtags: hashtags(body),
      })];
    },
  },
  x: {
    key: 'x',
    label: 'X (Twitter)',
    platform: 'x',
    kind: 'post',
    actor: 'apidojo/tweet-scraper',
    description: 'Posts de cuentas (@usuario) o búsquedas: likes, respuestas, reposts, citas y vistas.',
    placeholder: '@candidata, "propuesta de seguridad", #debate',
    accepts: (t) => !isUrl(t) || urlOn(t, 'x.com', 'twitter.com'),
    input: ({ targets, limit, days }) => {
      const since = days ? ` since:${isoDay(days)}` : '';
      return {
        twitterHandles: targets.filter(isHandle).map(bare),
        searchTerms: targets.filter((t) => !isHandle(t) && !isUrl(t)).map((t) => `${t}${since}`),
        startUrls: targets.filter(isUrl),
        maxItems: limit * targets.length,
        sort: 'Latest',
        ...(days ? { start: isoDay(days) } : {}),
      };
    },
    normalize: (raw, fallback) => {
      const body = text(at(raw, 'fullText'), at(raw, 'text')) ?? '';
      return [item('x', 'post', 'x', {
        id: idOf(raw, fallback, 'id', 'url'),
        url: text(at(raw, 'url'), at(raw, 'twitterUrl')),
        text: body,
        author: text(at(raw, 'author', 'userName'), at(raw, 'author', 'name')),
        authorFollowers: maybeCount(at(raw, 'author', 'followers'), at(raw, 'author', 'followersCount')),
        publishedAt: when(at(raw, 'createdAt')),
        likes: count(at(raw, 'likeCount')),
        comments: count(at(raw, 'replyCount')),
        shares: count(at(raw, 'retweetCount')) + count(at(raw, 'quoteCount')),
        views: count(at(raw, 'viewCount')),
        hashtags: hashtags(body, at(raw, 'entities', 'hashtags')),
      })];
    },
  },
  tiktok: {
    key: 'tiktok',
    label: 'TikTok',
    platform: 'tiktok',
    kind: 'post',
    actor: 'clockworks/tiktok-scraper',
    description: 'Videos de perfiles (@usuario), hashtags (#tema) o búsquedas: reproducciones, likes, comentarios y compartidos.',
    placeholder: '@candidata, #elecciones, debate presidencial',
    accepts: (t) => !isUrl(t) || urlOn(t, 'tiktok.com'),
    input: ({ targets, limit }) => ({
      // A profile URL (tiktok.com/@user) is a profile; a /video/ URL is a post.
      profiles: [...targets.filter(isHandle).map(bare), ...targets.filter((t) => isUrl(t) && !/\/video\//.test(t)).flatMap((t) => t.match(/\/@([^/?#]+)/)?.[1] ?? [])],
      hashtags: targets.filter(isTag).map(bare),
      searchQueries: targets.filter((t) => !isHandle(t) && !isTag(t) && !isUrl(t)),
      postURLs: targets.filter((t) => isUrl(t) && /\/video\//.test(t)),
      resultsPerPage: limit,
      shouldDownloadVideos: false,
      shouldDownloadCovers: false,
    }),
    normalize: (raw, fallback) => {
      const body = text(at(raw, 'text')) ?? '';
      return [item('tiktok', 'post', 'tiktok', {
        id: idOf(raw, fallback, 'id', 'webVideoUrl'),
        url: text(at(raw, 'webVideoUrl')),
        text: body,
        author: text(at(raw, 'authorMeta', 'name'), at(raw, 'authorMeta', 'nickName')),
        authorFollowers: maybeCount(at(raw, 'authorMeta', 'fans')),
        publishedAt: when(at(raw, 'createTimeISO'), at(raw, 'createTime')),
        likes: count(at(raw, 'diggCount')),
        comments: count(at(raw, 'commentCount')),
        shares: count(at(raw, 'shareCount')),
        views: count(at(raw, 'playCount')),
        hashtags: hashtags(body, at(raw, 'hashtags')),
      })];
    },
  },
  youtube: {
    key: 'youtube',
    label: 'YouTube',
    platform: 'youtube',
    kind: 'post',
    actor: 'streamers/youtube-scraper',
    description: 'Videos de canales (URL) o búsquedas: vistas, likes y comentarios.',
    placeholder: 'entrevista candidata, https://www.youtube.com/@canal',
    accepts: (t) => !isUrl(t) || urlOn(t, 'youtube.com', 'youtu.be'),
    input: ({ targets, limit, days }) => ({
      searchQueries: targets.filter((t) => !isUrl(t) && !isHandle(t)),
      startUrls: [...targets.filter(isUrl), ...targets.filter(isHandle).map((h) => `https://www.youtube.com/@${bare(h)}`)].map((url) => ({ url })),
      maxResults: limit,
      ...(days ? { dateFilter: days <= 1 ? 'today' : days <= 7 ? 'week' : days <= 31 ? 'month' : 'year' } : {}),
      maxResultsShorts: 0,
      maxResultStreams: 0,
    }),
    normalize: (raw, fallback) => {
      const title = text(at(raw, 'title'));
      const body = text(at(raw, 'text'), at(raw, 'description')) ?? '';
      return [item('youtube', 'post', 'youtube', {
        id: idOf(raw, fallback, 'id', 'url'),
        url: text(at(raw, 'url')),
        title,
        text: body || (title ?? ''),
        author: text(at(raw, 'channelName')),
        authorFollowers: maybeCount(at(raw, 'numberOfSubscribers')),
        publishedAt: when(at(raw, 'date'), at(raw, 'uploadDate')),
        likes: count(at(raw, 'likes')),
        comments: count(at(raw, 'commentsCount')),
        views: count(at(raw, 'viewCount')),
        hashtags: hashtags(`${title ?? ''} ${body}`, at(raw, 'hashtags')),
      })];
    },
  },
  google: {
    key: 'google',
    label: 'Google',
    platform: 'google',
    kind: 'result',
    actor: 'apify/google-search-scraper',
    description: 'Resultados orgánicos por búsqueda: qué sitios y en qué posición aparecen al buscar al candidato.',
    placeholder: 'nombre del candidato, candidato + propuesta',
    accepts: (t) => !isUrl(t),
    input: ({ targets, limit, country, language }) => ({
      queries: targets.map(bare).join('\n'),
      // Google serves 10 results a page; more results means more pages.
      resultsPerPage: 10,
      maxPagesPerQuery: Math.min(10, Math.ceil(limit / 10)),
      countryCode: country,
      languageCode: language,
      mobileResults: false,
      saveHtml: false,
    }),
    normalize: (raw, fallback) => {
      const query = text(at(raw, 'searchQuery', 'term'));
      return list(at(raw, 'organicResults')).map((result, i) => {
        const url = text(at(result, 'url'));
        return item('google', 'result', 'google', {
          id: `${query ?? fallback}#${url ?? i}`,
          url,
          title: text(at(result, 'title')),
          text: text(at(result, 'description')) ?? '',
          outlet: host(url),
          publishedAt: when(at(result, 'date')),
          query,
          position: count(at(result, 'position')) || i + 1,
        });
      });
    },
  },
  news: {
    key: 'news',
    label: 'Noticias',
    platform: 'news',
    kind: 'article',
    actor: 'lhotanova/google-news-scraper',
    description: 'Notas de prensa en Google Noticias: qué medios publican sobre el candidato y cuándo.',
    placeholder: 'nombre del candidato, partido + tema',
    accepts: (t) => !isUrl(t),
    // Only the fields every Google News actor shares; a language enum it does not know would reject the run.
    input: ({ targets, limit }) => ({
      query: targets.map(bare).join(' OR '),
      maxItems: limit,
    }),
    normalize: (raw, fallback) => {
      const url = text(at(raw, 'link'), at(raw, 'url'));
      const title = text(at(raw, 'title'));
      return [item('news', 'article', 'news', {
        id: idOf(raw, fallback, 'guid', 'link', 'url', 'title'),
        url,
        title,
        text: text(at(raw, 'description'), at(raw, 'snippet')) ?? title ?? '',
        outlet: text(at(raw, 'source', 'title'), at(raw, 'source', 'name'), at(raw, 'source'), at(raw, 'publisher'), host(url)),
        publishedAt: when(at(raw, 'publishedAt'), at(raw, 'pubDate'), at(raw, 'date'), at(raw, 'published')),
        query: text(at(raw, 'query'), at(raw, 'searchQuery')),
      })];
    },
  },
};

/** Every source in the order the app lists them. */
export const SOURCE_LIST: Source[] = SOURCE_KEYS.map((key) => SOURCES[key]);

/** A dataset as items, each actor's quirks left behind; `scope` (the run id) keeps id-less items of two runs apart. */
export function normalizeItems(source: SourceKey, raw: unknown[], scope = ''): ScrapedItem[] {
  const seen = new Set<string>();
  return raw.flatMap((r, i) => SOURCES[source].normalize(r, `${scope}#${i}`)).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

/** Likes, comments and shares: what a post earned beyond being seen. */
export const interactions = (i: Pick<ScrapedItem, 'likes' | 'comments' | 'shares'>) => i.likes + i.comments + i.shares;
