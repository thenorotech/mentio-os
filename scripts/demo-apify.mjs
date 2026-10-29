/**
 * A fake Apify API for `npm run demo`, under /apify/v2 on the demo server:
 * a few finished runs per actor with invented posts, articles and search
 * results in each actor's own output shape, and new runs that finish a few
 * seconds after they start. Enough to see the "Redes y web" pages work.
 */

const HANDLES = ['anatorres', 'luismendez', 'noticias_cdmx', 'vecinos_unidos', 'jovenes_x_ana', 'analista_mx', 'colectivo_agua', 'radio_ciudad'];
const TOPICS = ['seguridad', 'transporte', 'agua', 'empleo', 'debate', 'salud'];
const LINES = [
  'Ana Torres presentó su plan de #seguridad con más policías de proximidad en las colonias',
  'Luis Méndez critica la propuesta de transporte: “no hay presupuesto” #debate',
  'Vecinos piden que el plan de agua llegue primero a las colonias del oriente #agua',
  'Encuesta: el empleo juvenil es la principal preocupación de la ciudad #empleo',
  'Ana Torres recorre mercados y escucha a comerciantes sobre seguridad y empleo',
  'Debate de candidatos: transporte, salud y agua dominaron la conversación #debate',
  '¿Quién tiene el mejor plan de salud? Comparamos propuestas de Ana Torres y Luis Méndez #salud',
  'La propuesta de transporte de Ana Torres incluye nuevas rutas nocturnas #transporte',
];
const OUTLETS = ['El Universal', 'Milenio', 'Reforma', 'Animal Político', 'Excélsior', 'La Jornada', 'El Financiero'];
const DOMAINS = ['anatorres.mx', 'es.wikipedia.org', 'eluniversal.com.mx', 'milenio.com', 'facebook.com', 'x.com', 'animalpolitico.com', 'youtube.com'];

const ACTORS = {
  'apify~instagram-scraper': 'instagram',
  'apify~facebook-posts-scraper': 'facebook',
  'apidojo~tweet-scraper': 'x',
  'clockworks~tiktok-scraper': 'tiktok',
  'streamers~youtube-scraper': 'youtube',
  'apify~google-search-scraper': 'google',
  'lhotanova~google-news-scraper': 'news',
};

let seed = 42;
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pick = (list) => list[Math.floor(rand() * list.length)];
const int = (max) => Math.floor(rand() * max);
const at = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600e3).toISOString();

