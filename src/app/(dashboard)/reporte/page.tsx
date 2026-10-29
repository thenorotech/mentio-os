import Link from 'next/link';
import { Suspense } from 'react';
import { ArrowUpRight, ChartNoAxesCombined, FileText, Megaphone } from 'lucide-react';
import type { AnalyticsSummary, Mention } from '@mentio-dev/sdk';
import { Badge, Card, EmptyState, LinkButton, PageHeader, buttonClass } from '@/components/ui';
import { ReportActions } from '@/components/report/report-actions';
import { SocialReportSection, SocialReportSkeleton, loadSocialReport } from '@/components/report/social-section';
import styles from '@/components/report/report-print.module.css';
import { apifyConfigured } from '@/lib/apify';
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
        <EmptyState icon={FileText} title="Aún no registras tu candidato." action={<LinkButton href="/arranque" variant="primary">Ir al asistente</LinkButton>}>
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
  // Apify is read alongside Mentio and streamed in its own boundary: when it fails, the section is left out.
  const socialReport = apifyConfigured() ? loadSocialReport() : null;

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

  return (
    <article className={`${styles.sheet} space-y-4`}>
      <div className={`${styles.toolbar} flex flex-wrap items-start justify-between gap-3`}>
        <PageHeader
          title="Reporte ejecutivo"
          description={`Resumen de la conversación · ${candidate.name} · últimos 30 días`}
          actions={candidates.length > 1 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Selecciona candidato">
              {candidates.map((entity) => (
                <Link
                  key={entity.mainId}
                  href={candidateHref(entity.mainId)}
                  aria-current={entity.mainId === candidate.mainId ? 'page' : undefined}
                  className={buttonClass(entity.mainId === candidate.mainId ? 'primary' : 'secondary', 'sm')}
                >
                  {entity.name}
                </Link>
              ))}
            </nav>
          ) : null}
        />
        <ReportActions whatsappText={shareText} />
      </div>

      <header className="flex flex-wrap items-end justify-between gap-3 border-b pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Ágora · Reporte de campaña</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{candidate.name}</h1>
          <p className={`${styles.muted} mt-1 text-sm text-muted-foreground`}>{fromDate} al {reportDate} · últimos 30 días</p>
        </div>
        <div className="text-right text-sm">
          <p className={`${styles.muted} text-muted-foreground`}>Fecha del reporte</p>
          <p className="font-medium">{reportDate}</p>
        </div>
      </header>

      <section className={`${styles.section} rounded-xl border bg-card p-4 shadow-xs`} aria-labelledby="report-light-heading">
        <div className="flex flex-wrap items-start gap-3">
          <span className="mt-0.5 text-3xl" aria-hidden="true">{lightEmoji(light.color)}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="report-light-heading" className="text-base font-semibold">Semáforo del candidato</h2>
              <Badge tone={lightTone(light.color)}>{light.label}</Badge>
              {light.isCrisis ? <Badge tone="bad">Crisis</Badge> : null}
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6">{sentence}</p>
          </div>
        </div>
      </section>

      <section className={`${styles.section} rounded-xl border bg-card p-4 shadow-xs`} aria-labelledby="report-share-heading">
        <div className="mb-3 flex items-center gap-2">
          <ChartNoAxesCombined className="size-4 text-primary" aria-hidden="true" />
          <div>
            <h2 id="report-share-heading" className="text-sm font-semibold">Cara a cara · participación de voz</h2>
            <p className={`${styles.muted} text-xs text-muted-foreground`}>Comparación de menciones del candidato y sus adversarios.</p>
          </div>
        </div>
        {faceoffRows.length > 1 || candidateCount > 0 ? (
          <div className="space-y-3">
            {faceoffRows.map((row) => {
              const share = sharePercent(row.matched, totalFaceoff);
              return (
                <div key={row.mainId}>
                  <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2 text-sm">
                    <span className="font-medium">{row.name}{row.selected ? ' · tu candidato' : ''}</span>
                    <span className="tabular-nums">{share.toFixed(1)}% <span className={`${styles.muted} text-xs text-muted-foreground`}>({compact(row.matched)})</span></span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="img" aria-label={`${row.name}: ${share.toFixed(1)} por ciento de participación de voz`}>
                    <div className={`h-full rounded-full ${row.selected ? 'bg-primary' : 'bg-foreground/45'}`} style={{ width: `${Math.max(share, row.matched ? 1 : 0)}%` }} />
                  </div>
                </div>
              );
            })}
            {!competitors.length ? <p className={`${styles.muted} text-xs text-muted-foreground`}>Aún no hay adversarios activos para comparar.</p> : null}
          </div>
        ) : (
          <p className={`${styles.muted} text-sm text-muted-foreground`}>Aún no hay menciones del candidato o sus adversarios en este periodo.</p>
        )}
      </section>

      <div className="grid gap-4 @4xl:grid-cols-2">
        <section className={`${styles.section} rounded-xl border bg-card p-4 shadow-xs`} aria-labelledby="report-topics-heading">
          <div className="mb-3 flex items-center gap-2">
            <ChartNoAxesCombined className="size-4 text-primary" aria-hidden="true" />
            <div>
              <h2 id="report-topics-heading" className="text-sm font-semibold">Temas principales</h2>
              <p className={`${styles.muted} text-xs text-muted-foreground`}>Los tres temas de agenda con más menciones.</p>
            </div>
          </div>
          {rankedTopics.length ? (
            <ol className="divide-y">
              {rankedTopics.map((topic, index) => (
                <li key={topic.mainId} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                    <span className="truncate text-sm font-medium">{topic.name}</span>
                  </span>
                  <span className={`${styles.muted} whitespace-nowrap text-xs tabular-nums text-muted-foreground`}>{compact(topic.matched)} menciones</span>
                </li>
              ))}
            </ol>
          ) : (
          <p className={`${styles.muted} text-sm text-muted-foreground`}>{topics.length ? 'Aún no hay menciones de temas de agenda.' : 'Aún no registras temas activos para la agenda.'}</p>
          )}
        </section>

        <section className={`${styles.section} rounded-xl border bg-card p-4 shadow-xs`} aria-labelledby="report-posts-heading">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone className="size-4 text-primary" aria-hidden="true" />
            <div>
              <h2 id="report-posts-heading" className="text-sm font-semibold">Publicaciones con más alcance</h2>
              <p className={`${styles.muted} text-xs text-muted-foreground`}>Entre las menciones del candidato en este periodo.</p>
            </div>
          </div>
          {topMentions.length ? (
            <ol className="space-y-3">
              {topMentions.map((mention, index) => {
                const reach = mentionReach(mention);
                return (
                  <li key={mention.id} className="border-t pt-2.5 first:border-0 first:pt-0">
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 text-xs font-semibold text-muted-foreground">{index + 1}.</span>
                      <div className="min-w-0 flex-1">
                        <a href={mention.post.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm hover:text-primary">
                          {shortText(mention.post.text)} <ArrowUpRight className="inline size-3.5" aria-hidden="true" />
                        </a>
                        <p className={`${styles.muted} mt-1 text-xs text-muted-foreground`}>
                          {mention.author?.name ?? mention.author?.handle ?? 'Publicación'}
                          {reach !== null ? ` · ${compact(reach)} ${mention.post.engagement?.views !== null && mention.post.engagement?.views !== undefined ? 'vistas' : 'seguidores estimados'}` : ' · alcance sin dato'}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className={`${styles.muted} text-sm text-muted-foreground`}>Aún no hay publicaciones del candidato en este periodo.</p>
          )}
        </section>
      </div>
      {socialReport ? (
        <Suspense fallback={<SocialReportSkeleton />}>
          <SocialReportSection report={socialReport} />
        </Suspense>
      ) : null}
      <p className={`${styles.muted} flex items-center gap-1.5 text-xs text-muted-foreground`}>
        <ChartNoAxesCombined className="size-3.5" aria-hidden="true" />
        Los cálculos incluyen todas las variantes activas de cada candidato, adversario y tema.
        {candidate.mainId ? <span className="sr-only">Identificador principal: {candidate.mainId}</span> : null}
      </p>
    </article>
  );
}
