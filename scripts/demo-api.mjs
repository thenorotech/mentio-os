#!/usr/bin/env node
/**
 * A fake Mentio API for trying the dashboard without a key: it reads the
 * real OpenAPI document (https://api.mentio.dev/v1/openapi.json) and answers
 * every operation with invented data shaped exactly like the real response.
 * Writes answer like the real API (201 with a resource, 204 on delete) but
 * change nothing. Used by `npm run demo`; never point production at it.
 *
 *   node scripts/demo-api.mjs [port]      default 4010; also accepts DEMO_PORT or PORT
 *   DEMO_API_LOG=1 prints every write it receives
 */
import http from 'node:http';
import { handleApify } from './demo-apify.mjs';

const PORT = Number(process.argv[2] ?? process.env.DEMO_API_PORT ?? process.env.DEMO_PORT ?? process.env.PORT ?? 4010);
const SPEC_URL = process.env.MENTIO_OPENAPI_URL ?? 'https://api.mentio.dev/v1/openapi.json';

const spec = await (await fetch(SPEC_URL)).json();
const schemas = spec.components?.schemas ?? {};

// ---- Deterministic sample values -------------------------------------------------

let seed = 7;
/** The query of the request being answered, for values that depend on it. */
let query = new URLSearchParams();
const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const pickOne = (list) => list[Math.floor(rand() * list.length)];

const TEXTS = [
  'Estamos comparando las propuestas de Ana Torres y Luis Méndez antes de decidir el voto.',
  'La campaña publicó su plan de movilidad; falta explicar cómo se medirá el avance.',
  '¿Dónde puedo consultar el presupuesto y el calendario completo de la propuesta?',
  'Hoy hubo foro vecinal y participaron las tres candidaturas de la contienda.',
  'La respuesta sobre seguridad no aclaró quién dará seguimiento a los compromisos.',
  'Me gustó que presentara metas y fechas; así la ciudadanía puede pedir cuentas.',
];
const NAMES = ['Ana Torres', 'María Fernanda Soto', 'Jorge Ramírez', 'Elena Cruz', 'Sofía Mercado', 'Diego Luna', 'Lucía Montes', 'Rafael Ortega'];
const TERMS = ['Ana Torres', 'Luis Méndez', 'Seguridad', 'Transporte'];
const hoursAgo = (h) => new Date(Date.now() - h * 3600e3).toISOString();
const ID_PREFIX = { mention: 'mm', keyword: 'kw', person: 'per', alert: 'feed', channel: 'dst', group: 'grp', view: 'vw', segment: 'seg', key: 'key', member: 'mem', invitation: 'inv', activity: 'act', invoice: 'inv' };

function stringFor(name, schema, path) {
  // A breakdown row's key is the thing it counts, per the `by` it was asked for.
  if (name === 'key' || (name === 'label' && /analytics/.test(path))) {
    const keys = {
      intent: ['buy_intent', 'question', 'praise', 'comparison', 'bug_report', 'complaint', 'pricing'],
      sentiment: ['positive', 'neutral', 'negative'],
      status: ['open', 'done', 'ignored'],
      language: ['en', 'es', 'de', 'fr', 'pt'],
      keyword: TERMS,
      person: NAMES,
      hour: Array.from({ length: 24 }, (_, h) => String(h)),
    };
    return pickOne(keys[query.get('by')] ?? ['reddit', 'x', 'hackernews', 'github', 'youtube', 'linkedin']);
  }
  if (schema.format === 'date-time' || /At$/.test(name) || name === 'from' || name === 'to') return hoursAgo(Math.floor(rand() * 200));
  if (schema.format === 'uri' || /url$|^website$/i.test(name)) return name === 'avatarUrl' ? null : 'https://example.com';
  if (schema.format === 'email' || /email/i.test(name)) return pickOne(['ana@campanatorres.mx', 'fernanda@campanatorres.mx', 'jorge@campanatorres.mx']);
  if (name === 'id') {
    // The nearest owner in the path: `.keyword.id` is a keyword's, `/v1/groups` a group's.
    const tokens = path.toLowerCase().split(/[./]/).reverse();
    const owner = tokens.map((t) => Object.keys(ID_PREFIX).find((k) => t === k || t === `${k}s` || t === k.replace(/y$/, 'ies'))).find(Boolean) ?? 'mention';
    return `${ID_PREFIX[owner]}_${Math.floor(rand() * 1e6).toString(36)}`;
  }
  if (/id$/i.test(name)) return `id_${Math.floor(rand() * 1e6).toString(36)}`;
  if (name === 'text' || name === 'body' || name === 'response') return pickOne(TEXTS);
  if (name === 'note') return 'A buyer comparing you with an incumbent; worth a reply today.';
  if (name === 'term') return pickOne(TERMS);
  // Named things read like what a team would call them, by the resource they belong to.
  const NAMED = [
    [/segments/, ['Unhappy power users', 'Buyers this month', 'Competitor fans', 'Developers on GitHub']],
    [/views/, ['Buying intent', 'Negative on X', 'Bug reports', 'Questions to answer']],
    [/alerts/, ['Críticas sobre transporte', 'Preguntas de seguridad', 'Resumen de prensa', 'Menciones de candidaturas']],
    [/groups/, ['Campaña Ana Torres', 'Equipo de comunicación', 'Contienda local']],
  ];
  const named = NAMED.find(([re]) => re.test(path.split('.')[0]))?.[1];
  if (name === 'name' && named && !/\.(author|person|member|owner|keyword|group)\./.test(path)) return pickOne(named);
  if (name === 'description' && named) return pickOne(['Worth a reply this week.', 'For the weekly review.', '']);
  if (/^(not)?[iI]ntents$/.test(name)) return pickOne(['buy_intent', 'question', 'complaint', 'bug_report', 'comparison', 'praise']);
  if (name === 'name' || name === 'author') return pickOne(NAMES);
  if (name === 'handle') return `@${pickOne(NAMES).toLowerCase().replace(/[^a-z]/g, '')}`;
  if (name === 'title') return pickOne(['Propuesta de transporte', 'Debate entre candidaturas', 'Resumen de prensa']);
  if (name === 'context') return 'Conversación pública sobre la campaña política de Ana Torres.';
  if (name === 'currency') return 'USD';
  if (name === 'label') return pickOne(['#brand-alerts', 'Ops webhook', 'Team inbox']);
  if (name === 'secret') return 'whsec_demo_xxxxxxxxxxxxxxxx';
  if (name === 'key' && /api-keys/.test(path)) return 'mk_live_demo_xxxxxxxxxxxxxxxx';
  if (name === 'prefix') return 'mk_live_demo';
  if (name === 'language') return 'en';
  if (name === 'country') return 'us';
  if (name === 'timezone') return 'UTC';
  if (/day|date/i.test(name)) return new Date(Date.now() - Math.floor(rand() * 30) * 864e5).toISOString().slice(0, 10);
  return pickOne(['Ana Torres', 'Campaña Ana Torres', 'Contienda local']);
}

