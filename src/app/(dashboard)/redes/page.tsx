import type { ReactNode } from 'react';
import { Globe2, ListChecks } from 'lucide-react';
import { EmptyState, LinkButton, Notice, PageHeader } from '@/components/ui';
import { LinkToggle } from '@/components/ui/client';
import { UrlFilters } from '@/components/url-filters';
import { apifyConfigured } from '@/lib/apify';
import { timeAgo } from '@/lib/format';
import { many, one, withParams, type SearchParams } from '@/lib/params';
import { SOURCES, SOURCE_KEYS, SOURCE_LIST, isSourceKey } from '@/lib/scraping/sources';
import { loadLatest, timeZone } from './data';
import { MetricsView } from './metrics-view';
import { ApifySetup, NewScrapeButton } from './parts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Redes y web' };

const DEPTHS = [
  { value: '1', label: 'Última' },
  { value: '3', label: 'Últimas 3' },
  { value: '10', label: 'Últimas 10' },
];

/** Instagram, Facebook, X, TikTok, YouTube, Google and the press, from the latest Apify runs of each source. */
export default async function Redes({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const header = (actions?: ReactNode) => (
    <PageHeader title="Redes y web" description="Métricas de lo que se publica sobre la campaña en redes sociales, prensa y Google, recolectado por Ágora." actions={actions} />
  );
  if (!apifyConfigured()) return <div>{header()}<ApifySetup /></div>;

  const chosen = many(params, 'sources').filter(isSourceKey);
  const sources = chosen.length ? chosen : [...SOURCE_KEYS];
  const depth = DEPTHS.find((d) => d.value === one(params, 'runs'))?.value ?? '1';
  const { runs, metrics, failed } = await loadLatest(sources, Number(depth));
  const latest = runs[0]?.finishedAt ?? runs[0]?.startedAt;

  return (
    <div>
      {header(
        <>
          <LinkToggle current={depth} items={DEPTHS.map((d) => ({ ...d, href: withParams('/redes', params, { runs: d.value === '1' ? undefined : d.value }) }))} />
          <LinkButton href="/redes/recolecciones"><ListChecks /> Recolecciones</LinkButton>
          <NewScrapeButton />
        </>,
      )}

      <UrlFilters
        keep={['runs']}
        reset={[]}
        filters={[{ param: 'sources', label: 'Fuente', icon: 'platform', kind: 'multi', options: SOURCE_LIST.map((s) => ({ value: s.key, label: s.label, platform: s.platform })) }]}
      />

      {failed.length ? (
        <Notice tone="warn" className="mb-4" title="Algunas fuentes no respondieron">
          {failed.map((s) => SOURCES[s].label).join(', ')}: la fuente no respondió; inténtalo más tarde.
        </Notice>
      ) : null}

      {runs.length === 0 ? (
        <EmptyState icon={Globe2} title="Aún no hay recolecciones terminadas" example="Recolecta @candidata y #seguridad en Instagram, X y TikTok para ver qué publicaciones generan más interacción." action={<NewScrapeButton primary={false} />}>
          Inicia una recolección: las publicaciones y sus métricas aparecen aquí.
        </EmptyState>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">
            {runs.length} {runs.length === 1 ? 'recolección' : 'recolecciones'} · actualizado {timeAgo(latest)}
          </p>
          <MetricsView metrics={metrics} timeZone={timeZone()} />
        </>
      )}
    </div>
  );
}
