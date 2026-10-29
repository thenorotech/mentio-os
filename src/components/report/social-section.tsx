/**
 * "Redes sociales y web" in the executive report: the latest Apify runs read
 * as the report's other sections (and printed like them). The page starts
 * `loadSocialReport()` alongside its Mentio reads and renders this in a
 * Suspense boundary; when Apify cannot be read the section is left out.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowUpRight, Globe2, Hash, Newspaper, Search } from 'lucide-react';
import { loadLatest, timeZone } from '@/app/(dashboard)/redes/data';
import { PlatformIcon } from '@/components/platform-icon';
import { Skeleton } from '@/components/ui/skeleton';
import { compact, day } from '@/lib/format';
import { bestHour, hourLabel, platformLabel, rateLabel, socialTakeaway } from '@/lib/scraping/highlights';
import type { Ranked, ScrapeMetrics } from '@/lib/scraping/metrics';
import { SOURCE_KEYS, interactions } from '@/lib/scraping/sources';
import styles from './report-print.module.css';

export type SocialReport = { metrics: ScrapeMetrics; runs: number } | null;

/** The latest finished run of every source; null when Apify could not be read. Never rejects. */
export async function loadSocialReport(): Promise<SocialReport> {
  try {
    const { runs, metrics } = await loadLatest(SOURCE_KEYS, 1);
    return { metrics, runs: runs.length };
  } catch (error) {
    console.error('No se pudieron leer las recolecciones de Apify para el reporte', error);
    return null;
  }
}

const sectionClass = `${styles.section} rounded-xl border bg-card p-4 shadow-xs`;