function numberFor(name, schema) {
  const lo = schema.minimum ?? 0;
  const hi = Math.min(schema.maximum ?? 5000, lo + 5000);
  if (/relevance|priority/i.test(name)) return 40 + Math.floor(rand() * 60);
  // share is a percentage (45.7); confidence and rates are fractions.
  if (name === 'share') return Math.round(rand() * 1000) / 10;
  if (/confidence|rate/i.test(name)) return Math.round(rand() * 100) / 100;
  if (/cents/i.test(name)) return Math.floor(rand() * 6000);
  if (/rating/i.test(name)) return 1 + Math.floor(rand() * 5);
  if (/followers|views|reach/i.test(name)) return Math.floor(rand() * 90000);
  const n = lo + rand() * (hi - lo);
  return schema.type === 'integer' ? Math.floor(n % 400) : Math.round(n * 100) / 100;
}

function sample(schema, name = '', path = '', depth = 0) {
  if (!schema || depth > 8) return null;
  if (schema.$ref) return sample(schemas[schema.$ref.split('/').pop()], name, path, depth + 1);
  for (const key of ['anyOf', 'oneOf']) {
    if (schema[key]) {
      const options = schema[key].filter((s) => s.type !== 'null');
      return options.length ? sample(pickOne(options), name, path, depth + 1) : null;
    }
  }
  if (schema.allOf) return Object.assign({}, ...schema.allOf.map((s) => sample(s, name, path, depth + 1)));
  if (schema.enum) return pickOne(schema.enum.filter((v) => v !== null));
  if ('const' in schema) return schema.const;
  const type = Array.isArray(schema.type) ? schema.type.find((t) => t !== 'null') : schema.type;
  switch (type) {
    case 'object': {
      const out = {};
      // A saved filter (a view's, a segment's, an alert rule's) sets a couple
      // of conditions, never all twenty: optional fields in one stay mostly unset.
      const sparse = /filter$/i.test(path);
      const required = new Set(schema.required ?? []);
      for (const [key, value] of Object.entries(schema.properties ?? {})) {
        if (sparse && !required.has(key) && rand() > 0.12) continue;
        out[key] = sample(value, key, `${path}.${key}`, depth + 1);
      }
      if (!schema.properties && schema.additionalProperties) out.demo = sample(schema.additionalProperties, 'demo', path, depth + 1);
      return out;
    }
    case 'array': {
      // A chart's points: one per day of a 30-day window, in order, with a gentle trend.
      if (name === 'points') {
        const start = Date.now() - 29 * 864e5;
        return Array.from({ length: 30 }, (_, i) => {
          const point = sample(schema.items, 'point', path, depth + 1) ?? {};
          const wave = 1 + 0.35 * Math.sin(i / 3) + i / 60;
          for (const key of Object.keys(point)) if (typeof point[key] === 'number') point[key] = Math.round((point[key] % 60) * wave) + 2;
          point.date = new Date(start + i * 864e5).toISOString().slice(0, 10);
          return point;
        });
      }
      const count = schema.maxItems ?? (depth <= 1 ? 8 : 2);
      return Array.from({ length: Math.min(count, depth <= 1 ? 8 : 2) }, () => sample(schema.items, name, path, depth + 1));
    }
    case 'string':
      return stringFor(name, schema, path);
    case 'integer':
    case 'number':
      return numberFor(name, schema);
    case 'boolean':
      // Flags that mean "something went wrong" stay mostly off, like real data.
      if (/^(failed|uncertain|automated|stopped|lowBalance|muted|paused.*)$/.test(name)) return rand() > 0.9;
      return rand() > 0.4;
    default:
      return null;
  }
}

