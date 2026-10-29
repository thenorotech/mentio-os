/** Small formatting helpers shared by the pages. */

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

export const PLATFORM_NAMES: Record<string, string> = {
  x: 'X',
  reddit: 'Reddit',
  hackernews: 'Hacker News',
  github: 'GitHub',
  bluesky: 'Bluesky',
  linkedin: 'LinkedIn',
  stackoverflow: 'Stack Overflow',
  devto: 'DEV',
  youtube: 'YouTube',
  news: 'Noticias',
  tiktok: 'TikTok',
  instagram: 'Instagram',
  appstore: 'App Store',
  googleplay: 'Google Play',
  trustpilot: 'Trustpilot',
  googlemaps: 'Google Maps',
};

export const platformName = (id: string) => PLATFORM_NAMES[id] ?? id;

/** Platforms a keyword is searched on (the review platforms are connected as apps instead). */
export const SEARCH_PLATFORMS = ['x', 'reddit', 'hackernews', 'github', 'bluesky', 'linkedin', 'stackoverflow', 'devto', 'youtube', 'news', 'tiktok', 'instagram'] as const;
export const REVIEW_PLATFORMS = ['appstore', 'googleplay', 'trustpilot', 'googlemaps'] as const;

export const INTENTS = ['buy_intent', 'question', 'complaint', 'praise', 'comparison', 'churn_intent', 'bug_report', 'pricing', 'hiring', 'event', 'promotional'] as const;
export const SENTIMENTS = ['positive', 'neutral', 'negative'] as const;

export function date(iso: string | null | undefined, timeZone?: string) {
  const d = iso ? new Date(iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone }).format(d);
}

const TAG_NAMES: Record<string, string> = {
  buy_intent: 'Intención de compra',
  question: 'Pregunta',
  complaint: 'Queja',
  praise: 'Elogio',
  comparison: 'Comparación',
  churn_intent: 'Intención de abandono',
  bug_report: 'Reporte de error',
  pricing: 'Precios',
  hiring: 'Contratación',
  event: 'Evento',
  promotional: 'Promoción',
  brand: 'Candidato',
  competitor: 'Adversario',
  topic: 'Tema',
};

/** Etiquetas en español para intenciones, candidatos, adversarios y temas. */
export const tagName = (tag: string) => TAG_NAMES[tag] ?? tag.replace(/_/g, ' ');

export function compact(n: number | null | undefined) {
  if (n === null || n === undefined) return '0';
  return new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso || Number.isNaN(new Date(iso).getTime())) return '';
  return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: es });
}

/** Una fecha de calendario, con formato para México; puede ser fecha o ISO completo. */
export function day(iso: string | null | undefined) {
  const d = iso ? new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso) : null;
  if (!d || Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeZone: 'UTC' }).format(d);
}
