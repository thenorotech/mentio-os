import type { AnalyticsSummary } from '@mentio-dev/sdk';
import { Inbox, MessageSquareText } from 'lucide-react';
import { PlatformIcon } from '@/components/platform-icon';
import { BarList, CHART_COLORS, Card, KpiStrip, OTHER_COLOR, SectionHeading, StackedBars, Stat } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';
import { compact, platformName } from '@/lib/format';
import { GLOSSARY } from '@/lib/glossary';
import { mentio, unwrap } from '@/lib/mentio';
import { AnalyticsEmpty } from './charts';
import { keywordName, mentionsHref, type WindowQuery } from './window';

const duration = (ms: number | null) => {
  if (ms === null) return 'Sin resolver';
  const hours = ms / 3_600_000;
  return hours < 1 ? `${Math.max(1, Math.round(ms / 60_000))} min` : hours < 48 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} días`;
};

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
  const bucket = { hour: 'hora', day: 'día', week: 'semana', month: 'mes' }[series.window.bucket] ?? series.window.bucket;

  // The five busiest platforms keep their color; the rest fold into "Other".
  const total = (values: number[]) => values.reduce((a, b) => a + b, 0);
  const ranked = [...byPlatform.data].sort((a, b) => total(b.points.map((p) => p.matched)) - total(a.points.map((p) => p.matched)));
  const stacks = ranked.slice(0, 5).map((s, i) => ({ name: platformName(s.key), color: CHART_COLORS[i], values: s.points.map((p) => p.matched) }));
  if (ranked.length > 5) stacks.push({ name: 'Otros', color: OTHER_COLOR, values: labels.map((_, i) => total(ranked.slice(5).map((s) => s.points[i]?.matched ?? 0))) });

  return (
    <div className="flex flex-col gap-6">
      <KpiStrip label="Indicadores del periodo">
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

      <section aria-labelledby="analytics-conversation" className="flex flex-col gap-4">
        <SectionHeading id="analytics-conversation" icon={MessageSquareText} title="Conversación" description={`Cómo evolucionan las menciones y su tono, por ${bucket}, y dónde se concentran.`} />
        <div className="grid gap-4 @4xl:grid-cols-3">
          <Card
            index={0}
            className="@4xl:col-span-2"
            title="Menciones en el tiempo"
            hint={GLOSSARY.menciones.definition}
            description="Barras: menciones por canal. Línea continua: las relevantes. Línea discontinua: el periodo anterior."
          >
            {labels.length === 0 ? <AnalyticsEmpty title="Aún no hay menciones en el periodo" example="Registra a “María López” y el tema “seguridad” para ver la conversación por día y canal." /> : <StackedBars
              labels={labels}
              stacks={stacks}
              lines={[
                { name: 'Relevantes', color: 'var(--foreground)', values: points.map((p) => p.relevant) },
                ...(previous.length === points.length ? [{ name: 'Periodo anterior', color: 'var(--muted-foreground)', values: previous.map((p) => p.matched), dashed: true }] : []),
              ]}
            />}
          </Card>
          <Card index={1} title="Canales principales" hint="Plataformas donde se publicaron las menciones de este periodo." description="Los ocho canales con más menciones.">
            {platforms.data.length === 0 ? <AnalyticsEmpty title="Aún no hay canales con menciones" example="Cuando una publicación sobre “María López” aparezca en Instagram, Reddit u otro canal, aquí podrás comparar dónde se conversa." /> : <BarList items={platforms.data.slice(0, 8).map((r) => ({ label: platformName(r.key), value: r.matched, href: link({ platforms: r.key }), icon: <PlatformIcon platform={r.key} /> }))} />}
          </Card>

          <Card index={2} className="@4xl:col-span-2" title="Sentimiento en el tiempo" hint={GLOSSARY['sentimiento o tono'].definition} description={`${compact(summary.sentiment.unclassified)} menciones aún sin clasificar.`}>
            {labels.length === 0 ? <AnalyticsEmpty title="Aún no hay datos de tono" example="Sigue “María López” y “seguridad” para ver si las publicaciones son positivas, neutrales o negativas." /> : <StackedBars
              labels={labels}
              height={200}
              stacks={[
                { name: 'Positivo', color: SENTIMENT_COLORS.positive, values: points.map((p) => p.positive) },
                { name: 'Neutral', color: SENTIMENT_COLORS.neutral, values: points.map((p) => p.neutral) },
                { name: 'Negativo', color: SENTIMENT_COLORS.negative, values: points.map((p) => p.negative) },
              ]}
            />}
          </Card>
          <Card index={3} title="Términos monitoreados principales" hint="Candidatos, adversarios y temas con más menciones en este periodo." description="Los ocho términos con más menciones.">
            {keywords.data.length === 0 ? <AnalyticsEmpty title="Aún no hay términos monitoreados" example="Registra “María López” como candidata, “José Pérez” como adversario y “seguridad” como tema." /> : <BarList
              items={keywords.data.slice(0, 8).map((r) => ({
                label: r.keyword ? keywordName(r.keyword) : r.label,
                value: r.matched,
                href: r.keyword ? link({ keywordIds: r.keyword.id }) : undefined,
              }))}
            />}
          </Card>
        </div>
      </section>

      <section aria-labelledby="analytics-triage" className="flex flex-col gap-4">
        <SectionHeading id="analytics-triage" icon={Inbox} title="Seguimiento de menciones" description="Cuántas menciones están abiertas, resueltas o ignoradas, y cuánto tarda el equipo en atenderlas." />
        <KpiStrip label="Seguimiento de menciones">
          <Stat label={<span className="inline-flex items-center gap-1">Abiertas <InfoTip text="Menciones relevantes que todavía no se han marcado como resueltas o ignoradas." /></span>} value={compact(summary.triage.open)} href={link({ status: 'open' })} />
          <Stat label={<span className="inline-flex items-center gap-1">Resueltas <InfoTip text="Menciones que el equipo ya atendió y marcó como resueltas." /></span>} value={compact(summary.triage.done)} href={link({ status: 'done' })} />
          <Stat label={<span className="inline-flex items-center gap-1">Ignoradas <InfoTip text="Menciones que el equipo decidió no seguir atendiendo." /></span>} value={compact(summary.triage.ignored)} href={link({ status: 'ignored' })} />
          <Stat
            label={<span className="inline-flex items-center gap-1">Pendientes por más de 24 h <InfoTip text="Menciones relevantes que siguen abiertas después de un día." /></span>}
            value={compact(summary.triage.waiting)}
            tone={summary.triage.waiting > 0 ? 'warning' : undefined}
            hint="Relevantes y aún abiertas"
          />
          <Stat label={<span className="inline-flex items-center gap-1">Atendidas <InfoTip text="Porcentaje de menciones relevantes que ya fueron resueltas." /></span>} value={summary.triage.handledRate === null ? '—' : `${Math.round(summary.triage.handledRate * 100)}%`} hint="Resueltas de las relevantes" />
          <Stat label={<span className="inline-flex items-center gap-1">Tiempo medio para resolver <InfoTip text="Tiempo habitual entre la llegada de una mención y el momento en que el equipo la resuelve." /></span>} value={duration(summary.triage.medianTimeToDoneMs)} hint="Mediana del periodo" />
        </KpiStrip>
      </section>
    </div>
  );
}
