import { notFound } from 'next/navigation';
import { Badge, Card, LinkButton, Notice, PageHeader, Stat, Table, td, TableCell, TableRow, KpiStrip } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { compact, date, platformName, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { KeywordActions } from '../keyword-actions';
import { KeywordForm } from '../keyword-form';
import { KeywordBadges, KIND_LABELS, platformsLabel, variantOf } from '../shared';

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

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/keywords', label: 'Candidatos y temas' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {keyword.term}
            <Badge tone={keyword.kind === 'brand' ? 'accent' : keyword.kind === 'competitor' ? 'warn' : 'neutral'}>{KIND_LABELS[keyword.kind]}</Badge>
            {variantOf(keyword.context) ? <Badge tone="outline">Variante de {variantOf(keyword.context)}</Badge> : null}
            <KeywordBadges keyword={keyword} />
          </span>
        }
        description={`${KIND_LABELS[keyword.kind]} en ${keyword.group.name}. ${platformsLabel(keyword)}. Monitoreado desde ${date(keyword.createdAt)}.`}
        actions={
          <>
            <LinkButton href={mentionsHref}>Ver menciones</LinkButton>
            <KeywordActions keyword={keyword} backToList size="md" />
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

      <KpiStrip>
        <Stat label={<span className="inline-flex items-center gap-1">Menciones <InfoTip term="menciones" /></span>} value={compact(stats.mentions)} hint="todas las coincidencias" href={mentionsHref} />
        <Stat label={<span className="inline-flex items-center gap-1">Relevantes <InfoTip term="relevancia" /></span>} value={compact(stats.relevant)} hint={`${stats.feedback.relevant} marcadas relevantes, ${stats.feedback.notRelevant} no relevantes`} />
        <Stat label={<span className="inline-flex items-center gap-1">Últimos 7 días <InfoTip term="menciones" /></span>} value={compact(stats.last7d)} hint={stats.lastMentionAt ? `última ${timeAgo(stats.lastMentionAt)}` : 'sin menciones'} />
        <Stat label={<span className="inline-flex items-center gap-1">Este mes <InfoTip term="menciones" /></span>} value={compact(stats.thisMonth)} hint={keyword.cap ? `límite ${compact(keyword.cap.mentions)}` : 'sin límite'} />
      </KpiStrip>

      <div className="grid gap-6 @4xl:grid-cols-2">
        <Card title={<span className="inline-flex items-center gap-1">Límite mensual de menciones <InfoTip term="menciones" /></span>}>
          {keyword.cap ? (
            <div className="space-y-2 text-sm">
              <p>
                {compact(stats.thisMonth)} de {compact(keyword.cap.mentions)} menciones usadas este mes (UTC).
              </p>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, (stats.thisMonth / Math.max(1, keyword.cap.mentions)) * 100)}%` }} />
              </div>
              {keyword.pausedForCap ? (
                <p className="text-amber-700">Alcanzó el límite: no registrará coincidencias hasta el primer día del próximo mes o hasta que aumentes el límite. Aun así, cuenta como día de monitoreo.</p>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sin límite de menciones.</p>
          )}
        </Card>

        <Card title={<span className="inline-flex items-center gap-1">Actualización por plataforma <InfoTip text="Momento en que cada canal buscó publicaciones nuevas para este término." /></span>} description="Consulta el estado del monitoreo. Las plataformas con transmisión en vivo, como Bluesky, no muestran un registro.">
          {keyword.polling.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aún no se consulta.</p>
          ) : (
            <ul className="divide-y divide-line text-sm">
              {keyword.polling.map((p) => (
                <li key={p.platform} className="flex items-center justify-between gap-2 py-1.5">
                  <span>{platformName(p.platform)}</span>
                  <span className="flex items-center gap-2 text-xs text-muted-foreground">
                    {p.lastPolledAt ? timeAgo(p.lastPolledAt) : 'nunca'}
                    {p.emptyPolls > 0 ? <Badge tone={p.emptyPolls >= 10 ? 'warn' : 'neutral'}>{p.emptyPolls} consultas vacías seguidas</Badge> : null}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {keyword.reviewSources.length > 0 ? (
        <Table head={[
          <span className="inline-flex items-center gap-1">Página de reseñas <InfoTip text="Página conectada para recibir y monitorear reseñas." /></span>,
          <span className="inline-flex items-center gap-1">Países <InfoTip text="Mercados de App Store o Google Play que se consultan." /></span>,
          <span className="inline-flex items-center gap-1">Idioma <InfoTip text="Idioma de reseñas que se consulta cuando la plataforma permite elegirlo." /></span>,
          <span className="inline-flex items-center gap-1">Conectada <InfoTip text="Fecha en que se agregó esta página al monitoreo." /></span>,
        ]}>
          {keyword.reviewSources.map((src) => (
            <TableRow key={`${src.platform}:${src.id}`}>
              <TableCell className={td}>
                {platformName(src.platform)}{' '}
                <a href={src.url} target="_blank" rel="noreferrer" className="break-all text-primary hover:underline">{src.id}</a>
              </TableCell>
              <TableCell className={`${td} text-xs text-muted-foreground`}>{src.countries.join(', ').toUpperCase() || 'Una página'}</TableCell>
              <TableCell className={`${td} text-xs text-muted-foreground`}>{src.language ?? ''}</TableCell>
              <TableCell className={`${td} text-xs text-muted-foreground`}>{date(src.connectedAt)}</TableCell>
            </TableRow>
          ))}
        </Table>
      ) : null}

      <div>
        <h2 className="mb-3 text-lg font-semibold">Ajustes</h2>
        <KeywordForm keyword={keyword} groups={groups.data} />
      </div>
    </div>
  );
}


