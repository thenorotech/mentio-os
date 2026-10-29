/**
 * The few facts a summary quotes from scrape metrics (the home card, the
 * executive report): the leading network, the best hour, a one-line reading
 * in plain Spanish. Pure, like metrics.ts.
 */
import { compact } from '@/lib/format';
import type { ScrapeMetrics } from './metrics';
import { SOURCES, isSourceKey } from './sources';

export const platformLabel = (platform: string) => (isSourceKey(platform) ? SOURCES[platform].label : platform);

/** Interactions over views as a percent, `s/d` when no post reported views. */
export const rateLabel = (rate: number | null) => (rate === null ? 's/d' : `${(rate * 100).toFixed(rate < 0.1 ? 2 : 1)}%`);

export const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** The hour whose posts drew the most interactions on average, or null with no dated posts. */
export function bestHour(hours: ScrapeMetrics['hours']): number | null {
  let best: number | null = null;
  for (let i = 0; i < hours.length; i += 1) {
    if (hours[i].posts && (best === null || hours[i].avgInteractions > hours[best].avgInteractions)) best = i;
  }
  return best;
}

/** One sentence on what the scrapes say: which network drives the interaction and when, or else the press, or else Google. */
export function socialTakeaway(m: ScrapeMetrics): string {
  const t = m.totals;
  const lead = m.platforms[0];
  if (t.posts && lead && t.interactions > 0) {
    const share = Math.round((lead.interactions / t.interactions) * 100);
    const network = m.platforms.length > 1
      ? `${platformLabel(lead.platform)} genera el ${share}% de las interacciones en redes`
      : `Todas las interacciones recolectadas vienen de ${platformLabel(lead.platform)}`;
    const hour = bestHour(m.hours);
    return hour === null
      ? `${network} (${compact(lead.interactions)} de ${compact(t.interactions)}).`
      : `${network} y lo publicado cerca de las ${hourLabel(hour)} es lo que más responde la audiencia.`;
  }
  if (t.posts) return `Se recolectaron ${compact(t.posts)} publicaciones, aún sin interacciones registradas.`;
  const outlet = m.outlets[0];
  if (t.articles && outlet) return `${outlet.label} es el medio que más publica: ${compact(outlet.value)} de ${compact(t.articles)} notas.`;
  const domain = m.domains[0];
  if (t.results && domain) return `${domain.domain} es el sitio que más aparece en Google: ${domain.results} resultados, mejor posición #${domain.bestPosition}.`;
  return 'Las recolecciones aún no traen publicaciones, notas ni resultados.';
}
