'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';

const AXIS = 'var(--muted-foreground)';
const GRID = 'var(--border)';
const number = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 });

export type DailyPoint = { date: string; matched: number; positive: number; neutral: number; negative: number };
export type ConversationSeries = { name: string; color: string; points: Array<{ date: string; matched: number }> };
export type PlatformDatum = { label: string; value: number; color: string };

function dayLabel(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', timeZone: 'UTC' }).format(date);
}

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">{children}</div>;
}

export function ConversationChart({ series }: { series: ConversationSeries[] }) {
  const dates = [...new Set(series.flatMap((item) => item.points.map((point) => point.date)))].sort();
  const lookup = series.map((item) => new Map(item.points.map((point) => [point.date, point.matched])));
  const rows = dates.map((date, index) => Object.fromEntries([['date', date], ...series.map((item, itemIndex) => [
    `line${itemIndex}`,
    lookup[itemIndex].get(date) ?? 0,
  ])]));

  return (
    <div className="h-[280px] w-full sm:h-[320px]" role="img" aria-label="Menciones diarias del candidato y sus adversarios">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={(value: number) => number.format(value)} tick={{ fill: AXIS, fontSize: 11 }} tickLine={false} axisLine={false} width={46} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: 'var(--border)', strokeDasharray: '3 3' }}
            content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox>
                <p className="mb-1.5 font-semibold">{dayLabel(String(label))}</p>
                <div className="space-y-1">
                  {payload.map((entry) => <p key={String(entry.dataKey)} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: String(entry.color) }} />{String(entry.name)}: <strong className="tabular-nums">{number.format(Number(entry.value))} menciones</strong></p>)}
                </div>
              </TooltipBox>
            ) : null}
          />
          <Legend verticalAlign="bottom" height={34} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: AXIS }} />
          {series.map((item, index) => <Line key={item.name} type="monotone" dataKey={`line${index}`} name={item.name} stroke={item.color} strokeWidth={index === 0 ? 3 : 2} dot={false} activeDot={{ r: 4, strokeWidth: 0 }} isAnimationActive={false} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PlatformDonut({ data }: { data: PlatformDatum[] }) {
  return (
    <div className="h-[230px] w-full" role="img" aria-label="Distribución de menciones por plataforma">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="label" innerRadius="58%" outerRadius="84%" paddingAngle={2} stroke="var(--card)" strokeWidth={2} isAnimationActive={false}>
            {data.map((item) => <Cell key={item.label} fill={item.color} />)}
          </Pie>
          <Tooltip
            content={({ active, payload }) => active && payload?.length ? (
              <TooltipBox>
                <p className="font-semibold">{String(payload[0].name)}</p>
                <p className="mt-1 tabular-nums">{number.format(Number(payload[0].value))} menciones</p>
              </TooltipBox>
            ) : null}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DailyToneChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="h-[230px] w-full" role="img" aria-label="Menciones positivas, neutrales y negativas por día">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={GRID} strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="date" tickFormatter={dayLabel} tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={26} />
          <YAxis tickFormatter={(value: number) => number.format(value)} tick={{ fill: AXIS, fontSize: 10 }} tickLine={false} axisLine={false} width={38} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: 'var(--muted)' }}
            content={({ active, payload, label }) => active && payload?.length ? (
              <TooltipBox>
                <p className="mb-1.5 font-semibold">{dayLabel(String(label))}</p>
                <div className="space-y-1">
                  {payload.map((entry) => <p key={String(entry.dataKey)} className="flex items-center gap-2"><span className="size-2 rounded-full" style={{ backgroundColor: String(entry.color) }} />{String(entry.name)}: <strong className="tabular-nums">{number.format(Number(entry.value))} menciones</strong></p>)}
                </div>
              </TooltipBox>
            ) : null}
          />
          <Legend verticalAlign="bottom" height={30} iconType="circle" iconSize={7} wrapperStyle={{ fontSize: 11, color: AXIS }} />
          <Bar dataKey="positive" name="Positivas" stackId="tone" fill={SENTIMENT_COLORS.positive} isAnimationActive={false} />
          <Bar dataKey="neutral" name="Neutrales" stackId="tone" fill={SENTIMENT_COLORS.neutral} isAnimationActive={false} />
          <Bar dataKey="negative" name="Negativas" stackId="tone" fill={SENTIMENT_COLORS.negative} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
