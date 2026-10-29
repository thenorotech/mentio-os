/**
 * The scrape metrics as dashboard sections, shared by the overview and a
 * run's page. Each section shows only when its data exists (no search runs,
 * no Google block), so one source never leaves empty cards behind.
 */
import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { InfoTip } from '@/components/info-tip';
import { PlatformIcon, platformColor } from '@/components/platform-icon';
import { BarList, Card, LineChart, StackedBars, Stat, Table, TableCell, TableRow, td } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { compact, date } from '@/lib/format';
import type { ScrapeMetrics } from '@/lib/scraping/metrics';
import { SOURCES, interactions, isSourceKey, type ScrapedItem } from '@/lib/scraping/sources';

const label = (text: string, help: string) => <span className="inline-flex items-center gap-1">{text} <InfoTip text={help} /></span>;
const pct = (rate: number | null) => (rate === null ? 's/d' : `${(rate * 100).toFixed(rate < 0.1 ? 2 : 1)}%`);
const platformLabel = (platform: string) => (isSourceKey(platform) ? SOURCES[platform].label : platform);

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold tracking-tight text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function OutLink({ href, children, className }: { href: string | null; children: ReactNode; className?: string }) {
  if (!href) return <span className={className}>{children}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={`group/out inline-flex items-start gap-1 hover:underline ${className ?? ''}`}>
      {children}
      <ExternalLink aria-hidden className="mt-0.5 size-3 shrink-0 opacity-0 transition-opacity group-hover/out:opacity-60" />
    </a>
  );
}

