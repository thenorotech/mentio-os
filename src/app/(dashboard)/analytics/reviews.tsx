import type { ReviewsReport } from '@mentio-dev/sdk';
import { FileText, MessageCircleWarning } from 'lucide-react';
import { BarList, Card, KpiStrip, SectionHeading, Stat, Table, td, TableCell, TableRow } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { compact, platformName, tagName } from '@/lib/format';
import { AnalyticsEmpty, Delta, Sparkline } from './charts';
import { mentionsHref, type WindowQuery } from './window';

const REVIEW_PLATFORMS = 'appstore,googleplay,trustpilot,googlemaps';
const STARS = [5, 4, 3, 2, 1] as const;
const stars = (n: number | null) => (n === null ? '—' : `${n.toFixed(1)} ★`);

/** Ratings, per review page, and what the 1 and 2 star reviews are about. */
export function Reviews({ report, query }: { report: ReviewsReport; query: WindowQuery }) {
  const { totals, previous } = report;
  const link = (extra: Record<string, string>) => mentionsHref(report.window, query, { platforms: query.platforms?.join(',') || REVIEW_PLATFORMS, ...extra });
  const ratedReviews = STARS.reduce((sum, star) => sum + totals.distribution[star], 0);

  return (
    <div className="flex flex-col gap-6">
      <KpiStrip label="Indicadores de reseñas">
        <Stat label={<span className="inline-flex items-center gap-1">Reseñas <InfoTip term="menciones" /></span>} value={compact(totals.reviews)} hint={<Delta current={totals.reviews} previous={previous?.reviews} />} href={link({})} />
        <Stat
          label={<span className="inline-flex items-center gap-1">Calificación promedio <InfoTip text="Promedio de estrellas que recibieron las reseñas durante el periodo." /></span>}
          value={stars(totals.averageRating)}
          hint={previous?.averageRating != null && totals.averageRating !== null ? `${previous.averageRating.toFixed(1)} ★ en el periodo anterior` : undefined}
        />
        <Stat label={<span className="inline-flex items-center gap-1">Con respuesta <InfoTip text="Reseñas a las que el equipo ya respondió." /></span>} value={compact(totals.responded)} hint={totals.reviews ? `${Math.round((totals.responded / totals.reviews) * 100)}% de las reseñas` : undefined} />
        <Stat
          label={<span className="inline-flex items-center gap-1">Abiertas con 1 o 2 estrellas <InfoTip text="Reseñas con calificación baja que siguen sin resolver ni ignorar." /></span>}
          value={compact(totals.openNegative)}
          tone={totals.openNegative > 0 ? 'negative' : undefined}
          hint="Sin resolver ni ignorar"
          href={link({ ratings: '1,2', status: 'open' })}
        />
      </KpiStrip>

      <section aria-labelledby="reviews-ratings" className="flex flex-col gap-4">
        <SectionHeading id="reviews-ratings" icon={MessageCircleWarning} title="Calificaciones y quejas" description="Cómo califican las reseñas y de qué tratan las de 1 o 2 estrellas." />
        <div className="grid gap-4 @4xl:grid-cols-3">
          <Card index={0} title="Calificaciones" hint="Estrellas recibidas por las reseñas durante el periodo." description="Reseñas por número de estrellas.">
            {ratedReviews === 0 ? <AnalyticsEmpty title="Aún no hay calificaciones disponibles" example="Una reseña de 5 estrellas para la página de campaña aparecerá en este gráfico." action={{ href: '/keywords/new', label: 'Revisar páginas conectadas' }} /> : <BarList items={STARS.map((s) => ({ label: `${s} ★`, value: totals.distribution[s], href: link({ ratings: String(s) }) }))} />}
          </Card>
          <Card index={1} className="@4xl:col-span-2" title="Temas de las reseñas negativas" hint="Etiquetas que se identificaron en las reseñas con 1 o 2 estrellas." description="Los asuntos que más se repiten en las reseñas con 1 o 2 estrellas.">
            {report.tags.length === 0 ? <AnalyticsEmpty title="Aún no se identifican temas negativos" example="Una reseña de 2 estrellas que critique la atención aparecerá con su tema cuando haya datos." action={{ href: '/keywords/new', label: 'Revisar términos monitoreados' }} /> : <BarList items={report.tags.slice(0, 10).map((t) => ({ label: tagName(t.tag), value: t.count, href: link({ ratings: '1,2', intents: t.tag }) }))} />}
          </Card>
        </div>
      </section>

      <section aria-labelledby="reviews-pages" className="flex flex-col gap-4">
        <SectionHeading id="reviews-pages" icon={FileText} title="Páginas de reseñas" description="Cada app o ficha de negocio conectada, con su tendencia y su atención." />
        <Table head={[
          <span className="inline-flex items-center gap-1">Página <InfoTip text="Página de reseñas conectada, por ejemplo una app o ficha de negocio." /></span>,
          <span className="inline-flex items-center gap-1">Reseñas <InfoTip term="menciones" /></span>,
          <span className="inline-flex items-center gap-1">Tendencia <InfoTip text="Cambio diario de reseñas durante el periodo." /></span>,
          <span className="inline-flex items-center gap-1">Promedio <InfoTip text="Promedio de estrellas recibidas en esta página." /></span>,
          <span className="inline-flex items-center gap-1">De 1 a 5 estrellas <InfoTip text="Cantidad de reseñas recibidas con cada calificación, de 1 a 5 estrellas." /></span>,
          <span className="inline-flex items-center gap-1">Con respuesta <InfoTip text="Reseñas a las que el equipo ya respondió." /></span>,
          <span className="inline-flex items-center gap-1">Negativas abiertas <InfoTip text="Reseñas de 1 o 2 estrellas que siguen pendientes de atención." /></span>,
        ]}>
          {report.pages.map((page) => (
            <TableRow key={`${page.platform}:${page.id}`}>
              <TableCell className={td}>
                <a href={page.url} target="_blank" rel="noreferrer" className="font-medium hover:underline">
                  {page.id}
                  <span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
                <p className="text-xs text-muted-foreground">{platformName(page.platform)}</p>
              </TableCell>
              <TableCell className={`${td} tabular-nums`}>
                {compact(page.reviews)}
                {page.previous ? <p className="text-xs"><Delta current={page.reviews} previous={page.previous.reviews} short /></p> : null}
              </TableCell>
              <TableCell className={td}><Sparkline values={page.series.map((p) => p.reviews)} /></TableCell>
              <TableCell className={`${td} tabular-nums whitespace-nowrap`}>{stars(page.averageRating)}</TableCell>
              <TableCell className={`${td} text-xs tabular-nums whitespace-nowrap text-muted-foreground`}>{([1, 2, 3, 4, 5] as const).map((s) => page.distribution[s]).join(' · ')}</TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(page.responded)}</TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(page.openNegative)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </section>
    </div>
  );
}
