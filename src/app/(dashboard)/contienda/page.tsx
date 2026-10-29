import { ChartNoAxesCombined, MessageCircle, Megaphone, Trophy } from 'lucide-react';
import {
  CHART_COLORS,
  Card,
  ChartEmpty,
  EmptyState,
  KpiStrip,
  LinkButton,
  PageHeader,
  RangeLinks,
  SectionHeading,
  Stat,
  TONE_TEXT,
  cx,
} from '@/components/ui';
import { ToneSplitChart, VoiceShareChart, type FaceoffKeyword } from '@/components/contest/faceoff-charts';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';
import { compact } from '@/lib/format';
import { groupCandidates } from '@/lib/insights';
import { mentio, unwrap } from '@/lib/mentio';
import { one, withParams, type SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cara a cara' };

const RANGES = ['7d', '30d', '90d'] as const;
/** Kept here, not imported from faceoff-charts: a 'use client' module only hands components to the server. */
const SENTIMENT_NAMES = { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' } as const;
type Range = (typeof RANGES)[number];

function pluralPlaces(count: number) {
  return count === 1 ? 'un lugar' : `${count} lugares`;
}

function rankNote(current: number, previous: number, previousMentions: number) {
  if (previousMentions === 0) return 'la semana pasada no registraste menciones';
  if (previous === current) return 'mantienes el mismo lugar';
  if (previous > current) return `subiste ${pluralPlaces(previous - current)}`;
  return `bajaste ${pluralPlaces(current - previous)}`;
}

/** The tone legend in a tone card's header: a dot in the series color plus its name. */
function ToneLegend() {
  return (
    <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground" aria-label="Leyenda de tono">
      {(Object.keys(SENTIMENT_NAMES) as Array<keyof typeof SENTIMENT_NAMES>).map((key) => (
        <li key={key} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full" style={{ backgroundColor: SENTIMENT_COLORS[key] }} />
          {SENTIMENT_NAMES[key]}
        </li>
      ))}
    </ul>
  );
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('es-MX') + text.slice(1);
const sumOf = (rows: FaceoffKeyword[], pick: (row: FaceoffKeyword) => number) => rows.reduce((total, row) => total + pick(row), 0);
const classifiedOf = (row: FaceoffKeyword) => row.tone.positive + row.tone.neutral + row.tone.negative;

function addDays(day: string, offset: number) {
  const date = new Date(`${day.slice(0, 10)}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

export default async function ContiendaPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requestedRange = one(params, 'range');
  const range: Range = (RANGES as readonly string[]).includes(requestedRange ?? '')
    ? (requestedRange as Range)
    : '30d';
  const api = mentio();
  const configured = unwrap(await api.listKeywords({
    query: { kind: ['brand', 'competitor'], sort: 'term' },
  })).data;
  const grouped = groupCandidates(configured);
  const brands = grouped.filter((candidate) => candidate.kind === 'brand');
  const competitors = grouped.filter((candidate) => candidate.kind === 'competitor');
  const rangeLinks = <RangeLinks
    current={range}
    options={RANGES}
    href={(value) => withParams('/contienda', params, { range: value, from: undefined, to: undefined })}
  />;

  if (!brands.length || !competitors.length) {
    const missing = [!brands.length ? 'candidato' : null, !competitors.length ? 'adversarios' : null]
      .filter(Boolean)
      .join(' y ');
    return (
      <div>
        <PageHeader
          title="Cara a cara"
          description="Compara cuánto se habla de tu candidato y de sus adversarios, y con qué tono."
          actions={rangeLinks}
        />
        <EmptyState
          icon={ChartNoAxesCombined}
          title={`Falta registrar ${missing}.`}
          action={<LinkButton href="/arranque" variant="primary">Ir al asistente</LinkButton>}
        >
          Agrega el nombre de tu candidato y al menos un adversario para comparar su conversación.
        </EmptyState>
      </div>
    );
  }

  const contenderIds = [...brands, ...competitors].flatMap((candidate) => candidate.keywordIds);
  const voicePromise = api.getShareOfVoice({ query: { range, compare: true, keywordIds: contenderIds } }).then(unwrap);
  const weekPromise = range === '7d'
    ? voicePromise
    : api.getShareOfVoice({ query: { range: '7d', compare: true, keywordIds: contenderIds } }).then(unwrap);
  const [voice, weekly] = await Promise.all([voicePromise, weekPromise]);
  const previousWeek = unwrap(await api.getShareOfVoice({
    query: {
      from: addDays(weekly.window.from, -weekly.window.days),
      to: addDays(weekly.window.from, -1),
      keywordIds: contenderIds,
    },
  }));
  type Candidate = (typeof grouped)[number];
  type CandidateTotals = Candidate & { matched: number; previousMatched: number; share: number };
  const aggregate = (data: typeof voice.data, candidates: Candidate[]): CandidateTotals[] => {
    const idToCandidate = new Map<string, Candidate>();
    for (const candidate of candidates) for (const id of candidate.keywordIds) idToCandidate.set(id, candidate);
    const totals = new Map<string, { matched: number; previousMatched: number; share: number; hasShare: boolean }>();
    for (const candidate of candidates) totals.set(candidate.mainId, { matched: 0, previousMatched: 0, share: 0, hasShare: false });

    for (const row of data) {
      const candidate = idToCandidate.get(row.keyword.id);
      const total = candidate ? totals.get(candidate.mainId) : undefined;
      if (!candidate || !total) continue;
      total.matched += row.matched;
      total.previousMatched += row.previous?.matched ?? 0;
      if (row.share !== null) {
        total.share += row.share;
        total.hasShare = true;
      }
    }
    const contenderMentions = [...totals.values()].reduce((sum, total) => sum + total.matched, 0);
    return candidates.map((candidate) => {
      const total = totals.get(candidate.mainId)!;
      return {
        ...candidate,
        matched: total.matched,
        previousMatched: total.previousMatched,
        share: total.hasShare ? total.share : contenderMentions ? (total.matched / contenderMentions) * 100 : 0,
      };
    });
  };

  const allTotals = aggregate(voice.data, [...brands, ...competitors]);
  const currentBrands = allTotals.filter((candidate) => candidate.kind === 'brand');
  const currentCompetitors = allTotals.filter((candidate) => candidate.kind === 'competitor');
  const brandRows = [...currentBrands].sort((a, b) => b.matched - a.matched).slice(0, 8);
  const competitorRows = [...currentCompetitors].sort((a, b) => b.matched - a.matched).slice(0, 8);
  const visible = [...brandRows, ...competitorRows];
  const toneSummaries = await Promise.all(visible.map((candidate) =>
    api.getAnalyticsSummary({ query: { range, keywordIds: candidate.keywordIds } }).then(unwrap),
  ));
  const summariesById = new Map(visible.map((candidate, index) => [candidate.mainId, toneSummaries[index]] as const));

  const faceoffData = (rows: CandidateTotals[]): FaceoffKeyword[] => rows.map((candidate) => {
    const sentiment = summariesById.get(candidate.mainId)?.sentiment;
    return {
      id: candidate.mainId,
      label: candidate.name,
      share: candidate.share,
      matched: candidate.matched,
      tone: {
        positive: sentiment?.positive ?? 0,
        neutral: sentiment?.neutral ?? 0,
        negative: sentiment?.negative ?? 0,
        unclassified: sentiment?.unclassified ?? 0,
      },
    };
  });

  const priorTotals = aggregate(previousWeek.data, [...brands, ...competitors]);
  const priorById = new Map(priorTotals.map((candidate) => [candidate.mainId, candidate.matched] as const));
  const weeklyTotals = aggregate(weekly.data, [...brands, ...competitors]).map((candidate) => ({
    ...candidate,
    previousMatched: priorById.get(candidate.mainId) ?? 0,
  }));
  const currentOrder = [...weeklyTotals].sort((a, b) => b.matched - a.matched || a.name.localeCompare(b.name, 'es'));
  const previousOrder = [...weeklyTotals].sort((a, b) => b.previousMatched - a.previousMatched || a.name.localeCompare(b.name, 'es'));
  const rankings = brands.map((brand) => {
    const row = weeklyTotals.find((item) => item.mainId === brand.mainId);
    const currentRank = currentOrder.findIndex((item) => item.mainId === brand.mainId) + 1;
    const previousRank = previousOrder.findIndex((item) => item.mainId === brand.mainId) + 1;
    return row && row.matched > 0 && currentRank > 0 && previousRank > 0
      ? { label: brand.name, currentRank, previousRank, previousMentions: row.previousMatched }
      : null;
  }).filter((row): row is NonNullable<typeof row> => row !== null);

  const totalContenders = brands.length + competitors.length;
  const rankedCount = totalContenders;

  const brandData = faceoffData(brandRows);
  const competitorData = faceoffData(competitorRows);
  const brandShare = sumOf(brandData, (row) => row.share);
  const competitorShare = sumOf(competitorData, (row) => row.share);
  const brandMentions = sumOf(brandData, (row) => row.matched);
  const competitorMentions = sumOf(competitorData, (row) => row.matched);
  const brandClassified = sumOf(brandData, classifiedOf);
  const brandPositive = brandClassified ? (sumOf(brandData, (row) => row.tone.positive) / brandClassified) * 100 : null;
  const brandNegative = brandClassified ? (sumOf(brandData, (row) => row.tone.negative) / brandClassified) * 100 : null;
  const lead = rankings[0];
  const leadTone = !lead || lead.previousMentions === 0 || lead.previousRank === lead.currentRank
    ? 'default'
    : lead.previousRank > lead.currentRank ? 'positive' : 'negative';
  const days = range.slice(0, -1);
  const noMentions = allTotals.every((candidate) => candidate.matched === 0);

  const panels = [
    { key: 'brand', title: 'Tu candidato', rows: brandData, color: CHART_COLORS[0], empty: 'Sin menciones de tu candidato en este periodo.' },
    { key: 'competitors', title: 'Adversarios', rows: competitorData, color: CHART_COLORS[1], empty: 'Sin menciones de adversarios en este periodo.' },
  ] as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cara a cara"
        description="Compara la participación de voz y el tono de tu candidato frente a sus adversarios."
        actions={rangeLinks}
      />

      <KpiStrip label="Indicadores de la contienda">
        <Stat
          label="Voz de tu candidato"
          value={`${brandShare.toFixed(1)}%`}
          hint={`${compact(brandMentions)} menciones · ${days} días`}
        />
        <Stat
          label="Voz de adversarios"
          value={`${competitorShare.toFixed(1)}%`}
          hint={`${compact(competitorMentions)} menciones · ${days} días`}
        />
        <Stat
          label="Tono positivo"
          value={brandPositive === null ? '—' : `${Math.round(brandPositive)}%`}
          tone={brandPositive === null ? 'default' : 'positive'}
          hint="De las menciones con tono de tu candidato"
        />
        <Stat
          label="Tono negativo"
          value={brandNegative === null ? '—' : `${Math.round(brandNegative)}%`}
          tone={brandNegative === null ? 'default' : 'negative'}
          hint="De las menciones con tono de tu candidato"
        />
        <Stat
          label="Posición semanal"
          value={lead ? `${lead.currentRank}º de ${rankedCount}` : '—'}
          tone={leadTone}
          hint={lead ? capitalize(rankNote(lead.currentRank, lead.previousRank, lead.previousMentions)) : 'Sin menciones esta semana'}
        />
      </KpiStrip>

      {noMentions ? (
        <p className="text-sm text-muted-foreground">
          No hay menciones de candidatos ni adversarios en los últimos {days} días.
        </p>
      ) : null}

      <section className="space-y-4" aria-labelledby="contienda-voz">
        <SectionHeading
          id="contienda-voz"
          icon={Megaphone}
          title="Participación de voz"
          description="Qué parte de la conversación entre todos los contendientes se lleva cada uno."
          aside={`Últimos ${days} días`}
        />
        <div className="grid gap-4 @4xl:grid-cols-2">
          {panels.map((panel, index) => (
            <Card
              key={panel.key}
              index={index}
              title={panel.title}
              description={panel.key === 'brand'
                ? 'El candidato y sus apodos, reunidos en un solo nombre.'
                : 'Cada adversario incluye las menciones de sus apodos registrados.'}
              hint="Menciones de cada contendiente entre las menciones de todos los candidatos y adversarios registrados, en porcentaje."
              actions={<span className="font-semibold text-foreground tabular-nums">{sumOf(panel.rows, (row) => row.share).toFixed(1)}%</span>}
            >
              {panel.rows.some((row) => row.matched > 0)
                ? <VoiceShareChart rows={panel.rows} color={panel.color} label={panel.title} />
                : <ChartEmpty>{panel.empty}</ChartEmpty>}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="contienda-tono">
        <SectionHeading
          id="contienda-tono"
          icon={MessageCircle}
          title="Tono de la conversación"
          description="Cómo se reparten las menciones positivas, neutrales y negativas de cada contendiente."
          aside="Hasta 8 por grupo, ordenados por menciones"
        />
        <div className="grid gap-4 @4xl:grid-cols-2">
          {panels.map((panel, index) => (
            <Card
              key={panel.key}
              index={index + 2}
              title={panel.title}
              hint="Solo cuentan las menciones con tono identificado; las que aún no tienen tono aparecen en el detalle de cada barra."
              actions={<ToneLegend />}
            >
              {panel.rows.some((row) => classifiedOf(row) > 0)
                ? <ToneSplitChart rows={panel.rows} label={panel.title} />
                : <ChartEmpty>El tono aparecerá cuando haya menciones clasificadas.</ChartEmpty>}
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="contienda-posicion">
        <SectionHeading
          id="contienda-posicion"
          icon={Trophy}
          title="Posición de esta semana"
          description="Lugar entre todos los contendientes por menciones de los últimos 7 días, frente a la semana anterior."
        />
        <Card index={4}>
          {rankings.length ? (
            <ul className="divide-y">
              {rankings.map((ranking) => {
                const moved = ranking.previousMentions === 0 || ranking.previousRank === ranking.currentRank
                  ? 'default'
                  : ranking.previousRank > ranking.currentRank ? 'positive' : 'negative';
                return (
                  <li key={ranking.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span className="min-w-0">
                      <span className="font-medium">{ranking.label}</span>
                      <span className="text-muted-foreground">
                        {ranking.previousMentions > 0 ? ` · la semana pasada estabas ${ranking.previousRank}º` : ''}
                      </span>
                    </span>
                    <span className="flex items-baseline gap-2 tabular-nums">
                      <span className="font-semibold">{ranking.currentRank}º de {rankedCount}</span>
                      <span className={cx('text-xs', TONE_TEXT[moved])}>
                        {rankNote(ranking.currentRank, ranking.previousRank, ranking.previousMentions)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <ChartEmpty>Aún no hay menciones suficientes para calcular una posición semanal.</ChartEmpty>
          )}
          {totalContenders > 16 ? (
            <p className="mt-3 border-t pt-3 text-xs text-muted-foreground">
              En total hay {compact(totalContenders)} candidatos y adversarios registrados; las gráficas muestran hasta 8 por grupo.
            </p>
          ) : null}
        </Card>
      </section>
    </div>
  );
}