function items(source, count, runIndex) {
  seed = 7 + runIndex * 31 + source.length;
  return Array.from({ length: count }, (_, i) => {
    const text = pick(LINES);
    const handle = pick(HANDLES);
    const when = at(int(24 * 14) + runIndex * 3);
    const reach = handle === 'anatorres' || handle === 'luismendez' ? 8 : 1;
    const likes = int(900 * reach);
    switch (source) {
      case 'instagram':
        return { id: `ig${runIndex}${i}`, shortCode: `C${runIndex}${i}`, url: `https://www.instagram.com/p/C${runIndex}${i}/`, caption: text, ownerUsername: handle, timestamp: when, likesCount: likes, commentsCount: int(likes / 8), videoPlayCount: rand() > 0.5 ? likes * (10 + int(20)) : undefined, hashtags: [pick(TOPICS)] };
      case 'facebook':
        return { postId: `fb${runIndex}${i}`, url: `https://www.facebook.com/${handle}/posts/${runIndex}${i}`, text, pageName: handle, time: when, likes, comments: int(likes / 6), shares: int(likes / 10), viewsCount: likes * 15 };
      case 'x':
        return { id: `${runIndex}${i}17000`, url: `https://x.com/${handle}/status/${runIndex}${i}17000`, text, createdAt: new Date(when).toUTCString(), author: { userName: handle, name: handle, followers: 1000 * reach + int(50000) }, likeCount: likes, replyCount: int(likes / 5), retweetCount: int(likes / 4), quoteCount: int(likes / 20), viewCount: likes * (20 + int(30)) };
      case 'tiktok':
        return { id: `tt${runIndex}${i}`, text, createTimeISO: when, webVideoUrl: `https://www.tiktok.com/@${handle}/video/${runIndex}${i}`, authorMeta: { name: handle, fans: 5000 * reach + int(80000) }, diggCount: likes * 3, commentCount: int(likes / 3), shareCount: int(likes / 2), playCount: likes * 60, hashtags: [{ name: pick(TOPICS) }] };
      case 'youtube':
        return { id: `yt${runIndex}${i}`, title: text.replace(/#\S+/g, '').trim(), url: `https://www.youtube.com/watch?v=yt${runIndex}${i}`, channelName: pick(['Ana Torres', 'Radio Ciudad', 'Debate MX', 'Analista MX']), numberOfSubscribers: 12000 + int(200000), date: when, viewCount: likes * 40, likes, commentsCount: int(likes / 7), text };
      case 'news': {
        const outlet = pick(OUTLETS);
        return { title: text.replace(/#\S+/g, '').trim(), link: `https://noticias.example/${runIndex}-${i}`, source: outlet, publishedAt: when, description: text };
      }
      default:
        return null;
    }
  }).filter(Boolean);
}

function serp(input, runIndex) {
  seed = 99 + runIndex;
  const terms = String(input?.queries ?? 'Ana Torres').split('\n').filter(Boolean);
  return terms.map((term) => ({
    searchQuery: { term },
    organicResults: Array.from({ length: 10 }, (_, i) => {
      const domain = i === 0 && rand() > 0.3 ? 'anatorres.mx' : pick(DOMAINS);
      return { position: i + 1, title: `${term}: ${pick(['propuestas', 'biografía', 'noticias', 'entrevista', 'debate'])} | ${domain}`, url: `https://${domain}/${encodeURIComponent(term)}-${i}`, description: pick(LINES).replace(/#\S+/g, '') };
    }),
  }));
}

/** Runs by id; the seeded ones look finished, new ones finish 6 s after they start. */
const runs = new Map();
const datasets = new Map();

function addRun(actor, input, { hoursAgo = 0, running = false, runIndex = 0 } = {}) {
  const source = ACTORS[actor];
  const id = `run_${source}_${runs.size + 1}`;
  const data = source === 'google' ? serp(input, runIndex) : items(source, Math.min(input?.resultsLimit ?? input?.maxItems ?? input?.resultsPerPage ?? input?.maxResults ?? 40, 60), runIndex);
  datasets.set(id, data);
  const startedAt = at(hoursAgo);
  runs.set(id, { id, actId: actor, startedAt, input, running, readyAt: Date.now() + 6000, items: data.length, finishedAt: running ? null : at(hoursAgo - 0.05) });
  return runs.get(id);
}

for (const [actor, source] of Object.entries(ACTORS)) {
  const input = source === 'google' ? { queries: 'Ana Torres\nAna Torres propuestas\nLuis Méndez' } : { searchTerms: ['Ana Torres', '#seguridad'], resultsLimit: 40 };
  for (let r = 0; r < 3; r++) addRun(actor, input, { hoursAgo: 6 + r * 30, runIndex: r });
}

function view(run) {
  if (run.running && Date.now() >= run.readyAt) {
    run.running = false;
    run.finishedAt = new Date().toISOString();
  }
  return {
    id: run.id,
    actId: run.actId,
    status: run.aborted ? 'ABORTED' : run.running ? 'RUNNING' : 'SUCCEEDED',
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    defaultDatasetId: run.id,
    defaultKeyValueStoreId: run.id,
    stats: { datasetItemCount: run.running ? 0 : run.items },
    usageTotalUsd: run.running ? 0 : Number((run.items * 0.0023).toFixed(4)),
  };
}

const json = (res, status, body) => {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
};

/** Handles /apify/v2/...; returns false for any other path. */
export async function handleApify(req, res, url) {
  const match = url.pathname.match(/^\/apify\/v2(\/.*)$/);
  if (!match) return false;
  const path = match[1];
  let m;
  if ((m = path.match(/^\/acts\/([^/]+)$/)) && ACTORS[decodeURIComponent(m[1])]) return json(res, 200, { data: { id: decodeURIComponent(m[1]) } }), true;
  if ((m = path.match(/^\/acts\/([^/]+)\/runs$/))) {
    const actor = decodeURIComponent(m[1]);
    if (!ACTORS[actor]) return json(res, 404, { error: { type: 'record-not-found' } }), true;
    if (req.method === 'POST') {
      let body = '';
      for await (const chunk of req) body += chunk;
      return json(res, 201, { data: view(addRun(actor, JSON.parse(body || '{}'), { running: true, runIndex: runs.size })) }), true;
    }
    const status = url.searchParams.get('status');
    const list = [...runs.values()].filter((r) => r.actId === actor).map(view).filter((r) => !status || r.status === status).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    return json(res, 200, { data: { items: list.slice(0, Number(url.searchParams.get('limit') ?? 20)), total: list.length } }), true;
  }
  if ((m = path.match(/^\/actor-runs\/([^/]+)(\/abort)?$/))) {
    const run = runs.get(decodeURIComponent(m[1]));
    if (!run) return json(res, 404, { error: { type: 'record-not-found' } }), true;
    if (m[2]) {
      run.aborted = run.running;
      run.running = false;
      run.finishedAt = new Date().toISOString();
    }
    return json(res, 200, { data: view(run) }), true;
  }
  if ((m = path.match(/^\/key-value-stores\/([^/]+)\/records\/INPUT$/))) return json(res, 200, runs.get(decodeURIComponent(m[1]))?.input ?? {}), true;
  if ((m = path.match(/^\/datasets\/([^/]+)$/))) {
    const run = runs.get(decodeURIComponent(m[1]));
    return json(res, run ? 200 : 404, run ? { data: { id: run.id, itemCount: run.running ? 0 : run.items } } : { error: { type: 'record-not-found' } }), true;
  }
  if ((m = path.match(/^\/datasets\/([^/]+)\/items$/))) {
    const run = runs.get(decodeURIComponent(m[1]));
    return json(res, 200, run && !run.running ? datasets.get(run.id) ?? [] : []), true;
  }
  return json(res, 404, { error: { type: 'page-not-found' } }), true;
}
