import { ArrowUpRight, ChartNoAxesCombined, FileText, Hash, Info, Megaphone, TrafficCone } from 'lucide-react';
import type { AnalyticsSummary, Mention } from '@mentio-dev/sdk';
import { Badge, EmptyState, KpiStrip, LinkButton, PageHeader, SectionHeading, Stat, TONE_TEXT, cx } from '@/components/ui';
import { LinkToggle } from '@/components/ui/client';
import { ReportActions } from '@/components/report/report-actions';
import styles from '@/components/report/report-print.module.css';
import { compact, day } from '@/lib/format';
import { groupCandidates, plainSentence, trafficLight } from '@/lib/insights';
import { mentio, unwrap } from '@/lib/mentio';
import type { SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Reporte ejecutivo' };

const RANGE = '30d';

function lightEmoji(color: ReturnType<typeof trafficLight>['color']) {
  return color === 'green' ? '🟢' : color === 'yellow' ? '🟡' : color === 'red' ? '🔴' : '⚪';
}

/** The light as a dot: the status classes (no hex), always next to its label. */
function lightDot(color: ReturnType<typeof trafficLight>['color']) {
  const tone = color === 'green' ? TONE_TEXT.positive : color === 'yellow' ? TONE_TEXT.warning : color === 'red' ? TONE_TEXT.negative : 'text-muted-foreground/60';
  return `bg-current ${tone}`;
}

function lightTone(color: ReturnType<typeof trafficLight>['color']): 'good' | 'warn' | 'bad' | 'neutral' {
  return color === 'green' ? 'good' : color === 'yellow' ? 'warn' : color === 'red' ? 'bad' : 'neutral';
}

function shortText(text: string, max = 220) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function mentionReach(mention: Mention) {
  return mention.post.engagement?.views ?? mention.author?.followers ?? null;
}

function sharePercent(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function sumSentiment(rows: Array<AnalyticsSummary['sentiment'] | undefined>) {
  return rows.reduce<AnalyticsSummary['sentiment']>((total, row) => ({
    positive: total.positive + (row?.positive ?? 0),
    neutral: total.neutral + (row?.neutral ?? 0),
    negative: total.negative + (row?.negative ?? 0),
    unclassified: total.unclassified + (row?.unclassified ?? 0),
  }), { positive: 0, neutral: 0, negative: 0, unclassified: 0 });
}

function combineSummaries(rows: AnalyticsSummary[]) {
  const first = rows[0];
  return {
    window: first.window,
    matched: rows.reduce((total, row) => total + row.matched, 0),
    sentiment: sumSentiment(rows.map((row) => row.sentiment)),
    previous: {
      matched: rows.reduce((total, row) => total + (row.previous?.matched ?? 0), 0),
      sentiment: sumSentiment(rows.map((row) => row.previous?.sentiment)),
    },
  };
}

export default async function ReportePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const api = mentio();
  const keywords = unwrap(await api.listKeywords({
    query: { status: ['active'], sort: 'term', limit: 500 },
  })).data;
  const entities = groupCandidates(keywords);
  const candidates = entities.filter((entity) => entity.kind === 'brand');

  if (!candidates.length) {
    return (
      <div>
        <PageHeader title="Reporte ejecutivo" description="Una lectura clara de la conversación de tu candidato en los últimos 30 días." />
        <EmptyState icon={FileText} title="Aún no registras a tu candidato" action={<LinkButton href="/arranque" variant="primary">Ir al asistente de arranque</LinkButton>}>
          Cuando agregues el nombre de tu candidato, aquí podrás imprimir el reporte y compartir su resumen.
        </EmptyState>
      </div>
    );
  }

  const requestedCandidate = typeof params.candidate === 'string' ? params.candidate : undefined;
  const candidate = candidates.find((entity) => entity.mainId === requestedCandidate) ?? candidates[0];
  const competitors = entities.filter((entity) => entity.kind === 'competitor');
  const topics = entities.filter((entity) => entity.kind === 'topic');
  const contenderIds = [...candidate.keywordIds, ...competitors.flatMap((entity) => entity.keywordIds)];
  const allReportIds = [...contenderIds, ...topics.flatMap((entity) => entity.keywordIds)];

  const [summaryChunks, voiceChunks] = await Promise.all([
    Promise.all(chunks(candidate.keywordIds, 50).map((keywordIds) =>
      api.getAnalyticsSummary({ query: { range: RANGE, keywordIds, compare: true } }).then(unwrap),
    )),
    Promise.all(chunks(allReportIds, 50).map((keywordIds) =>
      api.getShareOfVoice({ query: { range: RANGE, keywordIds } }).then(unwrap),
    )),
  ]);
  const summary = combineSummaries(summaryChunks);

  const countsByKeywordId = new Map(voiceChunks.flatMap((chunk) => chunk.data).map((row) => [row.keyword.id, row.matched] as const));
  const countFor = (entity: (typeof entities)[number]) => entity.keywordIds.reduce((total, id) => total + (countsByKeywordId.get(id) ?? 0), 0);
  const candidateCount = countFor(candidate);
  const competitorRows = competitors
    .map((entity) => ({ ...entity, matched: countFor(entity) }))
    .sort((a, b) => b.matched - a.matched || a.name.localeCompare(b.name, 'es'));
  const totalFaceoff = candidateCount + competitorRows.reduce((total, entity) => total + entity.matched, 0);
  const faceoffRows = [
    { ...candidate, matched: candidateCount, selected: true },
    ...competitorRows.slice(0, 3).map((entity) => ({ ...entity, selected: false })),
  ];
  const rankedTopics = topics
    .map((entity) => ({ ...entity, matched: countFor(entity) }))
    .filter((entity) => entity.matched > 0)
    .sort((a, b) => b.matched - a.matched || a.name.localeCompare(b.name, 'es'))
    .slice(0, 3);
  const topicName = rankedTopics[0]?.name;
  const light = trafficLight(summary, summary.previous);
  const sentence = plainSentence(summary, summary.previous, topicName);
  const reportDate = day(summary.window.to);
  const fromDate = day(summary.window.from);

  const mentions = summary.matched > 0
    ? (await Promise.all(chunks(candidate.keywordIds, 50).map((keywordIds) =>
      api.searchMentions({
        query: {
          keywordIds,
          since: `${summary.window.from}T00:00:00.000Z`,
          sort: 'priority',
          limit: 100,
        },
      }).then(unwrap),
    ))).flatMap((page) => page.data)
    : [];
  const uniquePosts = new Map<string, Mention>();
  for (const mention of mentions) {
    const previous = uniquePosts.get(mention.post.url);
    if (!previous || (mentionReach(mention) ?? -1) > (mentionReach(previous) ?? -1)) uniquePosts.set(mention.post.url, mention);
  }
  const uniqueMentions = [...uniquePosts.values()];
  const topMentions = [...uniqueMentions]
    .sort((a, b) => (mentionReach(b) ?? -1) - (mentionReach(a) ?? -1) || b.post.publishedAt.localeCompare(a.post.publishedAt))
    .slice(0, 3);

  const shareText = [
    `${lightEmoji(light.color)} Reporte ejecutivo de ${candidate.name} · ${reportDate}`,
    `${lightEmoji(light.color)} ${light.label}. ${sentence}`,
    '🥊 Participación de voz:',
    ...faceoffRows.map((row) => `• ${row.name}: ${sharePercent(row.matched, totalFaceoff).toFixed(1)}% (${compact(row.matched)} menciones)`),
    '🎯 Temas principales:',
    ...(rankedTopics.length ? rankedTopics.map((topic, index) => `${index + 1}. ${topic.name} · ${compact(topic.matched)} menciones`) : ['Aún no hay temas con menciones.']),
    '📣 Publicaciones con más alcance:',
    ...(topMentions.length
      ? topMentions.map((mention, index) => `${index + 1}. ${shortText(mention.post.text, 140)}${mentionReach(mention) !== null ? ` · ${compact(mentionReach(mention))} ${mention.post.engagement?.views !== null && mention.post.engagement?.views !== undefined ? 'vistas' : 'seguidores estimados'}` : ''}\n${mention.post.url}`)
      : ['Aún no hay publicaciones para mostrar.']),
  ].join('\n');

  const candidateHref = (id: string) => `/reporte?candidate=${encodeURIComponent(id)}`;
  const reachLabel = (mention: Mention) => (mention.post.engagement?.views !== null && mention.post.engagement?.views !== undefined ? 'vistas' : 'seguidores estimados');

  // The KPI strip reads the numbers already fetched above: no extra request.
  const previousMatched = summary.previous.matched;
  const matchedDelta = previousMatched > 0 ? ((summary.matched - previousMatched) / previousMatched) * 100 : null;
  const classified = summary.sentiment.positive + summary.sentiment.neutral + summary.sentiment.negative;
  const positiveShare = sharePercent(summary.sentiment.positive, classified);
  const negativeShare = sharePercent(summary.sentiment.negative, classified);
  const candidateShare = sharePercent(candidateCount, totalFaceoff);

  return (
    <article className={cx(styles.sheet, 'grid gap-6')} aria-labelledby="report-title">
      <div className={cx(styles.toolbar, '[&>header]:mb-0')}>
        <PageHeader
          title="Reporte ejecutivo"
          description={`Resumen de la conversación de ${candidate.name} en los últimos 30 días, listo para imprimir o compartir.`}
          actions={(
            <>
              {candidates.length > 1 ? (
                <div role="group" aria-label="Candidato del reporte">
                  <LinkToggle
                    current={candidate.mainId}
                    items={candidates.map((entity) => ({ value: entity.mainId, label: entity.name, href: candidateHref(entity.mainId) }))}
                  />
                </div>
              ) : null}
              <ReportActions whatsappText={shareText} />
            </>
          )}
        />
      </div>

      <header className={cx(styles.section, 'flex flex-wrap items-end justify-between gap-3 border-b pb-4')}>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-wide text-primary uppercase">Ágora · Reporte de campaña</p>
          <h2 id="report-title" className="mt-1 text-xl font-semibold tracking-tight text-balance">{candidate.name}</h2>
          <p className={cx(styles.muted, 'mt-1 text-sm text-muted-foreground tabular-nums')}>Del {fromDate} al {reportDate}</p>
        </div>
        <dl className="text-sm @lg:text-right">
          <dt className={cx(styles.muted, 'text-xs text-muted-foreground')}>Fecha del reporte</dt>
          <dd className="font-medium tabular-nums">{reportDate}</dd>
        </dl>
      </header>

      <KpiStrip label="Indicadores del periodo" className={styles.section}>
        <Stat label="Menciones" value={compact(summary.matched)} delta={matchedDelta} hint={previousMatched > 0 ? `${compact(previousMatched)} el periodo anterior` : 'Sin periodo anterior para comparar'} />
        <Stat label="Participación de voz" value={`${candidateShare.toFixed(1)}%`} hint={competitors.length ? 'Frente a sus adversarios' : 'Sin adversarios activos'} />
        <Stat label="Positivas" value={`${positiveShare.toFixed(0)}%`} tone={classified > 0 && positiveShare > negativeShare ? 'positive' : 'default'} hint={`${compact(summary.sentiment.positive)} menciones`} />
        <Stat label="Negativas" value={`${negativeShare.toFixed(0)}%`} tone={classified > 0 && negativeShare > positiveShare ? 'negative' : 'default'} hint={`${compact(summary.sentiment.negative)} menciones`} />
      </KpiStrip>

      <section className={cx(styles.section, 'grid gap-4 rounded-xl border bg-card p-4 shadow-xs')} aria-labelledby="report-light-heading">
        <SectionHeading
          id="report-light-heading"
          icon={TrafficCone}
          title="Semáforo del candidato"
          description="Tono y volumen de la conversación frente al periodo anterior."
          aside={(
            <span className="flex flex-wrap items-center gap-1.5">
              <Badge tone={lightTone(light.color)}>
                <span aria-hidden className={cx('size-2 rounded-full', lightDot(light.color))} />
                {light.label}
              </Badge>
              {light.isCrisis ? <Badge tone="bad">Crisis</Badge> : null}
            </span>
          )}
        />
        <p className="max-w-3xl text-sm leading-6 text-pretty">{sentence}</p>
      </section>

      <section className={cx(styles.section, 'grid gap-4 rounded-xl border bg-card p-4 shadow-xs')} aria-labelledby="report-share-heading">
        <SectionHeading
          id="report-share-heading"
          icon={ChartNoAxesCombined}
          title="Cara a cara · participación de voz"
          description="Menciones del candidato frente a sus tres adversarios con más conversación."
        />
        {faceoffRows.length > 1 || candidateCount > 0 ? (
          <ul className="grid gap-3">
            {faceoffRows.map((row) => {
              const share = sharePercent(row.matched, totalFaceoff);
              return (
                <li key={row.mainId}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5 font-medium">
                      <span className="truncate">{row.name}</span>
                      {row.selected ? <Badge tone="accent">Tu candidato</Badge> : null}
                    </span>
                    <span className="tabular-nums">
                      {share.toFixed(1)}% <span className={cx(styles.muted, 'text-xs text-muted-foreground')}>({compact(row.matched)} menciones)</span>
                    </span>
                  </div>
                  <div className={cx(styles.bar, 'h-2 overflow-hidden rounded-full bg-muted')} role="img" aria-label={`${row.name}: ${share.toFixed(1)} por ciento de participación de voz`}>
                    <div className={cx('h-full rounded-full', row.selected ? 'bg-primary' : 'bg-foreground/40')} style={{ width: `${Math.max(share, row.matched ? 1 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
            {!competitors.length ? <li className={cx(styles.muted, 'text-xs text-muted-foreground')}>Aún no hay adversarios activos para comparar.</li> : null}
          </ul>
        ) : (
          <p className={cx(styles.muted, 'rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground')}>Aún no hay menciones del candidato ni de sus adversarios en este periodo.</p>
        )}
      </section>

      <div className="grid gap-4 @4xl:grid-cols-2">
        <section className={cx(styles.section, 'grid content-start gap-4 rounded-xl border bg-card p-4 shadow-xs')} aria-labelledby="report-topics-heading">
          <SectionHeading id="report-topics-heading" icon={Hash} title="Temas principales" description="Los tres temas de agenda con más menciones." />
          {rankedTopics.length ? (
            <ol className="divide-y">
              {rankedTopics.map((topic, index) => (
                <li key={topic.mainId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="truncate text-sm font-medium">{topic.name}</span>
                  </span>
                  <span className={cx(styles.muted, 'text-xs whitespace-nowrap text-muted-foreground tabular-nums')}>{compact(topic.matched)} menciones</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className={cx(styles.muted, 'rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground')}>{topics.length ? 'Aún no hay menciones de los temas de agenda.' : 'Aún no registras temas activos para la agenda.'}</p>
          )}
        </section>

        <section className={cx(styles.section, 'grid content-start gap-4 rounded-xl border bg-card p-4 shadow-xs')} aria-labelledby="report-posts-heading">
          <SectionHeading id="report-posts-heading" icon={Megaphone} title="Publicaciones con más alcance" description="Entre las menciones del candidato en este periodo." />
          {topMentions.length ? (
            <ol className="divide-y">
              {topMentions.map((mention, index) => {
                const reach = mentionReach(mention);
                return (
                  <li key={mention.id} className="flex items-start gap-2.5 py-2.5 first:pt-0 last:pb-0">
                    <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <a href={mention.post.url} target="_blank" rel="noreferrer" className="line-clamp-2 rounded-sm text-sm text-pretty transition-colors hover:text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                        {shortText(mention.post.text)} <ArrowUpRight className="inline size-3.5" aria-hidden="true" />
                        <span className="sr-only"> (se abre en otra pestaña)</span>
                      </a>
                      <p className={cx(styles.muted, 'mt-1 text-xs text-muted-foreground tabular-nums')}>
                        {mention.author?.name ?? mention.author?.handle ?? 'Publicación'}
                        {reach !== null ? ` · ${compact(reach)} ${reachLabel(mention)}` : ' · alcance sin dato'}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={cx(styles.muted, 'rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground')}>Aún no hay publicaciones del candidato en este periodo.</p>
          )}
        </section>
      </div>

      <p className={cx(styles.muted, 'flex items-start gap-1.5 text-xs text-pretty text-muted-foreground')}>
        <Info className="mt-px size-3.5 shrink-0" aria-hidden="true" />
        Los cálculos incluyen todas las variantes activas de cada candidato, adversario y tema.
        {candidate.mainId ? <span className="sr-only">Identificador principal: {candidate.mainId}</span> : null}
      </p>
    </article>
  );
}
