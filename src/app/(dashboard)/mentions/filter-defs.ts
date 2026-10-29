/**
 * The mention conditions as filter chips, named like GET /v1/mentions's
 * parameters: the feed's toolbar (in the URL) and the view editor (in a form)
 * both render these. A plain module, so server pages can build them.
 */
import type { FilterDef, FilterOption } from '@/components/url-filters';
import { INTENTS, PLATFORM_NAMES, SENTIMENTS, tagName } from '@/lib/format';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';


export function mentionFilterDefs(
  keywords: FilterOption[],
  groups: FilterOption[],
  /** `window`: the feed's date chip (a view holds no window); `person`/`alert`: shown when a link set them. */
  extra: { window?: boolean; person?: boolean; alert?: boolean } = {},
): FilterDef[] {
  return [
    ...(keywords.length ? [{ param: 'keywordIds', notParam: 'notKeywordIds', label: 'Término monitoreado', icon: 'tag', kind: 'multi', options: keywords } as const] : []),
    { param: 'keywordKinds', label: 'Tipo de término', icon: 'tags', kind: 'multi', options: ['brand', 'competitor', 'topic'].map((k) => ({ value: k, label: ({ brand: 'Candidato', competitor: 'Adversario', topic: 'Tema' })[k as 'brand' | 'competitor' | 'topic'] })) },
    ...(groups.length ? [{ param: 'groupIds', label: 'Campaña', icon: 'folder', kind: 'multi', options: groups } as const] : []),
    { param: 'platforms', notParam: 'notPlatforms', label: 'Canal', icon: 'platform', kind: 'multi', options: Object.entries(PLATFORM_NAMES).map(([value, label]) => ({ value, label, platform: value })) },
    { param: 'sentiments', notParam: 'notSentiments', label: 'Sentimiento', icon: 'smile', kind: 'multi', options: SENTIMENTS.map((s) => ({ value: s, label: ({ positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' })[s], dot: SENTIMENT_COLORS[s] })) },
    { param: 'intents', notParam: 'notIntents', label: 'Intención', icon: 'target', kind: 'multi', options: INTENTS.map((i) => ({ value: i, label: ({ buy_intent: 'Intención de apoyo', question: 'Pregunta', complaint: 'Queja', praise: 'Reconocimiento', comparison: 'Comparación', churn_intent: 'Intención de cambio', bug_report: 'Reporte de error', pricing: 'Costo', hiring: 'Contratación', event: 'Evento', promotional: 'Promoción' } as Record<string, string>)[i] ?? tagName(i) })) },
    { param: 'status', label: 'Estado', icon: 'status', kind: 'single', options: [{ value: 'open', label: 'Abierto' }, { value: 'done', label: 'Resuelto' }, { value: 'ignored', label: 'Ignorado' }] },
    { param: 'relevant', label: 'Relevancia', icon: 'sparkles', kind: 'single', options: [{ value: 'true', label: 'Relevante' }, { value: 'false', label: 'No relevante' }] },
    { param: 'minRelevance', label: 'Relevancia mínima', icon: 'gauge', kind: 'text', placeholder: '0 a 100', operator: '≥' },
    { param: 'minConfidence', label: 'Confianza mínima', icon: 'gauge', kind: 'text', placeholder: '0.6', operator: '≥' },
    { param: 'isReply', label: 'Tipo', icon: 'reply', kind: 'single', options: [{ value: 'false', label: 'Publicaciones' }, { value: 'true', label: 'Respuestas' }] },
    { param: 'automated', label: 'Automatización', icon: 'bot', kind: 'single', options: [{ value: 'false', label: 'Cuenta humana' }, { value: 'true', label: 'Automatizada' }] },
    { param: 'ratings', label: 'Calificación', icon: 'star', kind: 'multi', options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: '★'.repeat(n) })) },
    { param: 'minFollowers', label: 'Seguidores mínimos', icon: 'users', kind: 'text', placeholder: '1000', operator: '≥' },
    { param: 'maxFollowers', label: 'Seguidores máximos', icon: 'users', kind: 'text', placeholder: '100000', operator: '≤' },
    { param: 'languages', label: 'Idioma', icon: 'languages', kind: 'text', placeholder: 'es, en' },
    { param: 'linkHosts', label: 'Enlaces a', icon: 'link', kind: 'text', placeholder: 'campana.mx, ejemplo.mx' },
    ...(extra.window ? [{ param: 'since', label: 'Fecha de publicación', icon: 'calendar', kind: 'dates' } as const] : []),
    ...(extra.person ? [{ param: 'personId', label: 'Autor', icon: 'user', kind: 'fixed', value: 'Una persona' } as const] : []),
    ...(extra.alert ? [{ param: 'alertId', label: 'Regla de alerta', icon: 'bell', kind: 'fixed', value: 'Contenido que envía la regla' } as const] : []),
  ];
}
