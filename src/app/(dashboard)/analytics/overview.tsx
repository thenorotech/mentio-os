import type { AnalyticsSummary } from '@mentio-dev/sdk';
import { PlatformIcon } from '@/components/platform-icon';
import { BarList, CHART_COLORS, Card, EmptyState, LinkButton, StackedBars, Stat, KpiStrip } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { compact, platformName } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { keywordName, mentionsHref, type WindowQuery } from './window';

const duration = (ms: number | null) => {
  if (ms === null) return 'Sin resolver';
  const hours = ms / 3_600_000;
  return hours < 1 ? `${Math.max(1, Math.round(ms / 60_000))} min` : hours < 48 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} días`;
};

const chartEmpty = (title: string, example: string) => (
  <EmptyState
    compact
    title={title}
    example={example}
    action={<LinkButton href="/keywords/new" variant="primary" size="sm">Agregar término</LinkButton>}
  >
    Cuando se registren términos de campaña y lleguen publicaciones, este espacio mostrará los resultados.
  </EmptyState>
);

/** Headline numbers against the previous window, the trend, and where it came from. */
export async function Overview({ query, summary }: { query: WindowQuery; summary: AnalyticsSummary }) {
  const api = mentio();
  const [series, byPlatform, platforms, keywords] = await Promise.all([
    api.getAnalyticsSeries({ query: { ...query, compare: true } }).then(unwrap),
    api.getAnalyticsSeries({ query: { ...query, by: 'platform' } }).then(unwrap),
    api.getAnalyticsBreakdown({ query: { ...query, by: 'platform' } }).then(unwrap),
    api.getAnalyticsBreakdown({ query: { ...query, by: 'keyword' } }).then(unwrap),
  ]);
  const prev = summary.previous;
  const link = (extra: Record<string, string>) => mentionsHref(summary.window, query, extra);
  const points = series.data[0]?.points ?? [];
  const previous = series.previous?.[0]?.points ?? [];
  const labels = points.map((p) => p.date);
  const pct = (now: number, before?: number | null) => (before ? ((now - before) / before) * 100 : null);
  const scored = summary.sentiment.positive + summary.sentiment.neutral + summary.sentiment.negative;

  // The five busiest platforms keep their color; the rest fold into "Other".
  const total = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const ranked = [...byPlatform.data].sort((a, b) => total(b.points.map((p) => p.matched)) - total(a.points.map((p) => p.matched)));
  const stacks = ranked.slice(0, 5).map((s, i) => ({ name: platformName(s.key), color: CHART_COLORS[i], values: s.points.map((p) => p.matched) }));
  if (ranked.length > 5) stacks.push({ name: 'Otros', color: '#d4d4d8', values: labels.map((_, i) => total(ranked.slice(5).map((s) => s.points[i]?.matched ?? 0))) });

  return (
    <div className="space-y-4">
      <KpiStrip>
        <Stat label={<span className="inline-flex items-center gap-1">Menciones <InfoTip term="menciones" /></span>} value={compact(summary.matched)} delta={pct(summary.matched, prev?.matched)} spark={points.map((p) => p.matched)} hint={`${compact(summary.posts)} publicaciones`} href={link({})} />
        <Stat
          label={<span className="inline-flex items-center gap-1">Relevantes <InfoTip term="relevancia" /></span>}
          value={compact(summary.relevant)}
          delta={pct(summary.relevant, prev?.relevant)}
          spark={points.map((p) => p.relevant)}
          hint={summary.matched ? `${Math.round((summary.relevant / summary.matched) * 100)}% del total` : undefined}
          href={link({ relevant: 'true' })}
        />
        <Stat
          label={<span className="inline-flex items-center gap-1">Sentimiento negativo <InfoTip term="sentimiento o tono" /></span>}
          value={compact(summary.sentiment.negative)}
          delta={pct(summary.sentiment.negative, prev?.sentiment.negative)}
          invert
          spark={points.map((p) => p.negative)}
          hint={scored ? `${Math.round((summary.sentiment.negative / scored) * 100)}% de las clasificadas` : undefined}
          href={link({ sentiments: 'negative' })}
        />
        <Stat label={<span className="inline-flex items-center gap-1">Alcance estimado <InfoTip term="alcance" /></span>} value={compact(summary.reach.followers)} delta={pct(summary.reach.followers, prev?.reach.followers)} hint={`${compact(summary.reach.people)} autores identificados`} />
        <Stat label={<span className="inline-flex items-center gap-1">Autores <InfoTip term="autor" /></span>} value={compact(summary.people)} delta={pct(summary.people, prev?.people)} />
        <Stat label={<span className="inline-flex items-center gap-1">Publicaciones <InfoTip text="Cantidad de posts y reseñas recopilados durante el periodo." /></span>} value={compact(summary.posts)} delta={pct(summary.posts, prev?.posts)} />
        <Stat label={<span className="inline-flex items-center gap-1">Intención de apoyo <InfoTip term="intención" /></span>} value={compact(summary.buyIntent)} delta={pct(summary.buyIntent, prev?.buyIntent)} href={link({ intents: 'buy_intent' })} />
        <Stat label={<span className="inline-flex items-center gap-1">Preguntas <InfoTip term="intención" /></span>} value={compact(summary.questions)} delta={pct(summary.questions, prev?.questions)} href={link({ intents: 'question' })} />
      </KpiStrip>

      <Card title={<span className="inline-flex items-center gap-1">Menciones en el tiempo <InfoTip term="menciones" /></span>} description={`Por ${{ hour: 'hora', day: 'día', week: 'semana', month: 'mes' }[series.window.bucket] ?? series.window.bucket}. Las barras muestran menciones por canal; la línea oscura, las relevantes, y la discontinua, el periodo anterior.`}>
        {labels.length === 0 ? chartEmpty('Aún no hay menciones en el periodo', 'Registra a “María López” y el tema “seguridad” para ver la conversación por día y canal.') : <StackedBars
          labels={labels}
          stacks={stacks}
          lines={[
            { name: 'Relevantes', color: 'var(--foreground)', values: points.map((p) => p.relevant) },
            ...(previous.length === points.length ? [{ name: 'Periodo anterior', color: '#a1a1aa', values: previous.map((p) => p.matched), dashed: true }] : []),
          ]}
        />}
      </Card>

      <Card title={<span className="inline-flex items-center gap-1">Sentimiento en el tiempo <InfoTip term="sentimiento o tono" /></span>} description={`${compact(summary.sentiment.unclassified)} menciones aún sin clasificar.`}>
        {labels.length === 0 ? chartEmpty('Aún no hay datos de tono', 'Sigue “María López” y “seguridad” para ver si las publicaciones son positivas, neutrales o negativas.') : <StackedBars
          labels={labels}
          height={160}
          stacks={[
            { name: 'Positivo', color: '#10b981', values: points.map((p) => p.positive) },
            { name: 'Neutral', color: '#d4d4d8', values: points.map((p) => p.neutral) },
            { name: 'Negativo', color: '#ef4444', values: points.map((p) => p.negative) },
          ]}
        />}
      </Card>

      <div className="grid gap-6 @4xl:grid-cols-2">
        <Card title={<span className="inline-flex items-center gap-1">Canales principales <InfoTip text="Plataformas donde se publicaron las menciones de este periodo." /></span>}>
          {platforms.data.length === 0 ? chartEmpty('Aún no hay canales con menciones', 'Cuando una publicación sobre “María López” aparezca en Instagram, Reddit u otro canal, aquí podrás comparar dónde se conversa.') : <BarList items={platforms.data.slice(0, 8).map((r) => ({ label: platformName(r.key), value: r.matched, href: link({ platforms: r.key }), icon: <PlatformIcon platform={r.key} /> }))} />}
        </Card>
        <Card title={<span className="inline-flex items-center gap-1">Términos monitoreados principales <InfoTip text="Candidatos, adversarios y temas con más menciones en este periodo." /></span>}>
          {keywords.data.length === 0 ? chartEmpty('Aún no hay términos monitoreados', 'Registra “María López” como candidata, “José Pérez” como adversario y “seguridad” como tema.') : <BarList
            items={keywords.data.slice(0, 8).map((r) => ({
              label: r.keyword ? keywordName(r.keyword) : r.label,
              value: r.matched,
              href: r.keyword ? link({ keywordIds: r.keyword.id }) : undefined,
            }))}
          />}
        </Card>
      </div>

      <Card title={<span className="inline-flex items-center gap-1">Seguimiento de menciones <InfoTip text="Muestra cuántas menciones están abiertas, resueltas o ignoradas y cuánto tarda el equipo en atenderlas." /></span>} description="Estado de las menciones en este periodo.">
        <KpiStrip>
          <Stat label={<span className="inline-flex items-center gap-1">Abiertas <InfoTip text="Menciones relevantes que todavía no se han marcado como resueltas o ignoradas." /></span>} value={compact(summary.triage.open)} href={link({ status: 'open' })} />
          <Stat label={<span className="inline-flex items-center gap-1">Resueltas <InfoTip text="Menciones que el equipo ya atendió y marcó como resueltas." /></span>} value={compact(summary.triage.done)} href={link({ status: 'done' })} />
          <Stat label={<span className="inline-flex items-center gap-1">Ignoradas <InfoTip text="Menciones que el equipo decidió no seguir atendiendo." /></span>} value={compact(summary.triage.ignored)} href={link({ status: 'ignored' })} />
          <Stat label={<span className="inline-flex items-center gap-1">Pendientes por más de 24 h <InfoTip text="Menciones relevantes que siguen abiertas después de un día." /></span>} value={compact(summary.triage.waiting)} hint="Relevantes y aún abiertas" />
          <Stat label={<span className="inline-flex items-center gap-1">Atendidas <InfoTip text="Porcentaje de menciones relevantes que ya fueron resueltas." /></span>} value={summary.triage.handledRate === null ? 's/d' : `${Math.round(summary.triage.handledRate * 100)}%`} hint="Resueltas de las relevantes" />
          <Stat label={<span className="inline-flex items-center gap-1">Tiempo medio para resolver <InfoTip text="Tiempo habitual entre la llegada de una mención y el momento en que el equipo la resuelve." /></span>} value={<span className="text-base">{duration(summary.triage.medianTimeToDoneMs)}</span>} />
        </KpiStrip>
      </Card>
    </div>
  );
}