// ---- Political campaign fixture -------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const CAMPAIGN = {
  id: 'grp_campaign_ana_torres',
  name: 'Campaña Ana Torres',
  externalId: 'campana-ana-torres',
  isDefault: true,
  context: 'Campaña política mexicana de Ana Torres; seguir conversación electoral y propuestas, no menciones de homónimos.',
};
const POLITICAL_PLATFORMS = ['x', 'tiktok', 'youtube', 'news', 'instagram', 'reddit'];
const KEYWORDS = [
  { id: 'kw_ana_torres', term: 'Ana Torres', kind: 'brand', context: 'Candidata de esta campaña política mexicana.' },
  { id: 'kw_luis_mendez', term: 'Luis Méndez', kind: 'competitor', context: 'Candidato adversario en la contienda.' },
  { id: 'kw_carla_ruiz', term: 'Carla Ruiz', kind: 'competitor', context: 'Candidata adversaria en la contienda.' },
  { id: 'kw_seguridad', term: 'Seguridad', kind: 'topic', context: 'Propuestas y conversación pública sobre seguridad.' },
  { id: 'kw_economia', term: 'Economía', kind: 'topic', context: 'Propuestas y conversación pública sobre economía.' },
  { id: 'kw_transporte', term: 'Transporte', kind: 'topic', context: 'Movilidad y transporte público en la contienda.' },
  { id: 'kw_salud', term: 'Salud', kind: 'topic', context: 'Propuestas y conversación pública sobre salud.' },
  { id: 'kw_agua', term: 'Agua', kind: 'topic', context: 'Propuestas y conversación pública sobre abasto de agua.' },
];
const TOPICS = KEYWORDS.filter((keyword) => keyword.kind === 'topic');
const TOPIC_FOR_CANDIDATE = {
  kw_ana_torres: 'kw_transporte',
  kw_luis_mendez: 'kw_seguridad',
  kw_carla_ruiz: 'kw_economia',
};
const AUTHORS = [
  { id: 'aut_diario_centro', name: 'Diario del Centro', handle: '@diariodelcentro', platform: 'news', followers: 214000, stance: 'neutral', tags: ['medio', 'neutral'] },
  { id: 'aut_punto_civico', name: 'Punto Cívico', handle: '@puntocivico', platform: 'youtube', followers: 136000, stance: 'neutral', tags: ['medio', 'neutral'] },
  { id: 'aut_mesa_publica', name: 'Mesa Pública', handle: '@mesapublica', platform: 'youtube', followers: 86400, stance: 'neutral', tags: ['medio', 'neutral'] },
  { id: 'aut_noticias_ahora', name: 'Noticias Ahora', handle: '@noticiasahora', platform: 'news', followers: 308000, stance: 'neutral', tags: ['medio', 'neutral'] },
  { id: 'aut_elena_cruz', name: 'Elena Cruz', handle: '@elenacruzmx', platform: 'x', followers: 18200, stance: 'neutral', tags: ['periodista', 'neutral'] },
  { id: 'aut_javier_ortega', name: 'Javier Ortega', handle: '@jortegamx', platform: 'x', followers: 8400, stance: 'neutral', tags: ['periodista', 'neutral'] },
  { id: 'aut_mateo_solis', name: 'Mateo Solís', handle: '@mateosolis', platform: 'x', followers: 15600, stance: 'neutral', tags: ['periodista', 'neutral'] },
  { id: 'aut_lucia_montes', name: 'Lucía Montes', handle: '@luciamontes', platform: 'news', followers: 7900, stance: 'neutral', tags: ['periodista', 'neutral'] },
  { id: 'aut_renata_vargas', name: 'Renata Vargas', handle: '@renatavargas', platform: 'tiktok', followers: 94500, stance: 'defensor', tags: ['lider_de_opinion', 'defensor'] },
  { id: 'aut_michelle_rios', name: 'Michelle Ríos', handle: '@michelle.rios', platform: 'tiktok', followers: 48200, stance: 'critico', tags: ['lider_de_opinion', 'critico'] },
  { id: 'aut_mariana_leon', name: 'Mariana León', handle: '@marianaleon', platform: 'youtube', followers: 27200, stance: 'defensor', tags: ['analista', 'defensor'] },
  { id: 'aut_diego_ortiz', name: 'Diego Ortiz', handle: '@diegoortizmx', platform: 'youtube', followers: 11800, stance: 'critico', tags: ['analista', 'critico'] },
  { id: 'aut_campana_ana_x', name: 'Campaña Ana Torres', handle: '@AnaTorresMX', platform: 'x', followers: 421000, stance: 'defensor', tags: ['campaña', 'defensor'] },
  { id: 'aut_equipo_ana_ig', name: 'Equipo Ana Torres', handle: '@equipoanatorres', platform: 'instagram', followers: 67200, stance: 'defensor', tags: ['campaña', 'defensor'] },
  { id: 'aut_campana_luis_x', name: 'Campaña Luis Méndez', handle: '@LuisMendezMX', platform: 'x', followers: 289000, stance: 'critico', tags: ['campaña', 'critico'] },
  { id: 'aut_equipo_carla_tt', name: 'Equipo Carla Ruiz', handle: '@carlaruizoficial', platform: 'tiktok', followers: 113000, stance: 'critico', tags: ['campaña', 'critico'] },
  { id: 'aut_paola_navarro', name: 'Paola Navarro', handle: '@paolanavarro', platform: 'x', followers: 3200, stance: 'neutral', tags: ['ciudadania', 'neutral'] },
  { id: 'aut_raul_cervantes', name: 'Raúl Cervantes', handle: '@raulcervantes', platform: 'tiktok', followers: 22100, stance: 'critico', tags: ['ciudadania', 'critico'] },
  { id: 'aut_karla_vega', name: 'Karla Vega', handle: '@karlavegamx', platform: 'tiktok', followers: 70500, stance: 'defensor', tags: ['ciudadania', 'defensor'] },
  { id: 'aut_fernanda_rios', name: 'Fernanda Ríos', handle: '@fer.rios', platform: 'instagram', followers: 9300, stance: 'defensor', tags: ['ciudadania', 'defensor'] },
  { id: 'aut_carlos_arias', name: 'Carlos Arias', handle: '@carlosarias', platform: 'instagram', followers: 17100, stance: 'critico', tags: ['ciudadania', 'critico'] },
  { id: 'aut_voz_vecinal', name: 'Voz Vecinal', handle: '@vozvecinal', platform: 'instagram', followers: 28400, stance: 'neutral', tags: ['comunidad', 'neutral'] },
  { id: 'aut_ruta_publica', name: 'Ruta Pública', handle: 'u/ruta_publica', platform: 'reddit', followers: null, stance: 'neutral', tags: ['ciudadania', 'neutral'] },
  { id: 'aut_girasol_88', name: 'Girasol del Barrio', handle: 'u/girasol_88', platform: 'reddit', followers: null, stance: 'defensor', tags: ['ciudadania', 'defensor'] },
  { id: 'aut_cdmx_llector', name: 'Lector del Barrio', handle: 'u/llector_del_barrio', platform: 'reddit', followers: null, stance: 'critico', tags: ['ciudadania', 'critico'] },
  { id: 'aut_civica_azul', name: 'Cívica Azul', handle: 'u/civica_azul', platform: 'reddit', followers: null, stance: 'neutral', tags: ['ciudadania', 'neutral'] },
];

const MESSAGES = {
  positive: [
    'Me gustó que explicara la propuesta con costos y fechas; así sí se puede comparar.',
    'La respuesta fue concreta y tomó en cuenta lo que pidió la gente del barrio.',
    'Bien por presentar una meta medible y publicar cómo van a rendir cuentas.',
    'No coincido en todo, pero esta idea sí atiende un problema que lleva años.',
  ],
  neutral: [
    '¿Dónde puedo revisar el documento completo y el calendario de la propuesta?',
    'Hoy hubo foro; comparto los puntos que presentó cada candidatura.',
    'Estoy comparando las propuestas antes de decidir mi voto.',
    'La campaña publicó una actualización y falta ver cómo se implementaría.',
  ],
  negative: [
    'La explicación no responde quién va a pagar ni cuándo se vería el primer resultado.',
    'Otra promesa sin plazos claros; la gente necesita respuestas y seguimiento.',
    'La propuesta suena bien en el templete, pero no explica cómo resolvería el problema diario.',
    'No me convence que cambien de postura sin aclarar qué pasó con el plan anterior.',
  ],
};
const INTENTS = {
  positive: [['praise'], ['praise', 'buy_intent'], ['testimonial'], ['praise', 'industry_insight']],
  neutral: [['question'], ['comparison'], ['question', 'buy_intent'], ['industry_insight']],
  negative: [['complaint'], ['complaint', 'question'], ['churn_intent'], ['feedback', 'complaint']],
};
const STANCE_SENTIMENT = { defensor: 'positive', critico: 'negative', neutral: 'neutral' };

function sentimentForAuthor(author) {
  return STANCE_SENTIMENT[author.stance] ?? 'neutral';
}

function hash(value) {
  let result = 2166136261;
  for (const character of value) result = Math.imul(result ^ character.charCodeAt(0), 16777619);
  return result >>> 0;
}

function dayString(offset = 0, base = new Date()) {
  const date = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate()) + offset * DAY_MS);
  return date.toISOString().slice(0, 10);
}

