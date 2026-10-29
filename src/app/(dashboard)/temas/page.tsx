import Link from 'next/link';
import { ChevronRight, CircleHelp, Map as MapIcon, Scale } from 'lucide-react';
import { ThemeBubbleChart, type ThemeBubble } from '@/components/contest/theme-bubble-chart';
import { Card, ChartEmpty, EmptyState, KpiStrip, LinkButton, PageHeader, SectionHeading, Stat, TONE_TEXT, cx } from '@/components/ui';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';
import { compact } from '@/lib/format';
import { groupCandidates, sentimentScore } from '@/lib/insights';
import { mentio, unwrap } from '@/lib/mentio';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mapa de temas' };

const RANGE = '30d';
function toneLabel(score: number | null) {
  if (score === null) return 'Sin datos aún';
  if (score >= 0.15) return 'Se habla mejor de este tema';
  if (score <= -0.15) return 'Se habla peor de este tema';
  return 'El tono está parejo';
}

const TONE_LEGEND = [
  { key: 'negative', label: 'Se habla mal' },
  { key: 'neutral', label: 'Tono parejo o sin datos' },
  { key: 'positive', label: 'Se habla bien' },
] as const;

function TopicList({ title, topics, tone, index }: {
  title: string;
  topics: ThemeBubble[];
  tone: 'good' | 'bad';
  index: number;
}) {
  return (
    <Card
      index={index}
      title={title}
      hint="Temas cuyo índice de tono (positivas menos negativas, entre las menciones con tono) pasa de ±0.15 en los últimos 30 días. Se muestran los cinco más marcados."
      description={tone === 'good'
        ? 'Temas con más menciones positivas que negativas.'
        : 'Temas con más menciones negativas que positivas.'}
    >
      {topics.length ? (
        <ul className="-mx-2 divide-y">
          {topics.slice(0, 5).map((topic) => (
            <li key={topic.id}>
              <Link
                href={topic.href}
                className="group flex items-center justify-between gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{topic.name}</span>
                  <span className={cx('text-xs', TONE_TEXT[tone === 'good' ? 'positive' : 'negative'])}>{toneLabel(topic.sentimentScore)}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                  {compact(topic.matched)} menciones
                  <ChevronRight aria-hidden="true" className="size-3.5 transition-transform motion-safe:group-hover:translate-x-0.5" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ChartEmpty>Todavía no hay temas con este tono en el periodo.</ChartEmpty>
      )}
    </Card>
  );
}

export default async function TemasPage() {
  const api = mentio();
  const keywords = unwrap(await api.listKeywords({
    query: { kind: ['topic'], sort: 'mentions' },
  })).data;
  const topics = groupCandidates(keywords).filter((candidate) => candidate.kind === 'topic');

  if (!topics.length) {
    return (
      <div>
        <PageHeader
          title="Mapa de temas"
          description="Mira qué temas ayudan a tu candidato y en cuáles necesita responder."
        />
        <EmptyState
          icon={CircleHelp}
          title="Aún no registras temas de agenda."
          action={<LinkButton href="/arranque" variant="primary">Agregar temas</LinkButton>}
        >
          Agrega temas como seguridad, empleo o salud para ver cómo se habla de ellos.
        </EmptyState>
      </div>
    );
  }

  const topicIds = topics.flatMap((topic) => topic.keywordIds);
  const voice = unwrap(await api.getShareOfVoice({ query: { range: RANGE, keywordIds: topicIds } }));
  const mentionCounts = new Map(voice.data.map((row) => [row.keyword.id, row.matched] as const));
  const rankedTopics = topics
    .map((topic) => ({
      ...topic,
      matched: topic.keywordIds.reduce((total, id) => total + (mentionCounts.get(id) ?? 0), 0),
    }))
    .sort((a, b) => b.matched - a.matched || a.name.localeCompare(b.name, 'es'));
  const visibleTopics = rankedTopics;
  const summaries = await Promise.all(visibleTopics.map((topic) =>
    api.getAnalyticsSummary({ query: { range: RANGE, keywordIds: topic.keywordIds } }).then(unwrap),
  ));
  const bubbles: ThemeBubble[] = visibleTopics.map((topic, index) => {
    const summary = summaries[index];
    const classified = summary.sentiment.positive + summary.sentiment.neutral + summary.sentiment.negative;
    const score = classified ? sentimentScore(summary.sentiment) : null;
    const params = new URLSearchParams({ keywordIds: topic.keywordIds.join(',') });
    return {
      id: topic.mainId,
      name: topic.name,
      matched: topic.matched,
      sentimentScore: score,
      href: `/mentions?${params}`,
    };
  });
  const helped = bubbles
    .filter((topic) => topic.sentimentScore !== null && topic.sentimentScore >= 0.15)
    .sort((a, b) => (b.sentimentScore ?? 0) - (a.sentimentScore ?? 0));
  const hurt = bubbles
    .filter((topic) => topic.sentimentScore !== null && topic.sentimentScore <= -0.15)
    .sort((a, b) => (a.sentimentScore ?? 0) - (b.sentimentScore ?? 0));

  const totalMentions = bubbles.reduce((total, topic) => total + topic.matched, 0);
  const leader = bubbles.find((topic) => topic.matched > 0);
  const withoutTone = bubbles.filter((topic) => topic.sentimentScore === null).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa de temas"
        description="Qué temas de agenda ayudan a tu candidato y en cuáles necesita responder. Últimos 30 días."
      />

      <KpiStrip label="Indicadores de temas">
        <Stat label="Temas registrados" value={compact(bubbles.length)} hint={withoutTone ? `${compact(withoutTone)} aún sin tono` : 'Todos con tono'} />
        <Stat label="Menciones" value={compact(totalMentions)} hint="Suma de todos los temas" />
        <Stat label="Te ayudan" value={compact(helped.length)} tone={helped.length ? 'positive' : 'default'} hint="Temas con tono positivo" />
        <Stat label="Te hunden" value={compact(hurt.length)} tone={hurt.length ? 'negative' : 'default'} hint="Temas con tono negativo" />
        <Stat label="Más mencionado" value={leader?.name ?? '—'} hint={leader ? `${compact(leader.matched)} menciones` : 'Sin menciones'} href={leader?.href} />
      </KpiStrip>

      <section className="space-y-4" aria-labelledby="temas-mapa">
        <SectionHeading
          id="temas-mapa"
          icon={MapIcon}
          title="Conversación por tema"
          description="Cada burbuja es un tema: su tamaño y posición horizontal indican cuánto se habla, su altura el tono."
          aside="Últimos 30 días"
        />
        <Card
          index={0}
          title="Volumen y tono"
          hint="Volumen = menciones del tema y sus variantes. Tono = (positivas − negativas) ÷ menciones con tono, de −1 a +1. Los temas con valores muy parecidos se separan un poco para distinguirlos; el detalle muestra el número real."
          description="Selecciona una burbuja para abrir esas menciones."
          actions={(
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Colores de tono">
              {TONE_LEGEND.map((item) => (
                <li key={item.key} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[item.key] }} />
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        >
          {totalMentions > 0
            ? <ThemeBubbleChart topics={bubbles} />
            : <ChartEmpty>Aún no hay menciones de tus temas en los últimos 30 días.</ChartEmpty>}
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="temas-balance">
        <SectionHeading
          id="temas-balance"
          icon={Scale}
          title="Temas que ayudan o preocupan"
          description="El tono se calcula con las menciones positivas, neutrales y negativas del tema; los puntos grises aún no tienen datos suficientes."
        />
        <div className="grid gap-4 @4xl:grid-cols-2">
          <TopicList title="Temas que te ayudan" topics={helped} tone="good" index={1} />
          <TopicList title="Temas que te hunden" topics={hurt} tone="bad" index={2} />
        </div>
      </section>
    </div>
  );
}
