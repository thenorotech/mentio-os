import { Suspense } from 'react';
import type { AnalyticsSeries, Mention } from '@mentio-dev/sdk';
import { Activity, CalendarDays, ChartNoAxesCombined, Hash, MessageSquareText, Radio } from 'lucide-react';
import { BrandInsightCard } from '@/components/home/brand-insight-card';
import { CrisisBanner } from '@/components/home/crisis-banner';
import { ConversationChart, DailyToneChart, PlatformDonut, type ConversationSeries, type DailyPoint, type PlatformDatum } from '@/components/home/home-charts';
import { HomeKpi, type KpiChange } from '@/components/home/home-kpi';
import { HomeSetup } from '@/components/home/home-setup';
import { QuickLinks } from '@/components/home/quick-links';
import { RecentMentions } from '@/components/home/recent-mentions';
import { SocialPulseCard, SocialPulseSkeleton, loadSocialPulse } from '@/components/home/social-pulse-card';
import { CHART_COLORS, Card, EmptyState, KpiStrip, LinkButton, PageHeader, SectionHeading, TONE_TEXT } from '@/components/ui';
import { LinkToggle } from '@/components/ui/client';
import { apifyConfigured } from '@/lib/apify';
import { compact, day, platformName } from '@/lib/format';
import { groupCandidates, sentimentScore, trafficLight, type CandidateGroup } from '@/lib/insights';
import { mentio, unwrap } from '@/lib/mentio';
import { one, withParams, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Inicio' };

const RANGES = ['7d', '30d', '90d'] as const;
type HomeRange = (typeof RANGES)[number];
type Point = AnalyticsSeries['data'][number]['points'][number];

/** Series and platforms share the chart palette (brand first), as every chart in the app. */
const SERIES_COLORS = CHART_COLORS;
const PLATFORM_COLORS = CHART_COLORS;
const compactNumber = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });

function periodChange(current: number, previous: number | null | undefined, direction: 'up' | 'down' | 'neutral'): KpiChange | null {
  if (previous === null || previous === undefined) return null;
  const difference = previous === 0 ? current === 0 ? 0 : Number.POSITIVE_INFINITY : ((current - previous) / previous) * 100;
  if (difference === 0) return { label: 'Sin cambio', tone: 'muted' };
  if (!Number.isFinite(difference)) return { label: 'Nuevo', tone: direction === 'down' ? 'bad' : direction === 'neutral' ? 'muted' : 'good' };
  const up = difference > 0;
  const tone = direction === 'neutral' ? 'muted' : (direction === 'up' ? up : !up) ? 'good' : 'bad';
  return { label: `${up ? '+' : ''}${Math.round(difference)}%`, tone };
}

function pointChange(current: number | null, previous: number | null): KpiChange | null {
  if (current === null || previous === null) return null;
  const difference = Math.round(current - previous);
  if (difference === 0) return { label: 'Sin cambio', tone: 'muted' };
  return { label: `${difference > 0 ? '+' : ''}${difference} pts`, tone: difference > 0 ? 'good' : 'bad' };
}

function topicTone(topic: { positive: number; neutral: number; negative: number }) {
  const classified = topic.positive + topic.neutral + topic.negative;
  if (!classified) return { color: '#9ca3af', label: 'Sin tono clasificado' };
  const score = (topic.positive - topic.negative) / classified;
  if (score >= 0.15) return { color: '#15803d', label: 'Predomina el tono positivo' };
  if (score <= -0.15) return { color: '#e11d48', label: 'Predomina el tono negativo' };
  return { color: '#d97706', label: 'Tono mixto o neutral' };
}