function dateForMention(day, index) {
  if (day === dayString(0)) return new Date(Date.now() - ((index * 17) % 180) * 60_000).toISOString();
  return new Date(`${day}T${String(9 + (index * 3) % 12).padStart(2, '0')}:${String((index * 17) % 60).padStart(2, '0')}:00.000Z`).toISOString();
}

function authorUrl(author) {
  const handle = author.handle.replace(/^@/, '').replace(/^u\//, '');
  const paths = {
    x: `https://x.com/${handle}`,
    tiktok: `https://www.tiktok.com/@${handle}`,
    youtube: `https://www.youtube.com/@${handle}`,
    news: `https://diariodelcentro.mx/autores/${handle}`,
    instagram: `https://www.instagram.com/${handle}`,
    reddit: `https://www.reddit.com/user/${handle}`,
  };
  return paths[author.platform];
}

function postUrl(platform, author, suffix) {
  const handle = author.handle.replace(/^@/, '').replace(/^u\//, '');
  const paths = {
    x: `https://x.com/${handle}/status/${suffix}`,
    tiktok: `https://www.tiktok.com/@${handle}/video/${suffix}`,
    youtube: `https://www.youtube.com/watch?v=${suffix}`,
    news: `https://diariodelcentro.mx/politica/${suffix}`,
    instagram: `https://www.instagram.com/p/${suffix}`,
    reddit: `https://www.reddit.com/r/MexicoPolitico/comments/${suffix}/`,
  };
  return paths[platform];
}

function campaignKeyword(keyword) {
  return {
    id: keyword.id,
    term: keyword.term,
    kind: keyword.kind,
    group: { id: CAMPAIGN.id, name: CAMPAIGN.name, externalId: CAMPAIGN.externalId, isDefault: true },
  };
}

let mentionSequence = 0;
function makeMention({ keyword, day, index, sentiment, author, text, sharedPostId }) {
  const id = `mm_campaign_${String(++mentionSequence).padStart(5, '0')}`;
  const publishedAt = dateForMention(day, index);
  const topic = TOPICS[(index + hash(keyword.id)) % TOPICS.length];
  const body = text ?? `${keyword.kind === 'topic' ? `${keyword.term}: ` : `${keyword.term} habló sobre ${topic.term.toLowerCase()}: `}${MESSAGES[sentiment][index % MESSAGES[sentiment].length]}`;
  const intentSet = INTENTS[sentiment][(index + hash(keyword.id)) % INTENTS[sentiment].length];
  const postId = sharedPostId ?? hash(`${keyword.id}|${day}|${index}|${author.id}`).toString(36);
  const relevance = sentiment === 'negative' && day === dayString(-3) ? 62 + (index % 30) : 48 + ((index * 11) % 51);
  const status = index % 9 === 0 ? 'done' : index % 13 === 0 ? 'ignored' : 'open';
  return {
    id,
    status,
    relevant: relevance >= 40,
    delivered: true,
    priority: Math.round((relevance / 2 + (author.followers ? Math.log10(author.followers) * 7 : 8)) * 10) / 10,
    keyword: {
      id: keyword.id,
      term: keyword.term,
      group: { id: CAMPAIGN.id, name: CAMPAIGN.name, externalId: CAMPAIGN.externalId, isDefault: true },
      matchedAs: 'phrase',
      matchedIn: 'text',
    },
    post: {
      platform: author.platform,
      kind: 'post',
      url: postUrl(author.platform, author, postId),
      text: body,
      title: author.platform === 'news' || author.platform === 'youtube' || author.platform === 'reddit' ? `${keyword.term}: voces de la contienda` : null,
      imageUrl: null,
      subreddit: author.platform === 'reddit' ? 'MexicoPolitico' : null,
      flair: author.platform === 'reddit' ? 'Debate' : null,
      repository: null,
      links: [],
      publishedAt,
      engagement: author.platform === 'news' ? null : {
        likes: index * 9 + 3,
        reposts: index + 1,
        replies: index % 12,
        quotes: author.platform === 'x' ? index % 5 : null,
        views: author.followers ? author.followers * 3 + index * 31 : null,
        bookmarks: author.platform === 'x' ? index % 9 : null,
      },
      replyTo: null,
    },
    parentMentionId: null,
    author: {
      id: author.id,
      name: author.name,
      handle: author.handle,
      url: authorUrl(author),
      avatarUrl: null,
      followers: author.followers,
      tags: author.tags,
    },
    review: null,
    classification: {
      relevance,
      sentiment,
      intents: intentSet,
      automated: false,
      language: 'es',
      country: null,
      organization: author.tags.includes('medio'),
      confidence: 0.72 + (index % 25) / 100,
      uncertain: false,
      note: sentiment === 'negative' ? 'Señala una preocupación o una crítica a la propuesta.' : sentiment === 'positive' ? 'Reconoce un aspecto favorable de la propuesta.' : 'Pide información o compara posturas sin tomar partido.',
      failed: false,
      feedback: null,
    },
    triage: { assignee: null, snoozedUntil: null, note: null },
    duplicateOf: null,
    duplicates: [],
    stats: { comments: author.platform === 'youtube' || author.platform === 'reddit' ? index % 16 : 0 },
    createdAt: publishedAt,
  };
}

function makeCampaignMentions() {
  const rows = [];
  const today = new Date();
  for (let age = 179; age >= 0; age--) {
    const day = dayString(-age, today);
    for (const [keywordIndex, keyword] of KEYWORDS.entries()) {
      const keyHash = hash(`${keyword.id}|${day}`);
      const count = 1 + (keyHash % 3);
      for (let index = 0; index < count; index++) {
        const author = AUTHORS[(age * 5 + keywordIndex * 3 + index) % AUTHORS.length];
        rows.push(makeMention({ keyword, day, index, sentiment: sentimentForAuthor(author), author }));
      }
    }
  }

  // One same-day public transit failure matches both Ana and the agenda topic.
  // Its sharp rise in negative posts puts the simulated crisis exactly three days back.
  const crisisDay = dayString(-3, today);
  const ana = KEYWORDS.find((keyword) => keyword.id === 'kw_ana_torres');
  const transport = KEYWORDS.find((keyword) => keyword.id === 'kw_transporte');
  const criticalAuthors = AUTHORS.filter((author) => author.stance === 'critico');
  for (let index = 0; index < 20; index++) {
    const author = criticalAuthors[index % criticalAuthors.length];
    const sharedPostId = `crisis_transporte_${crisisDay.replaceAll('-', '')}_${index}`;
    const text = `Otra vez hay retrasos en el transporte público. Ana Torres prometió revisar la ruta, pero hoy varias personas reportan largas esperas y falta una explicación clara.`;
    for (const keyword of [ana, transport]) {
      rows.push(makeMention({ keyword, day: crisisDay, index: index + 40, sentiment: sentimentForAuthor(author), author, text, sharedPostId }));
    }
  }
  return rows.sort((a, b) => a.post.publishedAt.localeCompare(b.post.publishedAt));
}

const CAMPAIGN_MENTIONS = makeCampaignMentions();
const TODAY = dayString(0);

function queryValues(url, name) {
  return url.searchParams.getAll(name).flatMap((value) => value.split(',')).map((value) => value.trim()).filter(Boolean);
}

function queryFilterSet(url, ...names) {
  return new Set(names.flatMap((name) => queryValues(url, name)));
}

function parseDay(value, fallback) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '') ? value : fallback;
}