/** Mean interactions by hour of day; the best hour in the brand color. */
function HourStrip({ hours, timeZone }: { hours: ScrapeMetrics['hours']; timeZone: string }) {
  const max = Math.max(1, ...hours.map((h) => h.avgInteractions));
  const best = hours.reduce((b, h, i) => (h.avgInteractions > hours[b].avgInteractions ? i : b), 0);
  return (
    <div>
      <div className="flex h-28 items-end gap-0.5" role="img" aria-label={`La hora con más interacción promedio es las ${best}:00`}>
        {hours.map((h, i) => (
          <Tooltip key={i}>
            <TooltipTrigger
              render={
                <span
                  className={`flex-1 origin-bottom rounded-t-sm transition-[transform,opacity] duration-300 ease-out motion-reduce:transition-none ${i === best ? 'bg-primary' : 'bg-primary/25 hover:bg-primary/50'}`}
                  style={{ height: `${Math.max(2, (h.avgInteractions / max) * 100)}%` }}
                />
              }
            />
            <TooltipContent>{`${String(i).padStart(2, '0')}:00 · ${h.posts} publicaciones · ${compact(h.avgInteractions)} interacciones promedio`}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground tabular-nums">
        {[0, 6, 12, 18, 23].map((h) => <span key={h}>{String(h).padStart(2, '0')}h</span>)}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Mejor horario: <span className="font-medium text-foreground">{String(best).padStart(2, '0')}:00</span> ({timeZone}), con {compact(hours[best].avgInteractions)} interacciones por publicación.
      </p>
    </div>
  );
}

function PostsTable({ posts }: { posts: ScrapedItem[] }) {
  return (
    <Table head={['Publicación', 'Autor', 'Likes', 'Coment.', 'Compart.', 'Vistas', 'Total']}>
      {posts.map((p) => (
        <TableRow key={`${p.source}:${p.id}`}>
          <TableCell className={`${td} max-w-md`}>
            <OutLink href={p.url} className="text-sm">
              <PlatformIcon platform={p.platform} className="mt-0.5 size-3.5" />
              <span className="line-clamp-2">{p.title || p.text || 'Sin texto'}</span>
            </OutLink>
            {p.publishedAt ? <p className="mt-0.5 text-xs text-muted-foreground">{date(p.publishedAt)}</p> : null}
          </TableCell>
          <TableCell className={`${td} text-xs text-muted-foreground`}>{p.author ?? '—'}</TableCell>
          {[p.likes, p.comments, p.shares, p.views].map((n, i) => <TableCell key={i} className={`${td} text-xs tabular-nums`}>{compact(n)}</TableCell>)}
          <TableCell className={`${td} text-sm font-medium tabular-nums`}>{compact(interactions(p))}</TableCell>
        </TableRow>
      ))}
    </Table>
  );
}

export function MetricsView({ metrics: m, timeZone }: { metrics: ScrapeMetrics; timeZone: string }) {
  const t = m.totals;
  const stacks = m.postsByDay.map((row) => ({ name: platformLabel(row.platform), color: platformColor(row.platform), values: row.values }));

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 @2xl:grid-cols-4">
        <Stat label={label('Publicaciones', 'Posts y videos recolectados en redes sociales.')} value={compact(t.posts)} spark={stacks.length ? m.days.map((_, i) => stacks.reduce((s, r) => s + (r.values[i] ?? 0), 0)) : undefined} hint={t.first && t.last ? `${date(t.first)} a ${date(t.last)}` : undefined} />
        <Stat label={label('Interacciones', 'Likes, comentarios y compartidos (reposts y citas en X) sumados.')} value={compact(t.interactions)} spark={m.interactionsByDay} hint={`${compact(t.likes)} likes · ${compact(t.comments)} coment. · ${compact(t.shares)} compart.`} />
        <Stat label={label('Vistas', 'Reproducciones y vistas que reporta cada red (Instagram video, X, TikTok, YouTube, Facebook).')} value={compact(t.views)} />
        <Stat label={label('Interacción promedio', 'Interacciones divididas entre publicaciones: cuánto responde la audiencia a cada post.')} value={compact(t.avgInteractions)} hint="por publicación" />
        <Stat label={label('Tasa de interacción', 'Interacciones entre vistas, solo en publicaciones con vistas reportadas. Arriba de 3% suele ser alta.')} value={pct(t.engagementRate)} />
        <Stat label={label('Autores', 'Cuentas distintas que publicaron el contenido recolectado.')} value={compact(t.authors)} />
        <Stat label={label('Notas de prensa', 'Artículos encontrados en Google Noticias.')} value={compact(t.articles)} />
        <Stat label={label('Resultados en Google', 'Resultados orgánicos recolectados de las búsquedas.')} value={compact(t.results)} />
      </div>

      {t.posts ? (
        <Section title="Redes sociales">
          <Card title={label('Publicaciones por día', 'Cuántas publicaciones salieron cada día, por red. Fuente: datasets de Apify.')} description={`Días en ${timeZone}.`}>
            <StackedBars labels={m.days} stacks={stacks} />
          </Card>
          <div className="grid gap-4 @4xl:grid-cols-2">
            <Card title={label('Interacciones por día', 'Likes, comentarios y compartidos de lo publicado cada día.')}>
              <LineChart labels={m.days} series={[{ name: 'Interacciones', values: m.interactionsByDay }]} height={200} />
            </Card>
            <Card title={label('Mejor hora para publicar', 'Interacción promedio de lo publicado en cada hora del día: dónde concentrar la pauta.')}>
              <HourStrip hours={m.hours} timeZone={timeZone} />
            </Card>
          </div>
          <Table head={['Red', 'Publicaciones', 'Interacciones', 'Promedio', 'Vistas', 'Tasa']}>
            {m.platforms.map((p) => (
              <TableRow key={p.platform}>
                <TableCell className={td}><span className="flex items-center gap-2 font-medium"><PlatformIcon platform={p.platform} />{platformLabel(p.platform)}</span></TableCell>
                {[p.posts, p.interactions, p.avgInteractions, p.views].map((n, i) => <TableCell key={i} className={`${td} tabular-nums`}>{compact(n)}</TableCell>)}
                <TableCell className={`${td} tabular-nums`}>{pct(p.engagementRate)}</TableCell>
              </TableRow>
            ))}
          </Table>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">{label('Publicaciones con más interacción', 'Las 10 publicaciones con más likes, comentarios y compartidos.')}</h3>
            <PostsTable posts={m.topPosts} />
          </div>
          <div className="grid gap-4 @4xl:grid-cols-3">
            <Card title={label('Hashtags', 'Hashtags más usados en publicaciones y notas.')}>
              <BarList items={m.hashtags.map((h) => ({ label: h.label, value: h.value }))} format="plain" />
            </Card>
            <Card title={label('Palabras frecuentes', 'Palabras que más se repiten (sin artículos ni conectores): los temas de la conversación.')}>
              <BarList items={m.words.map((w) => ({ label: w.label, value: w.value }))} format="plain" />
            </Card>
            <Card title={label('Autores con más interacción', 'Las cuentas cuyo contenido generó más interacción.')}>
              <BarList items={m.authors.map((a) => ({ label: a.followers === null ? a.author : `${a.author} · ${compact(a.followers)} seg.`, value: a.interactions, icon: <PlatformIcon platform={a.platform} /> }))} />
            </Card>
          </div>
        </Section>
      ) : null}

      {t.articles ? (
        <Section title="Prensa">
          <div className="grid gap-4 @4xl:grid-cols-3">
            <Card title={label('Medios con más notas', 'Qué medios publicaron más sobre las búsquedas.')}>
              <BarList items={m.outlets.map((o) => ({ label: o.label, value: o.value, icon: <PlatformIcon platform="news" /> }))} format="plain" />
            </Card>
            <Card className="@4xl:col-span-2" title={label('Notas por día', 'Cuántas notas se publicaron cada día.')}>
              <LineChart labels={m.days} series={[{ name: 'Notas', values: m.articlesByDay }]} height={180} />
            </Card>
          </div>
          <Card title="Notas recientes">
            <ul className="divide-y">
              {m.articles.map((a) => (
                <li key={a.id} className="py-2.5 first:pt-0 last:pb-0">
                  <OutLink href={a.url} className="text-sm font-medium">{a.title || a.text}</OutLink>
                  <p className="mt-0.5 text-xs text-muted-foreground">{[a.outlet, a.publishedAt ? date(a.publishedAt) : null].filter(Boolean).join(' · ')}</p>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      ) : null}

      {t.results ? (
        <Section title="Buscadores">
          <Table head={['Dominio', 'Resultados', 'Mejor posición', 'Búsquedas']}>
            {m.domains.map((d) => (
              <TableRow key={d.domain}>
                <TableCell className={`${td} font-medium`}>{d.domain}</TableCell>
                <TableCell className={`${td} tabular-nums`}>{d.results}</TableCell>
                <TableCell className={`${td} tabular-nums`}>#{d.bestPosition}</TableCell>
                <TableCell className={`${td} tabular-nums`}>{d.queries}</TableCell>
              </TableRow>
            ))}
          </Table>
          <Card title={label('Resultados orgánicos', 'Lo que ve un votante al buscar: posición, título y sitio.')}>
            <ul className="divide-y">
              {m.results.map((r) => (
                <li key={r.id} className="flex gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-7 shrink-0 text-xs text-muted-foreground tabular-nums">#{r.position}</span>
                  <div className="min-w-0">
                    <OutLink href={r.url} className="text-sm font-medium">{r.title || r.url}</OutLink>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{[r.query ? `“${r.query}”` : null, r.outlet].filter(Boolean).join(' · ')}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      ) : null}
    </div>
  );
}
