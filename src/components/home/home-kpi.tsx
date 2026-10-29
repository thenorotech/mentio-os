import type { ReactNode } from 'react';
import { Sparkline } from '@/components/charts';
import { TONE_TEXT } from '@/components/ui';
import { cn } from '@/lib/utils';

export type KpiChange = { label: string; tone: 'good' | 'bad' | 'muted' };

const changeTone = {
  good: TONE_TEXT.positive,
  bad: TONE_TEXT.negative,
  muted: 'text-muted-foreground',
} as const;

/** A tile of the home's KPI strip (Inerpy's KpiTile), with a change already labeled ("+3 pts", "Nuevo"). */
export function HomeKpi({
  label,
  value,
  change,
  spark,
  valueClassName,
  sparkTone = 'accent',
  hint,
}: {
  label: string;
  value: ReactNode;
  change: KpiChange | null;
  spark: number[];
  valueClassName?: string;
  sparkTone?: 'accent' | 'bad';
  hint?: string;
}) {
  return (
    <div data-slot="kpi-tile" className="flex min-w-0 flex-col gap-0.5 bg-card px-3.5 py-3 fill-mode-both duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1">
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span className="min-w-0 truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        {change ? (
          <span title="Cambio frente al periodo anterior" className={cn('shrink-0 text-[11px] font-semibold tabular-nums', changeTone[change.tone])}>{change.label}</span>
        ) : (
          <span className="shrink-0 text-[10px] text-muted-foreground">Sin base previa</span>
        )}
      </div>
      <div className="flex min-w-0 items-end justify-between gap-2">
        <span className={cn('min-w-0 truncate text-xl leading-tight font-semibold tracking-tight tabular-nums @5xl/home:text-2xl', valueClassName)}>{value}</span>
        {spark.length > 1 ? <Sparkline values={spark} tone={sparkTone} className="h-[22px] w-16" /> : null}
      </div>
      <span className="truncate text-[11px] text-muted-foreground">{hint ?? 'vs. periodo anterior'}</span>
    </div>
  );
}
