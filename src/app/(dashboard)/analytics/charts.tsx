/** What the analytics page needs beyond the kit: the change label, the empty chart, the hour heatmap and the tabs. */
import type { AnalyticsBreakdown } from '@mentio-dev/sdk';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ChartEmpty, TONE_TEXT } from '@/components/ui';
import { Tabs } from '@/components/ui/client';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { change } from './window';

export { ShareBar, Sparkline } from '@/components/charts';

/** "+12%" in green, "-8%" in red, against the previous window; the sign carries the meaning, not only the color. */
export function Delta({ current, previous, invert = false, short = false }: { current: number; previous: number | null | undefined; invert?: boolean; short?: boolean }) {
  const pct = change(current, previous);
  if (pct === null) return null;
  if (pct === 0) return <span className="text-muted-foreground">Sin cambios</span>;
  const up = pct > 0;
  const good = invert ? !up : up;
  const text = pct === Infinity ? 'Nuevo' : `${up ? '+' : ''}${Math.round(pct)}%`;
  return (
    <span className={cn('tabular-nums', good ? TONE_TEXT.positive : TONE_TEXT.negative)}>
      {text}{short ? null : <span className="text-muted-foreground"> frente al periodo anterior</span>}
    </span>
  );
}

/**
 * A chart card with nothing to draw yet: the kit's ChartEmpty (the card keeps
 * its place in the grid) with what will appear, an example and a quiet link
 * to set it up. The link is secondary: the page keeps one primary action.
 */
export function AnalyticsEmpty({ title, example, action = { href: '/keywords/new', label: 'Agregar término' } }: { title: string; example?: string; action?: { href: string; label: string } | null }) {
  return (
    <ChartEmpty>
      <div className="flex max-w-sm flex-col items-center gap-1.5">
        <p className="font-medium text-foreground">{title}</p>
        {example ? <p className="text-xs">{example}</p> : null}
        {action ? (
          <Link href={action.href} className="mt-1 rounded-sm text-xs font-medium text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
            {action.label}
          </Link>
        ) : null}
      </div>
    </ChartEmpty>
  );
}

const WEEKDAYS = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const ORDER = [1, 2, 3, 4, 5, 6, 0];
const LEGEND_STEPS = [0.15, 0.35, 0.55, 0.75, 1];

/** by=hour as a weekday by hour grid; darker is busier. */
export function HourHeatmap({ rows }: { rows: AnalyticsBreakdown['data'] }) {
  const cells = new Map<string, number>();
  for (const row of rows) if (row.slot) cells.set(`${row.slot.weekday}-${row.slot.hour}`, row.matched);
  const max = Math.max(1, ...cells.values());
  if (cells.size === 0) return <AnalyticsEmpty title="Aún no hay horarios con menciones" example="Cuando se publique una mención sobre “María López”, aquí verás los días y horas con más conversación." />;
  return (
    <figure className="flex flex-col gap-3">
      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full gap-0.5 text-[10px] text-muted-foreground tabular-nums" style={{ gridTemplateColumns: 'auto repeat(24, minmax(12px, 1fr))' }}>
          <span />
          {Array.from({ length: 24 }, (_, h) => (
            <span key={h} aria-hidden className="text-center">{h % 6 === 0 ? h : ''}</span>
          ))}
          {ORDER.map((day, dayIndex) => (
            <HeatRow key={`${day}-${dayIndex}`} day={day} cells={cells} max={max} />
          ))}
        </div>
      </div>
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span className="tabular-nums">Máximo: {max.toLocaleString('es-MX')} menciones en una hora</span>
        <span className="flex items-center gap-1" aria-hidden>
          Menos
          {LEGEND_STEPS.map((o) => <span key={o} className="size-2.5 rounded-sm bg-primary" style={{ opacity: o }} />)}
          Más
        </span>
      </figcaption>
    </figure>
  );
}

function HeatRow({ day, cells, max }: { day: number; cells: Map<string, number>; max: number }) {
  return (
    <>
      <span className="pr-1.5 leading-4">{WEEKDAYS[day]}</span>
      {Array.from({ length: 24 }, (_, hour) => {
        const n = cells.get(`${day}-${hour}`) ?? 0;
        const label = `${WEEKDAYS[day]} ${String(hour).padStart(2, '0')}:00 · ${n} menciones`;
        return (
          <Tooltip key={hour}>
            <TooltipTrigger render={<span role="img" aria-label={label} className="h-4 rounded-sm bg-primary" style={{ opacity: n === 0 ? 0.06 : 0.15 + (n / max) * 0.85 }} />} />
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </>
  );
}

/** Tabs driven by a search param, keeping the rest of the URL: the kit's shadcn Tabs. */
export function ParamTabs({ current, items }: { current: string; items: Array<{ value: string; label: ReactNode; href: string }> }) {
  return <Tabs current={current} items={items} />;
}