function addDays(day, count) {
  return dayString(count, new Date(`${day}T00:00:00.000Z`));
}

function getWindow(url) {
  const requestedDays = Number(url.searchParams.get('range')?.replace(/d$/, '')) || 30;
  const days = [7, 30, 90, 365].includes(requestedDays) ? requestedDays : 30;
  const to = parseDay(url.searchParams.get('to'), TODAY);
  const from = parseDay(url.searchParams.get('from'), addDays(to, 1 - days));
  const actualDays = Math.max(1, Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1);
  return { from, to, days: actualDays, timezone: url.searchParams.get('timezone') || 'UTC' };
}

function selectedMentions(url, window = null) {
  const keywordIds = queryFilterSet(url, 'keywordIds', 'keywordId');
  const groups = queryFilterSet(url, 'groupIds', 'groupId');
  const platforms = queryFilterSet(url, 'platforms', 'platform');
  const sentiments = queryFilterSet(url, 'sentiments', 'sentiment');
  const intents = queryFilterSet(url, 'intents', 'intent');
  const from = window?.from ?? parseDay(url.searchParams.get('since'), '0000-01-01');
  const to = window?.to ?? parseDay(url.searchParams.get('until'), TODAY);
  const sinceTime = url.searchParams.get('since');
  const untilTime = url.searchParams.get('until');
  const search = (url.searchParams.get('q') ?? '').toLocaleLowerCase('es-MX');

  return CAMPAIGN_MENTIONS.filter((mention) => {
    if (keywordIds.size && !keywordIds.has(mention.keyword.id)) return false;
    if (groups.size && !groups.has(CAMPAIGN.id)) return false;
    if (platforms.size && !platforms.has(mention.post.platform)) return false;
    if (sentiments.size && !sentiments.has(mention.classification.sentiment)) return false;
    if (intents.size && !mention.classification.intents.some((intent) => intents.has(intent))) return false;
    if (window && (mention.post.publishedAt.slice(0, 10) < from || mention.post.publishedAt.slice(0, 10) > to)) return false;
    if (!window && (mention.post.publishedAt.slice(0, 10) < from || mention.post.publishedAt.slice(0, 10) > to)) return false;
    if (sinceTime && sinceTime.includes('T') && mention.post.publishedAt < sinceTime) return false;
    if (untilTime && untilTime.includes('T') && mention.post.publishedAt > untilTime) return false;
    if (url.searchParams.get('status') && mention.status !== url.searchParams.get('status')) return false;
    if (url.searchParams.get('relevant') === 'true' && !mention.relevant) return false;
    if (url.searchParams.get('relevant') === 'false' && mention.relevant) return false;
    if (url.searchParams.get('personId') && mention.author.id !== url.searchParams.get('personId')) return false;
    if (search && !`${mention.post.text} ${mention.author.name} ${mention.keyword.term}`.toLocaleLowerCase('es-MX').includes(search)) return false;
    return true;
  });
}

function sentimentTotals(rows) {
  const totals = { positive: 0, neutral: 0, negative: 0, unclassified: 0 };
  for (const row of rows) {
    const sentiment = row.classification.sentiment ?? 'unclassified';
    if (sentiment in totals) totals[sentiment]++;
  }
  return totals;
}

function summarize(rows) {
  const sentiments = sentimentTotals(rows);
  const done = rows.filter((row) => row.status === 'done').length;
  const relevant = rows.filter((row) => row.relevant).length;
  const people = new Map(rows.filter((row) => row.author?.id).map((row) => [row.author.id, row.author]));
  const knownFollowers = [...people.values()].filter((person) => Number.isFinite(person.followers));
  const doneTimes = rows.filter((row) => row.status === 'done').map((row) => Date.now() - Date.parse(row.createdAt)).sort((a, b) => a - b);
  const middle = Math.floor(doneTimes.length / 2);
  const medianTimeToDoneMs = doneTimes.length ? doneTimes.length % 2 ? doneTimes[middle] : Math.round((doneTimes[middle - 1] + doneTimes[middle]) / 2) : null;
  return {
    matched: rows.length,
    relevant,
    posts: new Set(rows.map((row) => row.post.url)).size,
    people: people.size,
    sentiment: sentiments,
    buyIntent: rows.filter((row) => row.classification.intents.includes('buy_intent')).length,
    questions: rows.filter((row) => row.classification.intents.includes('question')).length,
    reach: {
      followers: knownFollowers.reduce((total, person) => total + person.followers, 0),
      people: knownFollowers.length,
    },
    triage: {
      open: rows.filter((row) => row.status === 'open').length,
      ignored: rows.filter((row) => row.status === 'ignored').length,
      done,
      waiting: rows.filter((row) => row.status === 'open' && row.relevant && Date.now() - Date.parse(row.createdAt) > DAY_MS).length,
      handledRate: relevant ? Math.round((done / relevant) * 10000) / 10000 : null,
      medianTimeToDoneMs,
    },
  };
}

function summaryResponse(url) {
  const window = getWindow(url);
  const rows = selectedMentions(url, window);
  const summary = summarize(rows);
  const response = {
    window,
    ...summary,
    previous: null,
  };
  if (url.searchParams.get('compare') === 'true') {
    const previousWindow = { ...window, from: addDays(window.from, -window.days), to: addDays(window.from, -1) };
    const previous = summarize(selectedMentions(url, previousWindow));
    response.previous = Object.fromEntries(Object.entries(previous).filter(([key]) => key !== 'window'));
  }
  return response;
}

function bucketFor(day, bucket) {
  if (bucket === 'hour') return `${day.slice(0, 13)}:00`;
  if (bucket === 'month') return `${day.slice(0, 7)}-01`;
  if (bucket === 'week') {
    const date = new Date(`${day}T00:00:00.000Z`);
    const weekday = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() - weekday + 1);
    return date.toISOString().slice(0, 10);
  }
  return day.slice(0, 10);
}