function Heading({ id, icon: Icon, title, description }: { id: string; icon: typeof Globe2; title: string; description: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon className="size-4 text-primary" aria-hidden="true" />
      <div>
        <h2 id={id} className="text-sm font-semibold">{title}</h2>
        <p className={`${styles.muted} text-xs text-muted-foreground`}>{description}</p>
      </div>
    </div>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2">
      <dt className={`${styles.muted} text-xs text-muted-foreground`}>{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
      {hint ? <dd className={`${styles.muted} truncate text-[11px] text-muted-foreground`}>{hint}</dd> : null}
    </div>
  );
}

/** A short ranked list, numbered like the report's topics. */
function RankedList({ rows, unit }: { rows: Array<{ key: string; label: ReactNode; value: string }>; unit?: string }) {
  return (
    <ol className="divide-y">
      {rows.map((row, index) => (
        <li key={row.key} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
          <span className="flex min-w-0 items-center gap-2">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
            <span className="truncate text-sm font-medium">{row.label}</span>
          </span>
          <span className={`${styles.muted} whitespace-nowrap text-xs tabular-nums text-muted-foreground`}>{row.value}{unit ? ` ${unit}` : ''}</span>
        </li>
      ))}
    </ol>
  );
}

const ranked = (rows: Ranked[]) => rows.slice(0, 5).map((r) => ({ key: r.label, label: r.label, value: compact(r.value) }));

export async function SocialReportSection({ report }: { report: Promise<SocialReport> }) {
  const data = await report;
  if (!data) return null;

  if (!data.runs) {
    return (
      <section className={sectionClass} aria-labelledby="report-social-heading">
        <Heading id="report-social-heading" icon={Globe2} title="Redes sociales y web" description="Publicaciones, prensa y Google recolectados con Apify." />
        <p className={`${styles.muted} text-sm text-muted-foreground`}>
          Aún no hay recolecciones terminadas. Inicia una en <Link href="/redes" className="font-medium text-primary hover:underline">Redes y web</Link> para sumarlas a este reporte.
        </p>
      </section>
    );
  }

  const m = data.metrics;
  const t = m.totals;
  const hour = bestHour(m.hours);
  const period = t.first && t.last ? `${day(t.first)} al ${day(t.last)}` : 'Últimas recolecciones';
  const topPosts = m.topPosts.slice(0, 5);
  const outlets = ranked(m.outlets);
  const domains = m.domains.slice(0, 5).map((d) => ({ key: d.domain, label: d.domain, value: `${d.results} resultados · mejor #${d.bestPosition}` }));

  return (
    <>
      <section className={sectionClass} aria-labelledby="report-social-heading">
        <Heading id="report-social-heading" icon={Globe2} title="Redes sociales y web" description={`${period} · última recolección de cada fuente en Apify.`} />
        <p className="max-w-3xl text-sm leading-6">{socialTakeaway(m)}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          <Figure label="Publicaciones" value={compact(t.posts)} hint={`${compact(t.authors)} autores`} />
          <Figure label="Interacciones" value={compact(t.interactions)} hint={`${compact(t.avgInteractions)} por publicación`} />
          <Figure label="Tasa de interacción" value={rateLabel(t.engagementRate)} hint={t.views ? `${compact(t.views)} vistas` : 'Sin vistas reportadas'} />
          <Figure label="Mejor hora" value={hour === null ? 's/d' : hourLabel(hour)} hint={timeZone()} />
        </dl>
        {m.platforms.length ? (
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className={`${styles.muted} border-b text-left text-xs text-muted-foreground`}>
                <th scope="col" className="py-2 pr-3 font-medium">Red</th>
                {['Publicaciones', 'Interacciones', 'Promedio', 'Vistas', 'Tasa'].map((h) => <th key={h} scope="col" className="py-2 pl-3 text-right font-medium">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y">
              {m.platforms.map((p) => (
                <tr key={p.platform}>
                  <td className="py-2 pr-3"><span className="flex items-center gap-2 font-medium"><PlatformIcon platform={p.platform} />{platformLabel(p.platform)}</span></td>
                  {[p.posts, p.interactions, p.avgInteractions, p.views].map((n, i) => <td key={i} className="py-2 pl-3 text-right tabular-nums">{compact(n)}</td>)}
                  <td className="py-2 pl-3 text-right tabular-nums">{rateLabel(p.engagementRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
        {t.articles || t.results ? (
          <p className={`${styles.muted} mt-3 text-xs text-muted-foreground`}>
            También se recolectaron {compact(t.articles)} notas de prensa y {compact(t.results)} resultados de Google.
          </p>
        ) : null}
      </section>

      {t.posts ? (
        <div className="grid gap-4 @4xl:grid-cols-2">
          <section className={sectionClass} aria-labelledby="report-social-posts-heading">
            <Heading id="report-social-posts-heading" icon={Globe2} title="Publicaciones con más interacción" description="Las cinco con más likes, comentarios y compartidos." />
            <ol className="space-y-3">
              {topPosts.map((post, index) => (
                <li key={`${post.source}:${post.id}`} className="border-t pt-2.5 first:border-0 first:pt-0">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                    <div className="min-w-0 flex-1">
                      {post.url ? (
                        <a href={post.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm hover:text-primary">
                          {post.title || post.text || 'Sin texto'} <ArrowUpRight className="inline size-3.5" aria-hidden="true" />
                        </a>
                      ) : <p className="line-clamp-2 text-sm">{post.title || post.text || 'Sin texto'}</p>}
                      <p className={`${styles.muted} mt-1 flex items-center gap-1.5 text-xs text-muted-foreground`}>
                        <PlatformIcon platform={post.platform} className="size-3" />
                        {[post.author ?? platformLabel(post.platform), `${compact(interactions(post))} interacciones`, post.views ? `${compact(post.views)} vistas` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <section className={sectionClass} aria-labelledby="report-social-terms-heading">
            <Heading id="report-social-terms-heading" icon={Hash} title="Hashtags y palabras frecuentes" description="Lo que más se repite en publicaciones y notas." />
            <div className="grid gap-4 @lg:grid-cols-2">
              <div>
                <h3 className={`${styles.muted} mb-2 text-xs font-medium text-muted-foreground`}>Hashtags</h3>
                {m.hashtags.length ? <RankedList rows={ranked(m.hashtags)} unit="usos" /> : <p className={`${styles.muted} text-sm text-muted-foreground`}>Sin hashtags en este periodo.</p>}
              </div>
              <div>
                <h3 className={`${styles.muted} mb-2 text-xs font-medium text-muted-foreground`}>Palabras</h3>
                {m.words.length ? <RankedList rows={ranked(m.words)} unit="veces" /> : <p className={`${styles.muted} text-sm text-muted-foreground`}>Sin palabras frecuentes.</p>}
              </div>
            </div>
          </section>
        </div>
      ) : null}

      {outlets.length || domains.length ? (
        <div className={`grid gap-4 ${outlets.length && domains.length ? '@4xl:grid-cols-2' : ''}`}>
          {outlets.length ? (
            <section className={sectionClass} aria-labelledby="report-social-press-heading">
              <Heading id="report-social-press-heading" icon={Newspaper} title="Medios con más notas" description="Google Noticias, en las búsquedas recolectadas." />
              <RankedList rows={outlets} unit="notas" />
            </section>
          ) : null}
          {domains.length ? (
            <section className={sectionClass} aria-labelledby="report-social-google-heading">
              <Heading id="report-social-google-heading" icon={Search} title="Sitios que más aparecen en Google" description="Resultados orgánicos y mejor posición alcanzada." />
              <RankedList rows={domains} />
            </section>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** The section's shape while Apify answers. */
export function SocialReportSkeleton() {
  return (
    <section className={sectionClass} aria-busy="true" aria-label="Cargando redes sociales y web">
      <div className="mb-3 flex items-center gap-2">
        <Skeleton className="size-4" />
        <div className="grid gap-1.5"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-64 max-w-full" /></div>
      </div>
      <Skeleton className="h-4 w-full max-w-2xl" />
      <div className="mt-4 grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
      </div>
    </section>
  );
}
