import Link from 'next/link';
import { Globe2 } from 'lucide-react';
import { EmptyState, Notice, PageHeader, Table, TableCell, TableRow, rowLink, td } from '@/components/ui';
import { PlatformIcon } from '@/components/platform-icon';
import { UrlFilters } from '@/components/url-filters';
import { apifyConfigured, isRunning, listAllRuns, withItemCounts } from '@/lib/apify';
import { compact, date } from '@/lib/format';
import { many, type SearchParams } from '@/lib/params';
import { SOURCES, SOURCE_KEYS, SOURCE_LIST, isSourceKey } from '@/lib/scraping/sources';
import { AutoRefresh } from '../auto-refresh';
import { ApifySetup, NewScrapeButton, RunStatusBadge } from '../parts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recolecciones' };

const duration = (from: string | null, to: string | null) => {
  if (!from) return '—';
  const s = Math.max(0, ((to ? Date.parse(to) : Date.now()) - Date.parse(from)) / 1000);
  return s < 60 ? `${Math.round(s)} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`;
};

/** Every Apify run of every source, newest first. */
export default async function Recolecciones({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const header = <PageHeader title="Recolecciones" back={{ href: '/redes', label: 'Redes y web' }} description="Cada recolección: qué fuente, cuándo y cuántos resultados." actions={apifyConfigured() ? <NewScrapeButton /> : undefined} />;
  if (!apifyConfigured()) return <div>{header}<ApifySetup /></div>;

  const chosen = many(params, 'sources').filter(isSourceKey);
  const listed = await listAllRuns(chosen.length ? chosen : SOURCE_KEYS, { limit: 25 });
  const failed = listed.failed;
  const runs = await withItemCounts(listed.runs.slice(0, 40));

  return (
    <div>
      {header}
      {runs.some((r) => isRunning(r.status)) ? <AutoRefresh /> : null}
      <UrlFilters
        keep={[]}
        reset={[]}
        filters={[{ param: 'sources', label: 'Fuente', icon: 'platform', kind: 'multi', options: SOURCE_LIST.map((s) => ({ value: s.key, label: s.label, platform: s.platform })) }]}
      />
      {failed.length ? <Notice tone="warn" className="mb-4">No se pudieron leer las recolecciones de {failed.map((s) => SOURCES[s].label).join(', ')}.</Notice> : null}

      {runs.length === 0 ? (
        <EmptyState icon={Globe2} title="Aún no hay recolecciones">Inicia una con el botón de arriba: elige fuentes y qué cuentas, hashtags o búsquedas seguir.</EmptyState>
      ) : (
        <Table head={['Fuente', 'Estado', 'Inicio', 'Duración', 'Resultados']}>
          {runs.map((r) => (
            <TableRow key={r.id}>
              <TableCell className={td}>
                <Link href={`/redes/recolecciones/${r.source}/${r.id}`} data-row-link className={`flex items-center gap-2 font-medium hover:underline ${rowLink}`}>
                  <PlatformIcon platform={SOURCES[r.source].platform} />
                  {SOURCES[r.source].label}
                </Link>
              </TableCell>
              <TableCell className={td}><RunStatusBadge status={r.status} /></TableCell>
              <TableCell className={`${td} text-xs text-muted-foreground`}>{r.startedAt ? date(r.startedAt) : '—'}</TableCell>
              <TableCell className={`${td} text-xs tabular-nums text-muted-foreground`}>{duration(r.startedAt, r.finishedAt)}</TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(r.items)}</TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </div>
  );
}