function bucketLabels(window, bucket) {
  const labels = new Set();
  if (bucket === 'hour') {
    const start = Date.parse(`${window.from}T00:00:00.000Z`);
    const end = Date.parse(`${window.to}T23:00:00.000Z`);
    for (let instant = start; instant <= end; instant += 60 * 60 * 1000) labels.add(new Date(instant).toISOString().slice(0, 13) + ':00');
  } else {
    for (let day = window.from; day <= window.to; day = addDays(day, 1)) labels.add(bucketFor(day, bucket));
  }
  return [...labels];
}

function seriesPoint(rows, date) {
  const sentiment = sentimentTotals(rows);
  return {
    date,
    matched: rows.length,
    relevant: rows.filter((row) => row.relevant).length,
    positive: sentiment.positive,
    neutral: sentiment.neutral,
    negative: sentiment.negative,
    unclassified: sentiment.unclassified,
  };
}

function seriesResponse(url) {
  const window = getWindow(url);
  const requestedBucket = url.searchParams.get('bucket');
  const bucket = ['hour', 'day', 'week', 'month'].includes(requestedBucket)
    ? requestedBucket
    : window.days <= 90 ? 'day' : 'week';
  const dimension = url.searchParams.get('by');
  const buildData = (targetWindow) => {
    const rows = selectedMentions(url, targetWindow);
    const keywordFilter = queryFilterSet(url, 'keywordIds', 'keywordId');
    let dimensions;
    if (dimension === 'keyword') {
      dimensions = KEYWORDS.filter((keyword) => !keywordFilter.size || keywordFilter.has(keyword.id))
        .map((keyword) => ({ key: keyword.id, label: keyword.term, keyword: campaignKeyword(keyword) }));
    } else if (dimension === 'platform') {
      dimensions = POLITICAL_PLATFORMS.filter((platform) => !queryFilterSet(url, 'platforms', 'platform').size || queryFilterSet(url, 'platforms', 'platform').has(platform))
        .map((platform) => ({ key: platform, label: platform, keyword: null }));
    } else if (dimension === 'sentiment') {
      dimensions = ['positive', 'neutral', 'negative', 'unclassified'].map((value) => ({ key: value, label: value, keyword: null }));
    } else {
      dimensions = [{ key: 'total', label: 'Total', keyword: null }];
    }
    const labels = bucketLabels(targetWindow, bucket);
    return dimensions.map((series) => {
      const selected = rows.filter((row) => {
        if (dimension === 'keyword') return row.keyword.id === series.key;
        if (dimension === 'platform') return row.post.platform === series.key;
        if (dimension === 'sentiment') return (row.classification.sentiment ?? 'unclassified') === series.key;
        return true;
      });
      const grouped = new Map();
      for (const row of selected) {
        const key = bucketFor(row.post.publishedAt, bucket);
        grouped.set(key, [...(grouped.get(key) ?? []), row]);
      }
      return {
        key: series.key,
        label: series.label,
        keyword: series.keyword,
        points: labels.map((date) => seriesPoint(grouped.get(date) ?? [], date)),
      };
    });
  };

  const response = { window: { ...window, bucket }, data: buildData(window), previous: null };
  if (url.searchParams.get('compare') === 'true') {
    const previousWindow = { ...window, from: addDays(window.from, -window.days), to: addDays(window.from, -1) };
    response.previous = buildData(previousWindow);
  }
  return response;
}

function breakdownRows(rows, dimension, denominator) {
  const groups = new Map();
  const add = (key, label, row, extra = {}) => {
    if (!groups.has(key)) groups.set(key, { key, label, rows: [], ...extra });
    groups.get(key).rows.push(row);
  };
  for (const row of rows) {
    if (dimension === 'keyword') add(row.keyword.id, row.keyword.term, row, { keyword: campaignKeyword(KEYWORDS.find((keyword) => keyword.id === row.keyword.id)) });
    else if (dimension === 'platform') add(row.post.platform, row.post.platform, row);
    else if (dimension === 'sentiment') add(row.classification.sentiment ?? 'unclassified', row.classification.sentiment ?? 'unclassified', row);
    else if (dimension === 'intent') for (const intent of row.classification.intents) add(intent, intent, row);
    else if (dimension === 'status') add(row.status, row.status, row);
    else if (dimension === 'hour') {
      const date = new Date(row.post.publishedAt);
      const slot = { weekday: date.getUTCDay(), hour: date.getUTCHours() };
      const key = `${slot.weekday}-${slot.hour}`;
      add(key, key, row, { slot });
    } else if (dimension === 'person') {
      const author = row.author;
      add(author.id, author.name ?? author.handle ?? author.id, row, {
        person: { id: author.id, name: author.name, platform: row.post.platform, url: author.url, avatarUrl: author.avatarUrl, followers: author.followers },
      });
    } else if (dimension === 'language') {
      const key = row.classification.language ?? 'unknown';
      add(key, key, row);
    } else if (dimension === 'country') {
      const key = row.classification.country ?? 'unknown';
      add(key, key, row);
    } else if (dimension === 'subreddit' && row.post.platform === 'reddit') {
      const key = (row.post.subreddit ?? 'unknown').toLocaleLowerCase('en');
      add(key, row.post.subreddit ?? 'unknown', row);
    }
  }
  return [...groups.values()].map((group) => ({
    key: group.key,
    label: group.label,
    keyword: group.keyword ?? null,
    person: group.person ?? null,
    slot: group.slot ?? null,
    matched: group.rows.length,
    relevant: group.rows.filter((row) => row.relevant).length,
    share: denominator ? Math.round((group.rows.length / denominator) * 1000) / 10 : 0,
    sentiment: sentimentTotals(group.rows),
    previous: null,
  })).sort((a, b) => b.matched - a.matched || a.label.localeCompare(b.label, 'es-MX'));
}

function analyticsBreakdownResponse(url) {
  const window = getWindow(url);
  const dimension = url.searchParams.get('by') ?? 'keyword';
  const rows = selectedMentions(url, window);
  const data = breakdownRows(rows, dimension, rows.length);
  if (url.searchParams.get('compare') === 'true') {
    const previousWindow = { ...window, from: addDays(window.from, -window.days), to: addDays(window.from, -1) };
    const previousRows = selectedMentions(url, previousWindow);
    const previous = new Map(breakdownRows(previousRows, dimension, previousRows.length).map((row) => [row.key, row]));
    for (const row of data) row.previous = { matched: previous.get(row.key)?.matched ?? 0, relevant: previous.get(row.key)?.relevant ?? 0 };
  }
  return { window, by: dimension, data };
}