function greetingActions(range: HomeRange, params: SearchParams) {
  return (
    <div role="group" aria-label="Periodo" className="flex items-center gap-2">
      <CalendarDays aria-hidden className="size-4 shrink-0 text-muted-foreground" />
      <LinkToggle
        current={range}
        items={RANGES.map((value) => ({
          value,
          label: value === '7d' ? '7 días' : value === '30d' ? '30 días' : '90 días',
          href: withParams('/', params, { range: value, from: undefined, to: undefined }),
        }))}
      />
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const askedRange = one(params, 'range');
  const range: HomeRange = RANGES.includes(askedRange as HomeRange) ? askedRange as HomeRange : '30d';
  const api = mentio();
  const keywordList = await api.listKeywords({ query: { limit: 500, sort: 'term' } }).then(unwrap);
  const keywordGroups = groupCandidates(keywordList.data);
  const brands = keywordGroups.filter((candidate) => candidate.kind === 'brand');

  if (!brands.length) {
    return (
      <div className="@container/home space-y-6">
        <PageHeader
          title="Buen día, equipo"
          description="Configura tu campaña para empezar a escuchar lo que se dice de tus candidatos."
          actions={greetingActions(range, params)}
        />
        <HomeSetup full />
      </div>
    );
  }

  const keywordById = new Map(keywordList.data.map((keyword) => [keyword.id, keyword]));
  const campaignId = keywordById.get(brands[0].mainId)?.group.id;
  const inCampaign = (candidate: CandidateGroup) => keywordById.get(candidate.mainId)?.group.id === campaignId;
  const candidate = brands.find(inCampaign) ?? brands[0];
  const campaignName = keywordById.get(candidate.mainId)?.group.name ?? 'Tu campaña';
  const competitors = keywordGroups.filter((group) => group.kind === 'competitor' && inCampaign(group));
  const topics = keywordGroups.filter((group) => group.kind === 'topic' && inCampaign(group));
  const entities = [candidate, ...competitors];
  // Apify is read alongside Mentio and streamed in its own boundary: it never holds or breaks the page.
  const socialPulse = apifyConfigured() ? loadSocialPulse() : null;

  const [entityData, platformBreakdown, topicSeries] = await Promise.all([
    Promise.all(entities.map(async (entity, index) => {
      const [summary, series] = await Promise.all([
        api.getAnalyticsSummary({ query: { range, compare: true, keywordIds: entity.keywordIds } }).then(unwrap),
        api.getAnalyticsSeries({ query: { range, bucket: 'day', keywordIds: entity.keywordIds } }).then(unwrap),
      ]);
      return { entity, summary, points: series.data[0]?.points ?? [], color: SERIES_COLORS[index % SERIES_COLORS.length] };
    })),
    api.getAnalyticsBreakdown({ query: { range, by: 'platform', keywordIds: candidate.keywordIds } }).then(unwrap),
    topics.length
      ? api.getAnalyticsSeries({ query: { range, bucket: 'day', by: 'keyword', keywordIds: topics.flatMap((topic) => topic.keywordIds) } }).then(unwrap)
      : Promise.resolve(null),
  ]);

  const candidateData = entityData[0];
  const summary = candidateData.summary;
  const previous = summary.previous;
  const candidatePoints: Point[] = candidateData.points;
  const entitySummaries = entityData.map((item) => item.summary);
  const totalMentions = entitySummaries.reduce((sum, item) => sum + item.matched, 0);
  const previousTotalMentions = entitySummaries.reduce((sum, item) => sum + (item.previous?.matched ?? 0), 0);
  const voiceShare = competitors.length && totalMentions ? summary.matched / totalMentions * 100 : null;
  const previousVoiceShare = competitors.length && previousTotalMentions ? (previous?.matched ?? 0) / previousTotalMentions * 100 : null;
  const classified = summary.sentiment.positive + summary.sentiment.neutral + summary.sentiment.negative;
  const previousClassified = previous ? previous.sentiment.positive + previous.sentiment.neutral + previous.sentiment.negative : 0;
  const toneScore = classified ? Math.round(sentimentScore(summary.sentiment) * 100) : null;
  const previousToneScore = previous && previousClassified ? Math.round(sentimentScore(previous.sentiment) * 100) : null;
  const reachMetric = summary.reach.followers > 0;
  const [positiveMentions, negativeMentions] = await Promise.all([
    api.searchMentions({ query: { keywordIds: candidate.keywordIds, sentiments: ['positive'], sort: 'newest', limit: 100, since: `${summary.window.from.slice(0, 10)}T00:00:00.000Z`, until: `${summary.window.to.slice(0, 10)}T23:59:59.999Z` } }).then(unwrap),
    api.searchMentions({ query: { keywordIds: candidate.keywordIds, sentiments: ['negative'], sort: 'newest', limit: 100, since: `${summary.window.from.slice(0, 10)}T00:00:00.000Z`, until: `${summary.window.to.slice(0, 10)}T23:59:59.999Z` } }).then(unwrap),
  ]);

  const audience = reachMetric ? summary.reach.followers : summary.people;
  const previousAudience = reachMetric ? previous?.reach.followers : previous?.people;
  const voiceDaily = competitors.length ? candidatePoints.map((point, index) => {
    const denominator = entityData.reduce((sum, item) => sum + (item.points[index]?.matched ?? 0), 0);
    return denominator ? candidatePoints[index].matched / denominator * 100 : 0;
  }) : [];
  const toneDaily = candidatePoints.map((point) => ({
    matched: point.matched,
    positive: point.positive,
    neutral: point.neutral,
    negative: point.negative,
  }));
  const lineSeries: ConversationSeries[] = entityData.map(({ entity, color, points }) => ({
    name: entity.name,
    color,
    points: points.map((point) => ({ date: point.date, matched: point.matched })),
  }));
  const platformData: PlatformDatum[] = platformBreakdown.data
    .filter((row) => row.matched > 0)
    .map((row, index) => ({ label: platformName(row.key), value: row.matched, color: PLATFORM_COLORS[index % PLATFORM_COLORS.length] }));

  const topicByKeyword = new Map(topics.flatMap((topic) => topic.keywordIds.map((id) => [id, topic] as const)));
  const topicTotals = new Map<string, { topic: CandidateGroup; matched: number; positive: number; neutral: number; negative: number }>();
  for (const series of topicSeries?.data ?? []) {
    const id = series.keyword?.id;
    const topic = id ? topicByKeyword.get(id) : undefined;
    if (!topic) continue;
    const current = topicTotals.get(topic.mainId) ?? { topic, matched: 0, positive: 0, neutral: 0, negative: 0 };
    for (const point of series.points) {
      current.matched += point.matched;
      current.positive += point.positive;
      current.neutral += point.neutral;
      current.negative += point.negative;
    }
    topicTotals.set(topic.mainId, current);
  }
  const topTopics = [...topicTotals.values()].sort((a, b) => b.matched - a.matched).slice(0, 5);
  const mainTopic = topTopics[0]?.topic.name;
  const light = trafficLight(summary, previous);
  const crisisGrowth = previous?.sentiment.negative === 0
    ? Number.POSITIVE_INFINITY
    : previous ? (summary.sentiment.negative - previous.sentiment.negative) / previous.sentiment.negative * 100 : null;
  const crisisHref = `/mentions?${new URLSearchParams({
    keywordIds: candidate.keywordIds.join(','),
    sentiments: 'negative',
    since: `${summary.window.from.slice(0, 10)}T00:00:00.000Z`,
    until: `${summary.window.to.slice(0, 10)}T23:59:59.999Z`,
  })}`;
  const toneColor = toneScore === null ? 'text-muted-foreground' : toneScore <= -15 ? TONE_TEXT.negative : toneScore >= 15 ? TONE_TEXT.positive : TONE_TEXT.warning;
  const recentPositive: Mention[] = positiveMentions.data.slice(0, 5);
  const recentNegative: Mention[] = negativeMentions.data.slice(0, 5);
  const periodLabel = `${day(summary.window.from)} al ${day(summary.window.to)} · ${summary.window.days} días`;

  return (
    <div className="@container/home space-y-6">
      <PageHeader
        title="Buen día, equipo"
        description={<span><strong className="font-semibold text-foreground">{campaignName}</strong><span className="mx-1.5 text-muted-foreground">·</span>{periodLabel}</span>}
        actions={greetingActions(range, params)}
      />

      <Suspense fallback={null}>
        <HomeSetup />
      </Suspense>

      {light.isCrisis ? <CrisisBanner candidateName={candidate.name} negativeMentions={summary.sentiment.negative} growth={Number.isFinite(crisisGrowth) ? crisisGrowth : null} href={crisisHref} /> : null}

      <KpiStrip label="Indicadores de campaña">
        <HomeKpi label="Menciones del candidato" value={compactNumber.format(summary.matched)} change={periodChange(summary.matched, previous?.matched, 'neutral')} spark={candidatePoints.map((point) => point.matched)} hint="Menciones por día" />
        <HomeKpi
          label={reachMetric ? 'Alcance estimado' : 'Autores únicos'}
          value={compactNumber.format(audience)}
          change={periodChange(audience, previousAudience, 'up')}
          spark={candidatePoints.map((point) => point.matched)}
          hint={reachMetric ? 'Seguidores conocidos · menciones por día' : 'Personas que publicaron · actividad diaria'}
        />
        <HomeKpi label="Tono" value={toneScore === null ? 'Sin datos' : `${toneScore > 0 ? '+' : ''}${toneScore}`} change={pointChange(toneScore, previousToneScore)} spark={candidatePoints.map((point) => {
          const total = point.positive + point.neutral + point.negative;
          return total ? Math.round((point.positive - point.negative) / total * 100) : 0;
        })} valueClassName={toneColor} sparkTone={toneScore !== null && toneScore < 0 ? 'bad' : 'accent'} hint="Índice de −100 a +100" />
        <HomeKpi label="Participación de voz" value={voiceShare === null ? '—' : `${voiceShare.toFixed(1)}%`} change={voiceShare === null ? null : pointChange(voiceShare, previousVoiceShare)} spark={voiceDaily} hint={competitors.length ? 'Frente a adversarios registrados' : 'Agrega adversarios para comparar'} />
        <HomeKpi label="Menciones negativas" value={compactNumber.format(summary.sentiment.negative)} change={periodChange(summary.sentiment.negative, previous?.sentiment.negative, 'down')} spark={candidatePoints.map((point) => point.negative)} sparkTone="bad" hint="Críticas detectadas por día" />
      </KpiStrip>

      <section aria-label="Resumen del candidato">
        <BrandInsightCard candidate={candidate} summary={summary} previous={previous} topic={mainTopic} />
      </section>

      <section aria-label="Conversación diaria" className="space-y-3">
        <SectionHeading icon={Activity} title="Conversación en el tiempo" description={`Menciones por día: ${candidate.name} frente a sus adversarios.`} aside={periodLabel} />
        <Card index={0}>
          {lineSeries.some((series) => series.points.some((point) => point.matched > 0)) ? (
            <ConversationChart series={lineSeries} />
          ) : (
            <EmptyState compact icon={ChartNoAxesCombined} title="Todavía no hay conversación en este periodo" action={<LinkButton href="/keywords/new" variant="primary" size="sm">Revisar términos</LinkButton>}>
              Cuando se registren publicaciones sobre {candidate.name}, aquí verás el cambio diario y la comparación con cada adversario.
            </EmptyState>
          )}
        </Card>
      </section>

      <section aria-label="Canales, tono y temas" className="grid gap-4 @3xl/home:grid-cols-3">
        <Card index={1} title="Plataformas" hint="Menciones del candidato agrupadas por la red o el sitio donde se publicaron." description="Dónde se concentra la conversación sobre tu candidato.">
          {platformData.length ? (
            <div className="grid items-center gap-2 @lg:grid-cols-[1fr_0.8fr]">
              <PlatformDonut data={platformData} />
              <ul className="space-y-2">
                {platformData.slice(0, 6).map((item) => <li key={item.label} className="flex items-center justify-between gap-2 text-xs"><span className="flex min-w-0 items-center gap-2"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.label}</span></span><span className="shrink-0 font-medium tabular-nums">{compact(item.value)}</span></li>)}
              </ul>
            </div>
          ) : <EmptyState compact icon={Radio} title="Aún no hay plataformas con menciones" action={<LinkButton href="/keywords/new" variant="secondary" size="sm">Revisar términos</LinkButton>}>Al llegar publicaciones, aquí verás qué canales concentran la conversación.</EmptyState>}
        </Card>

        <Card index={2} title="Tono por día" hint="Cada mención clasificada como positiva, neutral o negativa, contada por día." description="Menciones positivas, neutrales y negativas.">
          {toneDaily.some((point) => point.positive + point.neutral + point.negative > 0)
            ? <DailyToneChart data={toneDaily.map((point, index) => ({ ...point, date: candidatePoints[index]?.date ?? '' }))} />
            : <EmptyState compact icon={MessageSquareText} title="Aún no hay tono para comparar" action={<LinkButton href="/keywords/new" variant="secondary" size="sm">Revisar términos</LinkButton>}>Cuando haya publicaciones clasificadas, verás si el tono mejora o empeora cada día.</EmptyState>}
        </Card>

        <Card index={3} title="Temas que mueven la conversación" hint="Los temas registrados en Candidatos y temas con más menciones en el periodo; el color es su tono predominante." description="Los cinco temas con más menciones, coloreados por su tono predominante.">
          {topTopics.length ? (
            <ol className="space-y-4">
              {topTopics.map((item) => {
                const tone = topicTone(item);
                const max = Math.max(1, topTopics[0].matched);
                return (
                  <li key={item.topic.mainId} title={tone.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 font-medium"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: tone.color }} /><span className="truncate">{item.topic.name}</span></span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">{compact(item.matched)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(4, item.matched / max * 100)}%`, backgroundColor: tone.color }} /></div>
                    <p className="mt-1 text-[10px] text-muted-foreground">{tone.label}</p>
                  </li>
                );
              })}
            </ol>
          ) : <EmptyState compact icon={Hash} title="Aún no hay temas vinculados" action={<LinkButton href="/temas" variant="secondary" size="sm">Explorar temas</LinkButton>}>Agrega temas de conversación para saber qué asuntos conectan con tu candidato.</EmptyState>}
        </Card>
      </section>

      {socialPulse ? (
        <section aria-label="Redes y web">
          <Suspense fallback={<SocialPulseSkeleton />}>
            <SocialPulseCard pulse={socialPulse} />
          </Suspense>
        </section>
      ) : null}

      <section aria-label="Publicaciones recientes" className="grid gap-4 @3xl/home:grid-cols-2">
        <RecentMentions title="Lo último que te ayuda" mentions={recentPositive} tone="positive" />
        <RecentMentions title="Lo último que te pega" mentions={recentNegative} tone="negative" />
      </section>

      <QuickLinks />
    </div>
  );
}
