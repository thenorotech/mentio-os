import type { AnalyticsBreakdown } from '@mentio-dev/sdk';
import { CalendarClock, Globe, MessageCircle, type LucideIcon } from 'lucide-react';
import { BarList, Card, SectionHeading } from '@/components/ui';
import { platformName, tagName } from '@/lib/format';
import { GLOSSARY } from '@/lib/glossary';
import { mentio, unwrap } from '@/lib/mentio';
import { AnalyticsEmpty, HourHeatmap } from './charts';
import { keywordName, mentionsHref, type WindowQuery } from './window';

type Row = AnalyticsBreakdown['data'][number];
type By = AnalyticsBreakdown['by'];
type Dimension = Exclude<By, 'hour'>;

const LANGUAGES = new Intl.DisplayNames(['es-MX'], { type: 'language' });
const languageName = (code: string) => {
  if (code === 'unknown') return 'Desconocido';
  try {
    return LANGUAGES.of(code) ?? code;
  } catch {
    return code;
  }
};

/** Each dimension: how to name a row and which feed filter it opens. */
const DIMENSIONS: Array<{ by: Dimension; title: string; hint: string; description?: string; emptyTitle: string; example: string; label: (r: Row) => string; filter: (r: Row) => Record<string, string> | null }> = [
  { by: 'platform', title: 'Plataforma', hint: 'Canal donde se publicaron las menciones, como Instagram o Reddit.', emptyTitle: 'Aún no hay plataformas con menciones', example: 'Una publicación sobre “María López” en Instagram aparecerá aquí como actividad de ese canal.', label: (r) => platformName(r.key), filter: (r) => ({ platforms: r.key }) },
  { by: 'keyword', title: 'Término monitoreado', hint: 'Candidato, adversario o tema que la campaña decidió seguir.', emptyTitle: 'Aún no hay términos con menciones', example: 'Registra “María López” y “seguridad” para ver qué parte de la conversación corresponde a cada término.', label: (r) => (r.keyword ? keywordName(r.keyword) : r.label), filter: (r) => (r.keyword ? { keywordIds: r.keyword.id } : null) },
  { by: 'sentiment', title: 'Sentimiento', hint: GLOSSARY['sentimiento o tono'].definition, emptyTitle: 'Aún no hay menciones con tono clasificado', example: 'Una publicación que apoya la propuesta de seguridad puede aparecer como positiva.', label: (r) => ({ positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo', unclassified: 'Sin clasificar' }[r.key] ?? tagName(r.key)), filter: (r) => (r.key === 'unclassified' ? null : { sentiments: r.key }) },
  { by: 'intent', title: 'Intención', hint: GLOSSARY.intención.definition, description: 'Una mención puede tener varias intenciones; los porcentajes se superponen.', emptyTitle: 'Aún no hay intenciones identificadas', example: '“¿Dónde voto?” puede aparecer como pregunta y “apoyo la propuesta” como apoyo.', label: (r) => ({ buy_intent: 'Intención de apoyo', question: 'Pregunta', complaint: 'Queja', praise: 'Reconocimiento', comparison: 'Comparación', churn_intent: 'Intención de cambio', bug_report: 'Reporte de error', pricing: 'Costo', hiring: 'Contratación', event: 'Evento', promotional: 'Promoción' } as Record<string, string>)[r.key] ?? tagName(r.key), filter: (r) => ({ intents: r.key }) },
  { by: 'status', title: 'Estado', hint: 'Muestra si el equipo ya atendió o todavía tiene pendiente la mención.', emptyTitle: 'Aún no hay menciones por atender', example: 'Una queja nueva sobre “seguridad” aparecerá como abierta hasta que el equipo la atienda.', label: (r) => ({ open: 'Abierto', done: 'Resuelto', ignored: 'Ignorado', snoozed: 'Pospuesto', new: 'Nuevo' }[r.key] ?? tagName(r.key)), filter: (r) => ({ status: r.key }) },
  { by: 'language', title: 'Idioma', hint: 'Idioma que se detectó en la publicación.', emptyTitle: 'Aún no hay idiomas identificados', example: 'Una publicación en español sobre “María López” se contará bajo español.', label: (r) => languageName(r.key), filter: (r) => (r.key === 'unknown' ? null : { languages: r.key }) },
  { by: 'person', title: 'Autores con más menciones', hint: GLOSSARY.autor.definition, description: 'Se omiten las publicaciones anónimas.', emptyTitle: 'Aún no hay autores identificados', example: 'Si una periodista publica varias veces sobre “movilidad”, sus menciones aparecerán agrupadas.', label: (r) => r.person?.name ?? r.label, filter: () => null },
];

/** The dashboard's blocks: three dimensions per row; the last row is the hour heatmap (two columns) and the authors. */
const SECTIONS: Array<{ id: string; icon: LucideIcon; title: string; description: string; dimensions: Dimension[]; heatmap?: boolean }> = [
  { id: 'breakdown-where', icon: Globe, title: 'Dónde y de qué se habla', description: 'Canales, términos monitoreados y tono de la conversación.', dimensions: ['platform', 'keyword', 'sentiment'] },
  { id: 'breakdown-how', icon: MessageCircle, title: 'Qué expresan y cómo se atienden', description: 'Intención de quien publica, estado de atención e idioma.', dimensions: ['intent', 'status', 'language'] },
  { id: 'breakdown-when', icon: CalendarClock, title: 'Cuándo y quién publica', description: 'Días y horas con más conversación y los autores más activos.', dimensions: ['person'], heatmap: true },
];

/** Every dimension the breakdown report groups by, each linking into the feed. */
export async function Breakdowns({ query, window }: { query: WindowQuery; window: { from: string; to: string } }) {
  const api = mentio();
  const [hour, ...reports] = await Promise.all([
    api.getAnalyticsBreakdown({ query: { ...query, by: 'hour' } }).then(unwrap),
    ...DIMENSIONS.map((d) => api.getAnalyticsBreakdown({ query: { ...query, by: d.by } }).then(unwrap)),
  ]);
  const report = (by: Dimension) => reports[DIMENSIONS.findIndex((d) => d.by === by)];
  let index = 0;

  const dimensionCard = (by: Dimension) => {
    const d = DIMENSIONS.find((x) => x.by === by)!;
    const rows = report(by).data;
    return (
      <Card key={d.by} index={index++} title={d.title} hint={d.hint} description={d.description}>
        {rows.length === 0 ? (
          <AnalyticsEmpty title={d.emptyTitle} example={d.example} />
        ) : <BarList
            items={rows.slice(0, 12).map((row) => {
              const filter = d.filter(row);
              const href = d.by === 'person' ? (row.person?.id ? `/people/${row.person.id}` : undefined) : filter ? mentionsHref(window, query, filter) : undefined;
              return { label: d.label(row), value: row.matched, href };
            })}
            format="plain"
          />}
      </Card>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {SECTIONS.map((s) => (
        <section key={s.id} aria-labelledby={s.id} className="flex flex-col gap-4">
          <SectionHeading id={s.id} icon={s.icon} title={s.title} description={s.description} />
          <div className="grid gap-4 @4xl:grid-cols-3">
            {s.heatmap ? (
              <Card index={index++} className="@4xl:col-span-2" title="Horario de publicación" hint={GLOSSARY.menciones.definition} description={`Menciones por día de la semana y hora, zona horaria ${hour.window.timezone}.`}>
                <HourHeatmap rows={hour.data} />
              </Card>
            ) : null}
            {s.dimensions.map(dimensionCard)}
          </div>
        </section>
      ))}
    </div>
  );
}
