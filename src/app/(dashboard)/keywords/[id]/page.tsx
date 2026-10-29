import { notFound } from 'next/navigation';
import { ExternalLink, SlidersHorizontal, Star } from 'lucide-react';
import { Badge, Card, LinkButton, Notice, PageHeader, SectionHeading, Stat, TONE_TEXT, Table, td, TableCell, TableRow, KpiStrip } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { InfoTip } from '@/components/info-tip';
import { compact, date, platformName, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { KeywordActions } from '../keyword-actions';
import { KeywordForm } from '../keyword-form';
import { KeywordBadges, KindBadge, KIND_LABELS, platformsLabel, variantOf } from '../shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Término monitoreado' };

/** One monitored candidate or topic: activity, health, and settings. */
export default async function KeywordDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, groups] = await Promise.all([mentio().getKeyword({ path: { id } }), mentio().listGroups().then(unwrap)]);
  if (result.response?.status === 404) notFound();
  const keyword = unwrap(result);
  const { stats } = keyword;
  const mentionsHref = `/mentions?keywordIds=${encodeURIComponent(keyword.id)}`;
  const variant = variantOf(keyword.context);
  const capUsed = keyword.cap ? Math.min(100, (stats.thisMonth / Math.max(1, keyword.cap.mentions)) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/keywords', label: 'Candidatos y temas' }}
        title={keyword.term}
        description={
          <span className="flex flex-col gap-2">
            <span className="flex flex-wrap items-center gap-1">
              <KindBadge kind={keyword.kind} />
              {variant ? <Badge tone="outline">Variante de {variant}</Badge> : null}
              <KeywordBadges keyword={keyword} />
            </span>
            <span>{`${KIND_LABELS[keyword.kind]} en ${keyword.group.name}. ${platformsLabel(keyword)}. Monitoreado desde ${date(keyword.createdAt)}.`}</span>
          </span>
        }
        actions={
          <>
            <KeywordActions keyword={keyword} backToList size="md" />
            <LinkButton href={mentionsHref} variant="secondary">Ver menciones</LinkButton>
          </>
        }
      />

      {keyword.pausedForNoise ? (
        <Notice tone="warn">En pausa por exceso de ruido: la mayoría de las coincidencias fueron irrelevantes. Ajusta los términos requeridos o excluidos, las plataformas o el contexto; también puedes reanudarlo manualmente.</Notice>
      ) : null}
      {stats.noise.noisy ? (
        <Notice tone="bad">
          Hay demasiado ruido: solo {stats.noise.relevant} de {stats.noise.scored} menciones de los últimos 14 días fueron relevantes. Ajusta los términos requeridos o excluidos, o el contexto.
        </Notice>
      ) : null}

      <KpiStrip label="Actividad del término">
        <Stat label={<span className="inline-flex items-center gap-1">Menciones <InfoTip term="menciones" /></span>} value={compact(stats.mentions)} hint="todas las coincidencias" href={mentionsHref} />
        <Stat label={<span className="inline-flex items-center gap-1">Relevantes <InfoTip term="relevancia" /></span>} value={compact(stats.relevant)} hint={`${stats.feedback.relevant} marcadas relevantes, ${stats.feedback.notRelevant} no relevantes`} />
        <Stat label={<span className="inline-flex items-center gap-1">Últimos 7 días <InfoTip term="menciones" /></span>} value={compact(stats.last7d)} hint={stats.lastMentionAt ? `última ${timeAgo(stats.lastMentionAt)}` : 'sin menciones'} />
        <Stat label={<span className="inline-flex items-center gap-1">Este mes <InfoTip term="menciones" /></span>} value={compact(stats.thisMonth)} hint={keyword.cap ? `límite ${compact(keyword.cap.mentions)}` : 'sin límite'} />
      </KpiStrip>

      <div className="grid gap-6 @4xl:grid-cols-2">
        <Card index={1} title={<span className="inline-flex items-center gap-1">Límite mensual de menciones <InfoTip term="menciones" /></span>} description="Por mes calendario (UTC).">
          {keyword.cap ? (
            <div className="space-y-3 text-sm">
              <p className="tabular-nums">
                <span className="font-semibold">{compact(stats.thisMonth)}</span> de {compact(keyword.cap.mentions)} menciones usadas este mes
              </p>
              <Progress value={capUsed} aria-label="Uso del límite mensual de menciones" />
              {keyword.pausedForCap ? (
                <p className={`text-pretty ${TONE_TEXT.warning}`}>Alcanzó el límite: no registrará coincidencias hasta el primer día del próximo mes o hasta que aumentes el límite. Aun así, cuenta como día de monitoreo.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin límite de menciones.</p>
          )}
        </Card>

        <Card index={2} title="Actualización por plataforma" hint="Momento en que cada canal buscó publicaciones nuevas para este término." description="Las plataformas con transmisión en vivo, como Bluesky, no muestran un registro.">
          {keyword.polling.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no se consulta.</p>
          ) : (
            <dl className="divide-y text-sm">
              {keyword.polling.map((p) => (
                <div key={p.platform} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 first:pt-0 last:pb-0">
                  <dt className="text-muted-foreground">{platformName(p.platform)}</dt>
                  <dd className="flex flex-wrap items-center justify-end gap-2 text-right">
                    <span className={p.lastPolledAt ? 'text-foreground' : 'text-muted-foreground'}>{p.lastPolledAt ? timeAgo(p.lastPolledAt) : 'Nunca'}</span>
                    {p.emptyPolls > 0 ? <Badge tone={p.emptyPolls >= 10 ? 'warn' : 'neutral'} className="tabular-nums">{p.emptyPolls} consultas vacías seguidas</Badge> : null}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </Card>
      </div>

      {keyword.reviewSources.length > 0 ? (
        <section aria-labelledby="keyword-review-sources" className="space-y-3">
          <SectionHeading id="keyword-review-sources" icon={Star} title="Páginas de reseñas" description="Cada reseña de estas páginas se registra como mención." />
          <Table head={[
            <span className="inline-flex items-center gap-1">Página de reseñas <InfoTip text="Página conectada para recibir y monitorear reseñas." /></span>,
            <span className="inline-flex items-center gap-1">Países <InfoTip text="Mercados de App Store o Google Play que se consultan." /></span>,
            <span className="inline-flex items-center gap-1">Idioma <InfoTip text="Idioma de reseñas que se consulta cuando la plataforma permite elegirlo." /></span>,
            <span className="inline-flex items-center gap-1">Conectada <InfoTip text="Fecha en que se agregó esta página al monitoreo." /></span>,
          ]}>
            {keyword.reviewSources.map((src) => (
              <TableRow key={`${src.platform}:${src.id}`}>
                <TableCell className={td}>
                  <span className="font-medium">{platformName(src.platform)}</span>{' '}
                  <a href={src.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-sm break-all text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                    {src.id}
                    <ExternalLink aria-hidden className="size-3 shrink-0" />
                    <span className="sr-only">(se abre en otra pestaña)</span>
                  </a>
                </TableCell>
                <TableCell className={`${td} text-xs text-muted-foreground`}>{src.countries.join(', ').toUpperCase() || 'Una página'}</TableCell>
                <TableCell className={`${td} text-xs text-muted-foreground`}>{src.language ?? '—'}</TableCell>
                <TableCell className={`${td} text-xs text-muted-foreground`}>{date(src.connectedAt)}</TableCell>
              </TableRow>
            ))}
          </Table>
        </section>
      ) : null}

      <section aria-labelledby="keyword-settings" className="space-y-4">
        <SectionHeading id="keyword-settings" icon={SlidersHorizontal} title="Ajustes" description="Qué se busca, dónde y qué se descarta." />
        <KeywordForm keyword={keyword} groups={groups.data} />
      </section>
    </div>
  );
}


