import type { ReactNode } from 'react';
import { ExternalLink, Scale, Trophy } from 'lucide-react';
import { ShareBar } from '@/components/charts';
import { InfoTip } from '@/components/info-tip';
import { PlatformIcon } from '@/components/platform-icon';
import { Badge, CHART_COLORS, Card, EmptyState, LineChart, Notice, PageHeader, Table, TableCell, TableRow, cx, td } from '@/components/ui';
import { LinkToggle } from '@/components/ui/client';
import { UrlFilters } from '@/components/url-filters';
import { apifyConfigured } from '@/lib/apify';
import { compact, date, timeAgo } from '@/lib/format';
import { many, one, withParams, type SearchParams } from '@/lib/params';
import { compareTargets, type TargetKind, type TargetRow } from '@/lib/scraping/compare';
import { SOURCES, SOURCE_KEYS, SOURCE_LIST, interactions, isSourceKey, type ScrapedItem } from '@/lib/scraping/sources';
import { loadTagged, timeZone } from '../data';
import { ApifySetup, NewScrapeButton } from '../parts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comparativa' };

/** A comparison needs runs of both sides, so it reads deeper than the overview by default. */
const DEPTHS = [
  { value: '1', label: 'Última' },
  { value: '3', label: 'Últimas 3' },
  { value: '10', label: 'Últimas 10' },
];
const DEFAULT_DEPTH = '3';

/** Without a choice in the filter, the busiest targets: more lines than this stop reading as a comparison. */
const DEFAULT_TARGETS = 5;

const KIND: Record<TargetKind, string> = { handle: 'Cuenta', hashtag: 'Hashtag', term: 'Búsqueda', url: 'Enlace' };

const label = (text: string, help: string) => <span className="inline-flex items-center gap-1">{text} <InfoTip text={help} /></span>;
const pct = (rate: number | null) => (rate === null ? 's/d' : `${(rate * 100).toFixed(rate < 0.1 ? 2 : 1)}%`);
const platformLabel = (platform: string) => (isSourceKey(platform) ? SOURCES[platform].label : platform);

function Dot({ color }: { color: string }) {
  return <span aria-hidden className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} />;
}

/** The target that leads a column, or null when nobody scored. */
function leader(rows: TargetRow[], value: (row: TargetRow) => number | null): string | null {
  let best: TargetRow | null = null;
  for (const row of rows) {
    const v = value(row);
    if (v !== null && v > 0 && (best === null || v > (value(best) ?? 0))) best = row;
  }
  return best?.target.key ?? null;
}

function MetricCell({ children, lead }: { children: ReactNode; lead: boolean }) {
  return (
    <TableCell className={cx(td, 'tabular-nums', lead && 'font-semibold text-primary')}>
      <span className="inline-flex items-center gap-1">
        {lead ? <Trophy aria-hidden className="size-3" /> : null}
        {children}
        {lead ? <span className="sr-only">(lidera)</span> : null}
      </span>
    </TableCell>
  );
}

