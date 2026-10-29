'use client';

/**
 * Every chart in the app, on shadcn's Chart (Recharts underneath): a
 * ChartContainer with a config per series, the shadcn tooltip and legend.
 * Pages hand over plain arrays, so a server page can render them.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, LineChart as RLineChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { Progress } from '@/components/ui/progress';
import { CHART_COLORS } from '@/lib/chart-colors';
import { cn } from '@/lib/utils';

const compact = (n: number) => new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.round(n));

/** Fecha corta para una fecha o una hora ISO. */
const shortDay = (value: string) => {
  const d = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  return Number.isNaN(d.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(d);
};

/** The fallback when a chart gets no rows: the kit's ChartEmpty look (ui/index imports this file, so it is restated here). */
const emptyClass = 'flex min-h-[220px] flex-1 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-balance text-muted-foreground';
const empty = <div className={emptyClass}>No hay datos en este periodo.</div>;

type Series = { name: string; color: string; values: number[]; dashed?: boolean };

/** One row per label with a key per series (`s0`, `s1`, ...), and the shadcn config naming them. */
function shape(labels: string[], series: Series[]) {
  const config: ChartConfig = {};
  series.forEach((s, i) => (config[`s${i}`] = { label: s.name, color: s.color }));
  const data = labels.map((label, row) => Object.fromEntries([['label', label], ...series.map((s, i) => [`s${i}`, s.values[row] ?? 0])]));
  return { config, data };
}

const axes = (
  <>
    <CartesianGrid vertical={false} />
    <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={32} tickFormatter={shortDay} />
    <YAxis tickLine={false} axisLine={false} width={36} tickFormatter={compact} allowDecimals={false} />
  </>
);
const tooltip = <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => shortDay(String(value))} />} />;

/**
 * Stacked daily bars (say, matches split by platform) with lines drawn over
 * them (relevant, the previous period): the main dashboard chart.
 */
export function StackedBars({ labels, stacks, lines = [], height = 240 }: { labels: string[]; stacks: Series[]; lines?: Series[]; height?: number }) {
  if (labels.length === 0) return empty;
  const { config, data } = shape(labels, [...stacks, ...lines]);
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <ComposedChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        {axes}
        {tooltip}
        {stacks.map((_, i) => (
          <Bar key={i} isAnimationActive={false} dataKey={`s${i}`} stackId="stack" fill={`var(--color-s${i})`} maxBarSize={24} radius={i === stacks.length - 1 ? [3, 3, 0, 0] : 0} />
        ))}
        {lines.map((l, i) => {
          const key = `s${stacks.length + i}`;
          return <Line key={key} isAnimationActive={false} dataKey={key} type="monotone" stroke={`var(--color-${key})`} strokeWidth={2} strokeDasharray={l.dashed ? '4 4' : undefined} dot={false} />;
        })}
        <ChartLegend content={<ChartLegendContent />} />
      </ComposedChart>
    </ChartContainer>
  );
}

/** Lines over the same dates. */
export function LineChart({ labels, series, height = 220 }: { labels: string[]; series: Array<{ name: string; values: number[]; color?: string }>; height?: number }) {
  if (labels.length === 0) return empty;
  const { config, data } = shape(labels, series.map((s, i) => ({ ...s, color: s.color ?? CHART_COLORS[i % CHART_COLORS.length] })));
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height }}>
      <RLineChart data={data} margin={{ left: 0, right: 4, top: 8 }}>
        {axes}
        {tooltip}
        {series.map((_, i) => (
          <Line key={i} isAnimationActive={false} dataKey={`s${i}`} type="monotone" stroke={`var(--color-s${i})`} strokeWidth={2} dot={false} />
        ))}
        {series.length > 1 ? <ChartLegend content={<ChartLegendContent />} /> : null}
      </RLineChart>
    </ChartContainer>
  );
}

/** A tiny trend with a soft fill, for stat cards and table rows. */
export function Sparkline({ values, tone = 'accent', className }: { values: number[]; tone?: 'accent' | 'bad'; className?: string }) {
  if (values.length < 2) return null;
  const config: ChartConfig = { v: { label: 'Valor', color: tone === 'bad' ? 'var(--destructive)' : 'var(--primary)' } };
  const data = values.map((v, i) => ({ i, v }));
  return (
    <ChartContainer config={config} className={cn('aspect-auto h-6 w-16 shrink-0', className)} aria-hidden>
      <AreaChart data={data} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
        <Area dataKey="v" type="monotone" stroke="var(--color-v)" strokeWidth={1.5} fill="var(--color-v)" fillOpacity={0.12} isAnimationActive={false} />
      </AreaChart>
    </ChartContainer>
  );
}

/** One bar split into shares (share of voice), with the shadcn legend. */
export function ShareBar({ items }: { items: Array<{ label: string; value: number; color: string; href?: string }> }) {
  const total = items.reduce((sum, i) => sum + i.value, 0);
  if (total === 0) return <div className={emptyClass}>No hay menciones de candidatos o adversarios en este periodo.</div>;
  const config: ChartConfig = {};
  items.forEach((item, i) => (config[`s${i}`] = { label: item.label, color: item.color }));
  const data = [Object.fromEntries(items.map((item, i) => [`s${i}`, item.value]))];
  return (
    <div>
      <ChartContainer config={config} className="aspect-auto h-8 w-full">
        <BarChart data={data} layout="vertical" margin={{ top: 0, bottom: 0, left: 0, right: 0 }} barCategoryGap={0}>
          <XAxis type="number" hide domain={[0, total]} />
          <YAxis type="category" hide />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={(value, name) => `${config[String(name)]?.label}: ${Number(value).toFixed(1)}%`} />} />
          {items.map((_, i) => (
            <Bar key={i} isAnimationActive={false} dataKey={`s${i}`} stackId="share" fill={`var(--color-s${i})`} radius={i === 0 ? [4, 0, 0, 4] : i === items.length - 1 ? [0, 4, 4, 0] : 0} />
          ))}
        </BarChart>
      </ChartContainer>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {items.map((item) => {
          const body = (
            <>
              <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: item.color }} />
              {item.label} <span className="text-foreground tabular-nums">{item.value.toFixed(1)}%</span>
            </>
          );
          return item.href ? (
            <Link key={item.label} href={item.href} className="flex items-center gap-1.5 rounded-sm hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{body}</Link>
          ) : (
            <span key={item.label} className="flex items-center gap-1.5">{body}</span>
          );
        })}
      </div>
    </div>
  );
}

/** Labelled bars for a breakdown, each a shadcn Progress; an item may carry an icon (a platform logo). */
export function BarList({ items, format = 'compact' }: { items: Array<{ label: ReactNode; value: number; href?: string; icon?: ReactNode }>; format?: 'compact' | 'plain' }) {
  if (items.length === 0) return empty;
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-2">
              {item.icon}
              {item.href ? <Link href={item.href} className="truncate rounded-sm hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{item.label}</Link> : <span className="truncate">{item.label}</span>}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{format === 'plain' ? item.value.toLocaleString('es-MX') : compact(item.value)}</span>
          </div>
          <Progress value={(item.value / max) * 100} locale="es-MX" className="mt-1.5" aria-label={typeof item.label === 'string' ? item.label : undefined} />
        </li>
      ))}
    </ul>
  );
}
