import { notFound } from 'next/navigation';
import { Download } from 'lucide-react';
import { PlatformIcon } from '@/components/platform-icon';
import { Conditions, EmptyState, Notice, PageHeader, buttonClass } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { getRun, isRunning } from '@/lib/apify';
import { compact, date } from '@/lib/format';
import { computeMetrics } from '@/lib/scraping/metrics';
import { SOURCES, isSourceKey } from '@/lib/scraping/sources';
import { abortScrapeAction } from '@/app/(dashboard)/redes/actions';
import { AutoRefresh } from '@/app/(dashboard)/redes/auto-refresh';
import { runItems, runTargets, timeZone } from '@/app/(dashboard)/redes/data';
import { MetricsView } from '@/app/(dashboard)/redes/metrics-view';
import { RunStatusBadge } from '@/app/(dashboard)/redes/parts';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Recolección' };

/** One Apify run: what it was asked, how it went, and the metrics of what it brought back. */
export default async function Recoleccion({ params }: { params: Promise<{ source: string; id: string }> }) {
  const { source, id } = await params;
  if (!isSourceKey(source)) notFound();
  const run = await getRun(source, id);
  if (!run) notFound();
  const [targets, items] = await Promise.all([runTargets(run), run.datasetId ? runItems(run) : Promise.resolve([])]);
  const live = isRunning(run.status);
  const meta = [run.startedAt ? `Iniciada ${date(run.startedAt)}` : null, `${compact(run.items)} resultados`, run.costUsd === null ? null : `$${run.costUsd.toFixed(3)} USD`].filter(Boolean).join(' · ');

  return (
    <div className="space-y-6">
      {live ? <AutoRefresh /> : null}
      <PageHeader
        back={{ href: '/redes/recolecciones', label: 'Recolecciones' }}
        title={<span className="inline-flex items-center gap-2"><PlatformIcon platform={SOURCES[source].platform} className="size-4" />{SOURCES[source].label} <RunStatusBadge status={run.status} /></span>}
        description={meta}
        actions={
          <>
            {items.length ? <a href={`/redes/recolecciones/${source}/${run.id}/export`} className={buttonClass('secondary')}><Download /> Exportar CSV</a> : null}
            {live ? (
              <ActionForm action={abortScrapeAction}>
                <input type="hidden" name="source" value={source} />
                <input type="hidden" name="id" value={run.id} />
                <SubmitButton variant="danger" confirm="La corrida se detiene y conserva lo que ya recolectó.">Detener</SubmitButton>
              </ActionForm>
            ) : null}
          </>
        }
      />
      <Conditions conditions={targets} max={6} empty="Sin objetivos registrados" />

      {run.status === 'FAILED' || run.status === 'TIMED-OUT' ? (
        <Notice tone="bad" title="La corrida no terminó">Puedes iniciar otra; lo que alcanzó a recolectar se muestra abajo.</Notice>
      ) : null}

      {items.length ? (
        <MetricsView metrics={computeMetrics(items, timeZone())} timeZone={timeZone()} />
      ) : (
        <EmptyState compact title={live ? 'Recolectando…' : 'Sin resultados'}>
          {live ? 'Esta página se actualiza sola mientras la recolección avanza.' : 'La fuente no devolvió resultados para estos objetivos.'}
        </EmptyState>
      )}
    </div>
  );
}