function shareOfVoiceResponse(url) {
  const window = getWindow(url);
  const selected = selectedMentions(url, window);
  const keywordFilter = queryFilterSet(url, 'keywordIds', 'keywordId');
  const keywords = KEYWORDS.filter((keyword) => !keywordFilter.size || keywordFilter.has(keyword.id));
  const candidateTotal = selected.filter((row) => row.keyword.kind === 'brand' || row.keyword.kind === 'competitor').length;
  const compare = url.searchParams.get('compare') === 'true';
  let previousRows = [];
  if (compare) {
    const previousWindow = { ...window, from: addDays(window.from, -window.days), to: addDays(window.from, -1) };
    previousRows = selectedMentions(url, previousWindow);
  }
  return {
    window,
    data: keywords.map((keyword) => {
      const matches = selected.filter((row) => row.keyword.id === keyword.id);
      const previousMatches = previousRows.filter((row) => row.keyword.id === keyword.id);
      const matched = matches.length;
      return {
        keyword: campaignKeyword(keyword),
        matched,
        relevant: matches.filter((row) => row.relevant).length,
        negative: matches.filter((row) => row.classification.sentiment === 'negative').length,
        buyIntent: matches.filter((row) => row.classification.intents.includes('buy_intent')).length,
        share: keyword.kind === 'topic' || candidateTotal === 0 ? null : Math.round((matched / candidateTotal) * 1000) / 10,
        previous: compare ? { matched: previousMatches.length } : null,
      };
    }),
  };
}

function campaignGroupResponse() {
  return {
    id: CAMPAIGN.id,
    name: CAMPAIGN.name,
    externalId: CAMPAIGN.externalId,
    isDefault: true,
    context: CAMPAIGN.context,
    stats: { keywords: KEYWORDS.length, active: KEYWORDS.length },
    createdAt: new Date(Date.now() - 180 * DAY_MS).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function campaignKeywordResponse(keyword) {
  const template = sample(schemas.Keyword, '', '/v1/keywords.data');
  const allMatches = CAMPAIGN_MENTIONS.filter((row) => row.keyword.id === keyword.id);
  const last7d = allMatches.filter((row) => row.post.publishedAt.slice(0, 10) >= addDays(TODAY, -6)).length;
  const thisMonth = allMatches.filter((row) => row.post.publishedAt.slice(0, 7) === TODAY.slice(0, 7)).length;
  template.id = keyword.id;
  template.term = keyword.term;
  template.kind = keyword.kind;
  template.muted = false;
  template.pausedForBalance = false;
  template.pausedForNoise = false;
  template.pausedForCap = false;
  template.group = { id: CAMPAIGN.id, name: CAMPAIGN.name, externalId: CAMPAIGN.externalId, isDefault: true };
  template.platforms = [...POLITICAL_PLATFORMS];
  template.context = keyword.context;
  template.stats = {
    ...template.stats,
    mentions: allMatches.length,
    relevant: allMatches.filter((row) => row.relevant).length,
    last7d,
    thisMonth,
    lastMentionAt: allMatches.at(-1)?.post.publishedAt ?? null,
  };
  template.createdAt = new Date(Date.now() - 180 * DAY_MS).toISOString();
  return template;
}

function keywordsResponse(url) {
  const terms = queryFilterSet(url, 'kind');
  const groupIds = queryFilterSet(url, 'groupId');
  const platforms = queryFilterSet(url, 'platform');
  const search = (url.searchParams.get('q') ?? '').toLocaleLowerCase('es-MX');
  const matching = KEYWORDS.filter((keyword) => {
    if (terms.size && !terms.has(keyword.kind)) return false;
    if (groupIds.size && !groupIds.has(CAMPAIGN.id)) return false;
    if (platforms.size && ![...platforms].some((platform) => POLITICAL_PLATFORMS.includes(platform))) return false;
    if (search && !`${keyword.term} ${keyword.context}`.toLocaleLowerCase('es-MX').includes(search)) return false;
    return true;
  });
  const offset = Number(url.searchParams.get('offset')) || 0;
  const requestedLimit = Number(url.searchParams.get('limit')) || matching.length;
  return matching.slice(offset, offset + requestedLimit).map(campaignKeywordResponse);
}

function personResponse(personMatches) {
  const first = personMatches[0];
  const author = first.author;
  const sentiment = sentimentTotals(personMatches);
  const timestamps = personMatches.map((row) => row.post.publishedAt).sort();
  return {
    id: author.id,
    platform: first.post.platform,
    name: author.name,
    handle: author.handle,
    url: author.url,
    avatarUrl: null,
    accounts: [{ id: author.id, platform: first.post.platform, name: author.name, handle: author.handle, url: author.url }],
    reach: { followers: author.followers, following: null, posts: null },
    profile: null,
    stats: {
      mentions: personMatches.length,
      relevant: personMatches.filter((row) => row.relevant).length,
      sentiment: { positive: sentiment.positive, neutral: sentiment.neutral, negative: sentiment.negative },
      firstSeenAt: timestamps[0],
      lastSeenAt: timestamps.at(-1),
    },
    annotations: { tags: author.tags, notes: '', muted: false },
    outreach: { owner: null, stage: 'not_contacted', lastContactedAt: null },
  };
}

function getPersonResponse(url) {
  const id = decodeURIComponent(url.pathname.split('/').at(-1) ?? '');
  const matches = CAMPAIGN_MENTIONS.filter((row) => row.author.id === id);
  return matches.length ? personResponse(matches) : null;
}

function membersResponse() {
  return {
    data: [
      { id: 'mem_ana_torres', userId: 'usr_ana_torres', email: 'ana@campanatorres.mx', name: 'Ana Torres', role: 'owner', joinedAt: new Date(Date.now() - 180 * DAY_MS).toISOString() },
      { id: 'mem_fernanda_soto', userId: 'usr_fernanda_soto', email: 'fernanda@campanatorres.mx', name: 'María Fernanda Soto', role: 'admin', joinedAt: new Date(Date.now() - 120 * DAY_MS).toISOString() },
      { id: 'mem_jorge_ramirez', userId: 'usr_jorge_ramirez', email: 'jorge@campanatorres.mx', name: 'Jorge Ramírez', role: 'member', joinedAt: new Date(Date.now() - 80 * DAY_MS).toISOString() },
    ],
  };
}

function personRowsResponse(url) {
  const rows = selectedMentions(url);
  const byPerson = new Map();
  for (const row of rows) {
    const personRows = byPerson.get(row.author.id) ?? [];
    personRows.push(row);
    byPerson.set(row.author.id, personRows);
  }
  const platforms = queryFilterSet(url, 'platforms', 'platform');
  const keywordKinds = queryFilterSet(url, 'keywordKinds');
  const tags = queryFilterSet(url, 'tags', 'tag');
  const intents = queryFilterSet(url, 'intents');
  const query = (url.searchParams.get('q') ?? '').toLocaleLowerCase('es-MX');
  const handle = (url.searchParams.get('handle') ?? '').toLocaleLowerCase('es-MX');
  const minFollowers = Number(url.searchParams.get('minFollowers')) || 0;
  const maxFollowers = Number(url.searchParams.get('maxFollowers')) || Number.POSITIVE_INFINITY;
  const minMentions = Number(url.searchParams.get('minMentions')) || 0;
  const minNegative = Number(url.searchParams.get('minNegative')) || 0;
  let people = [...byPerson.values()].map((personMatches) => ({
    ...personResponse(personMatches),
    _authors: personMatches[0].author,
    _matches: personMatches,
  })).filter((person) => {
    const personMatches = person._matches;
    if (platforms.size && !platforms.has(person.platform)) return false;
    if (keywordKinds.size && !personMatches.some((row) => keywordKinds.has(row.keyword.kind))) return false;
    if (tags.size && ![...tags].some((tag) => person.annotations.tags.includes(tag))) return false;
    if (query && !`${person.name} ${person.handle}`.toLocaleLowerCase('es-MX').includes(query)) return false;
    if (handle && !person.handle.toLocaleLowerCase('es-MX').includes(handle)) return false;
    if ((person.reach.followers ?? 0) < minFollowers || (person.reach.followers ?? 0) > maxFollowers) return false;
    if (person.stats.mentions < minMentions || person.stats.sentiment.negative < minNegative) return false;
    if (intents.size && !personMatches.some((row) => row.classification.intents.some((intent) => intents.has(intent)))) return false;
    if (url.searchParams.get('muted') === 'true' && !person.annotations.muted) return false;
    if (url.searchParams.get('muted') === 'false' && person.annotations.muted) return false;
    return true;
  });
  const sort = url.searchParams.get('sort') ?? 'mentions';
  people.sort((a, b) => {
    if (sort === 'recent') return b.stats.lastSeenAt.localeCompare(a.stats.lastSeenAt);
    if (sort === 'reach') return (b.reach.followers ?? 0) - (a.reach.followers ?? 0);
    if (sort === 'new') return b.stats.firstSeenAt.localeCompare(a.stats.firstSeenAt);
    return b.stats.mentions - a.stats.mentions || a.name.localeCompare(b.name, 'es-MX');
  });
  const total = people.length;
  const offset = Number(url.searchParams.get('offset')) || 0;
  const limit = Number(url.searchParams.get('limit')) || 50;
  people = people.slice(offset, offset + limit).map(({ _authors, _matches, ...person }) => person);
  return { data: people, total };
}

function mentionsResponse(url) {
  let rows = selectedMentions(url);
  const sort = url.searchParams.get('sort') ?? 'newest';
  rows = [...rows].sort((a, b) => sort === 'priority'
    ? b.priority - a.priority || b.post.publishedAt.localeCompare(a.post.publishedAt)
    : sort === 'oldest'
      ? a.post.publishedAt.localeCompare(b.post.publishedAt)
      : b.post.publishedAt.localeCompare(a.post.publishedAt));
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 50, 1), 500);
  const cursor = url.searchParams.get('cursor');
  const offset = cursor === 'demo_page_2' ? limit : 0;
  const data = rows.slice(offset, offset + limit);
  const nextCursor = offset + limit < rows.length && !cursor ? 'demo_page_2' : null;
  return { data, nextCursor };
}