function BestPost({ post }: { post: ScrapedItem | null }) {
  if (!post) return <p className="text-sm text-muted-foreground">Sin publicaciones atribuidas en estas recolecciones.</p>;
  const body = <span className="line-clamp-4">{post.title || post.text || 'Sin texto'}</span>;
  return (
    <div className="space-y-3">
      {post.url ? (
        <a href={post.url} target="_blank" rel="noreferrer noopener" className="group/out inline-flex items-start gap-1 text-sm hover:underline">
          {body}
          <ExternalLink aria-hidden className="mt-0.5 size-3 shrink-0 opacity-0 transition-opacity group-hover/out:opacity-60" />
        </a>
      ) : (
        <p className="text-sm">{body}</p>
      )}
      <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
        <PlatformIcon platform={post.platform} />
        {[post.author, post.publishedAt ? date(post.publishedAt) : null].filter(Boolean).join(' · ') || platformLabel(post.platform)}
      </p>
      <dl className="grid grid-cols-3 gap-2 border-t pt-3 text-xs">
        {[
          { name: 'Interacciones', value: interactions(post) },
          { name: 'Vistas', value: post.views },
          { name: 'Comentarios', value: post.comments },
        ].map(({ name, value }) => (
          <div key={name}>
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">{compact(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The campaign's targets head to head (candidate and adversaries), from the latest Apify runs of each source. */
export default async function Comparativa({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const header = (actions?: ReactNode) => (
    <PageHeader
      title="Comparativa"
      back={{ href: '/redes', label: 'Redes y web' }}
      description="Las cuentas, hashtags y búsquedas que recolectas, frente a frente: quién publica más, quién genera más interacción y qué le funcionó mejor a cada uno."
      actions={actions}
    />
  );
  if (!apifyConfigured()) return <div>{header()}<ApifySetup /></div>;

  const chosenSources = many(params, 'sources').filter(isSourceKey);
  const sources = chosenSources.length ? chosenSources : [...SOURCE_KEYS];
  const depth = DEPTHS.find((d) => d.value === one(params, 'runs'))?.value ?? DEFAULT_DEPTH;
  const { runs, tagged, failed } = await loadTagged(sources, Number(depth));
  const zone = timeZone();
  const everyone = compareTargets(tagged, { timeZone: zone });

  const known = new Set(everyone.rows.map((r) => r.target.key));
  const picked = many(params, 'targets').filter((k) => known.has(k));
  const keys = picked.length ? picked : everyone.rows.slice(0, DEFAULT_TARGETS).map((r) => r.target.key);
  const { rows, days, unmatched } = compareTargets(tagged, { timeZone: zone, only: keys });
  const color = new Map(rows.map((r, i) => [r.target.key, CHART_COLORS[i % CHART_COLORS.length]]));
  const colorOf = (row: TargetRow) => color.get(row.target.key) ?? CHART_COLORS[0];
  const latest = runs[0]?.finishedAt ?? runs[0]?.startedAt;

  const leads = {
    posts: leader(rows, (r) => r.posts),
    interactions: leader(rows, (r) => r.interactions),
    avg: leader(rows, (r) => r.avgInteractions),
    rate: leader(rows, (r) => r.engagementRate),
    views: leader(rows, (r) => r.views),
    share: leader(rows, (r) => r.shareOfInteractions),
  };

  return (
    <div>
      {header(
        <>
          <LinkToggle current={depth} items={DEPTHS.map((d) => ({ ...d, href: withParams('/redes/comparativa', params, { runs: d.value === DEFAULT_DEPTH ? undefined : d.value }) }))} />
          <NewScrapeButton />
        </>,
      )}

      <UrlFilters
        keep={['runs']}
        reset={[]}
        filters={[
          { param: 'targets', label: 'Objetivo', icon: 'target', kind: 'multi', options: everyone.rows.map((r) => ({ value: r.target.key, label: `${r.target.label} · ${KIND[r.target.kind]}` })) },
          { param: 'sources', label: 'Fuente', icon: 'platform', kind: 'multi', options: SOURCE_LIST.map((s) => ({ value: s.key, label: s.label, platform: s.platform })) },
        ]}
      />

      {failed.length ? (
        <Notice tone="warn" className="mb-4" title="Algunas fuentes no respondieron">
          {failed.map((s) => SOURCES[s].label).join(', ')}: la fuente no respondió; inténtalo más tarde.
        </Notice>
      ) : null}

      {everyone.rows.length < 2 ? (
        <EmptyState
          icon={Scale}
          title={runs.length === 0 ? 'Aún no hay recolecciones terminadas' : 'Hacen falta al menos dos objetivos para comparar'}
          example="Recolecta @candidata, @adversario y #debate en Instagram, X y TikTok para ver quién genera más interacción."
          action={<NewScrapeButton primary={false} />}
        >
          Recolecta la cuenta de tu candidato y las de sus adversarios (o sus hashtags y búsquedas): cada uno aparece aquí como un objetivo.
        </EmptyState>
      ) : (
        <div className="space-y-6">
          <p className="text-xs text-muted-foreground">
            {runs.length} {runs.length === 1 ? 'recolección' : 'recolecciones'} · actualizado {timeAgo(latest)}
            {picked.length === 0 && everyone.rows.length > DEFAULT_TARGETS ? ` · se comparan los ${DEFAULT_TARGETS} objetivos con más interacción de ${everyone.rows.length}; elige otros en el filtro Objetivo` : ''}
          </p>

          <Card title={label('Participación de voz', 'Qué parte del total se lleva cada objetivo, entre los que comparas. Una publicación que menciona a dos objetivos cuenta para ambos. Fuente: publicaciones en redes recolectadas por Ágora.')}>
            <div className="space-y-5">
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">Por interacciones</h3>
                <ShareBar items={rows.map((r) => ({ label: r.target.label, value: r.shareOfInteractions * 100, color: colorOf(r) }))} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">Por publicaciones</h3>
                <ShareBar items={rows.map((r) => ({ label: r.target.label, value: r.shareOfPosts * 100, color: colorOf(r) }))} />
              </div>
            </div>
          </Card>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{label('Frente a frente', 'Las métricas de cada objetivo con las publicaciones en redes que se le atribuyen: las de su cuenta, las que lo mencionan o usan su hashtag, y lo que trajo su búsqueda. El trofeo marca a quien lidera cada columna.')}</h2>
            <Table
              head={[
                'Objetivo',
                label('Publicaciones', 'Posts y videos atribuidos al objetivo.'),
                label('Interacciones', 'Likes, comentarios y compartidos (reposts y citas en X) sumados.'),
                label('Promedio', 'Interacciones por publicación: cuánto responde la audiencia a cada post.'),
                label('Tasa', 'Interacciones entre vistas, solo en publicaciones con vistas reportadas. Arriba de 3% suele ser alta.'),
                label('Vistas', 'Reproducciones y vistas que reporta cada red.'),
                label('Participación', 'Porcentaje de las interacciones de todos los objetivos comparados.'),
              ]}
            >
              {rows.map((r) => (
                <TableRow key={r.target.key}>
                  <TableCell className={td}>
                    <span className="flex items-center gap-2 font-medium">
                      <Dot color={colorOf(r)} />
                      {r.target.label}
                      <Badge>{KIND[r.target.kind]}</Badge>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {r.topPlatform ? <><PlatformIcon platform={r.topPlatform} />Más fuerte en {platformLabel(r.topPlatform)} · </> : null}
                      {r.authors} {r.authors === 1 ? 'autor' : 'autores'}
                    </span>
                  </TableCell>
                  <MetricCell lead={leads.posts === r.target.key}>{compact(r.posts)}</MetricCell>
                  <MetricCell lead={leads.interactions === r.target.key}>{compact(r.interactions)}</MetricCell>
                  <MetricCell lead={leads.avg === r.target.key}>{compact(r.avgInteractions)}</MetricCell>
                  <MetricCell lead={leads.rate === r.target.key}>{pct(r.engagementRate)}</MetricCell>
                  <MetricCell lead={leads.views === r.target.key}>{compact(r.views)}</MetricCell>
                  <MetricCell lead={leads.share === r.target.key}>{pct(r.shareOfInteractions)}</MetricCell>
                </TableRow>
              ))}
            </Table>
            {unmatched ? (
              <p className="text-xs text-muted-foreground">
                {compact(unmatched)} {unmatched === 1 ? 'publicación no se atribuyó' : 'publicaciones no se atribuyeron'} a ningún objetivo: venían de recolecciones con varios objetivos y no mencionan a ninguno.
              </p>
            ) : null}
          </section>

          <Card title={label('Publicaciones por día', 'Cuántas publicaciones atribuidas a cada objetivo salieron cada día. Fuente: recolecciones de Ágora.')} description={`Días en ${zone}.`}>
            <LineChart labels={days} series={rows.map((r) => ({ name: r.target.label, values: r.daily, color: colorOf(r) }))} height={240} />
          </Card>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold">{label('Lo que mejor le funcionó a cada uno', 'La publicación con más interacción de cada objetivo: el formato y el tema que su audiencia más respondió.')}</h2>
            <div className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-3">
              {rows.map((r) => (
                <Card
                  key={r.target.key}
                  title={
                    <span className="inline-flex items-center gap-2">
                      <Dot color={colorOf(r)} />
                      {r.target.label}
                      <InfoTip text={`La publicación con más likes, comentarios y compartidos atribuida a ${r.target.label}, de las recolecciones.`} />
                    </span>
                  }
                >
                  <BestPost post={r.best} />
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