// ---- Routing -------------------------------------------------------------------

const routes = [];
for (const [path, ops] of Object.entries(spec.paths)) {
  const pattern = new RegExp(`^${path.replace(/\{[^}]+\}/g, '[^/]+')}$`);
  for (const [method, op] of Object.entries(ops)) routes.push({ method: method.toUpperCase(), pattern, path, op });
}
// Literal paths win over templated ones: /mentions/export.csv before /mentions/{id}.
routes.sort((a, b) => (a.path.match(/\{/g) ?? []).length - (b.path.match(/\{/g) ?? []).length);

function respond(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'content-type': type });
  res.end(body === undefined ? '' : type === 'application/json' ? JSON.stringify(body) : body);
}

const LOG = Boolean(process.env.DEMO_API_LOG);

http
  .createServer(async (req, res) => {
    const url = new URL(req.url ?? '/', 'http://demo');
    if (await handleApify(req, res, url)) return;
    if (LOG && req.method !== 'GET') {
      let body = '';
      for await (const chunk of req) body += chunk;
      console.log(`${req.method} ${url.pathname}${url.search} ${body}`);
    }
    const route = routes.find((r) => r.method === req.method && r.pattern.test(url.pathname));
    if (!route) return respond(res, 404, { error: { code: 'not_found', message: `No ${req.method} ${url.pathname}` } });
    seed = [...url.pathname].reduce((a, c) => a + c.charCodeAt(0), 7);
    query = url.searchParams;
    const responses = route.op.responses ?? {};
    const status = Object.keys(responses).find((code) => code.startsWith('2')) ?? '200';
    if (status === '204') return respond(res, 204);
    const content = responses[status]?.content ?? {};
    if (content['text/csv']) return respond(res, 200, 'id,platform,text\nmm_1,reddit,"Ana Torres propone mejorar el transporte público"\n', 'text/csv');
    let body = sample(content['application/json']?.schema, '', route.path);
    if (req.method === 'GET') {
      switch (route.op.operationId) {
        case 'listGroups':
          body = { data: [campaignGroupResponse()] };
          break;
        case 'listKeywords':
          body = { ...body, data: keywordsResponse(url) };
          break;
        case 'searchMentions':
          body = mentionsResponse(url);
          break;
        case 'listPeople':
          body = personRowsResponse(url);
          break;
        case 'getPerson':
          body = getPersonResponse(url);
          if (!body) return respond(res, 404, { error: { code: 'not_found', message: 'No mention by this person for your workspace' } });
          break;
        case 'listMembers':
          body = membersResponse();
          break;
        case 'getShareOfVoice':
          body = shareOfVoiceResponse(url);
          break;
        case 'getAnalyticsSummary':
          body = summaryResponse(url);
          break;
        case 'getAnalyticsSeries':
          body = seriesResponse(url);
          break;
        case 'getAnalyticsBreakdown':
          body = analyticsBreakdownResponse(url);
          break;
      }
    }
    // Lists end after one page, so "older" links do not loop forever.
    if (body && typeof body === 'object' && 'nextCursor' in body) body.nextCursor = url.searchParams.get('cursor') ? null : 'demo_page_2';
    respond(res, Number(status), body);
  })
  .listen(PORT, () => console.log(`Demo Mentio API on http://localhost:${PORT} (${routes.length} operations)`));
