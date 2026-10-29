'use client';

/**
 * The two charts of Cara a cara, drawn inside the page's chart cards: voice
 * share per contender and the tone split of their mentions. The page owns
 * the cards, the empty states and the legend; these only draw. Chrome
 * (grid, ticks, cursor, labels) reads css vars so it follows dark mode.
 */
import { ChartContainer } from '@/components/ui/chart';
import { compact } from '@/lib/format';
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Tooltip,
  XAxis,
  YAxis,
  type LabelProps,
} from 'recharts';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';

export type FaceoffKeyword = {
  id: string;
  label: string;
  share: number;
  matched: number;
  tone: {
    positive: number;
    neutral: number;
    negative: number;
    unclassified: number;
  };
};

type SentimentRow = FaceoffKeyword['tone'] & {
  label: string;
  matched: number;
  positiveShare: number;
  neutralShare: number;
  negativeShare: number;
};

const SENTIMENT_NAMES = {
  positive: 'Positivo',
  neutral: 'Neutral',
  negative: 'Negativo',
} as const;

type SegmentLabelProps = LabelProps & {
  viewBox?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
  index?: number;
};

const TICK = { fill: 'var(--muted-foreground)', fontSize: 11 };
const CURSOR = { fill: 'var(--muted)', opacity: 0.6 };
const ROW_HEIGHT = 42;

function segmentLabels(shares: number[]) {
  return (props: SegmentLabelProps) => {
    const share = shares[props.index ?? -1] ?? 0;
    const { x: left, y: top, width, height } = props.viewBox ?? {};
    if (share < 0.1 || left == null || top == null || width == null || height == null || width < 34) return null;
    return (
      <text
        x={left + width / 2}
        y={top + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        stroke="rgb(0 0 0 / 0.35)"
        strokeWidth={2}
        paintOrder="stroke"
        fontSize={11}
        fontWeight={600}
        pointerEvents="none"
      >
        {`${Math.round(share * 100)}%`}
      </text>
    );
  };
}

function VoiceTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: FaceoffKeyword }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{row.label}</p>
      <p className="tabular-nums">{row.share.toFixed(1)}% de participación · {compact(row.matched)} menciones</p>
    </div>
  );
}

function ToneTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload?: SentimentRow }> }) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;
  const classified = row.positive + row.neutral + row.negative;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
      <p className="font-medium">{row.label}</p>
      <p className="tabular-nums">{compact(row.positive)} positivas · {compact(row.neutral)} neutrales · {compact(row.negative)} negativas</p>
      {row.unclassified ? <p className="text-muted-foreground tabular-nums">{compact(row.unclassified)} aún sin tono</p> : null}
      {!classified ? <p className="text-muted-foreground">Sin menciones con tono identificado.</p> : null}
    </div>
  );
}

/** Voice share per contender, 0–100%, one horizontal bar each. */
export function VoiceShareChart({ rows, color, label }: { rows: FaceoffKeyword[]; color: string; label: string }) {
  const height = Math.max(96, rows.length * ROW_HEIGHT + 16);
  return (
    <ChartContainer
      config={{ share: { label: 'Participación', color } }}
      className="aspect-auto w-full"
      style={{ height }}
      role="img"
      aria-label={`Participación de voz: ${label}. ${rows.map((row) => `${row.label} ${row.share.toFixed(1)}%`).join(', ')}.`}
    >
      <BarChart data={rows} layout="vertical" margin={{ top: 2, right: 48, bottom: 2, left: 2 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis type="number" domain={[0, 100]} hide />
        <YAxis type="category" dataKey="label" width={112} tick={TICK} tickLine={false} axisLine={false} />
        <Tooltip cursor={CURSOR} content={<VoiceTooltip />} />
        <Bar dataKey="share" fill={color} radius={[0, 5, 5, 0]} barSize={24} isAnimationActive={false}>
          <LabelList
            dataKey="share"
            position="right"
            fill="var(--foreground)"
            fontSize={11}
            fontWeight={600}
            formatter={(value) => `${Number(value).toFixed(1)}%`}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

/** Positive / neutral / negative split of each contender's classified mentions, stacked to 100%. */
export function ToneSplitChart({ rows, label }: { rows: FaceoffKeyword[]; label: string }) {
  const toneRows: SentimentRow[] = rows.map((row) => {
    const total = row.tone.positive + row.tone.neutral + row.tone.negative;
    return {
      ...row.tone,
      label: row.label,
      matched: row.matched,
      positiveShare: total ? row.tone.positive / total : 0,
      neutralShare: total ? row.tone.neutral / total : 0,
      negativeShare: total ? row.tone.negative / total : 0,
    };
  });
  const height = Math.max(112, rows.length * ROW_HEIGHT + 40);
  const percent = (value: number) => `${Math.round(value * 100)}%`;
  return (
    <ChartContainer
      config={{
        positive: { label: SENTIMENT_NAMES.positive, color: SENTIMENT_COLORS.positive },
        neutral: { label: SENTIMENT_NAMES.neutral, color: SENTIMENT_COLORS.neutral },
        negative: { label: SENTIMENT_NAMES.negative, color: SENTIMENT_COLORS.negative },
      }}
      className="aspect-auto w-full"
      style={{ height }}
      role="img"
      aria-label={`Tono de las menciones: ${label}. ${toneRows.map((row) => `${row.label}: ${percent(row.positiveShare)} positivo, ${percent(row.neutralShare)} neutral, ${percent(row.negativeShare)} negativo`).join('; ')}.`}
    >
      <BarChart data={toneRows} layout="vertical" stackOffset="expand" margin={{ top: 2, right: 8, bottom: 2, left: 2 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          type="number"
          domain={[0, 1]}
          tickFormatter={(value) => percent(Number(value))}
          tick={{ ...TICK, fontSize: 10 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis type="category" dataKey="label" width={112} tick={TICK} tickLine={false} axisLine={false} />
        <Tooltip cursor={CURSOR} content={<ToneTooltip />} />
        <Bar dataKey="positiveShare" stackId="tone" fill={SENTIMENT_COLORS.positive} barSize={24} isAnimationActive={false}>
          <LabelList position="center" content={segmentLabels(toneRows.map((row) => row.positiveShare))} />
        </Bar>
        <Bar dataKey="neutralShare" stackId="tone" fill={SENTIMENT_COLORS.neutral} barSize={24} isAnimationActive={false}>
          <LabelList position="center" content={segmentLabels(toneRows.map((row) => row.neutralShare))} />
        </Bar>
        <Bar dataKey="negativeShare" stackId="tone" fill={SENTIMENT_COLORS.negative} radius={[0, 5, 5, 0]} barSize={24} isAnimationActive={false}>
          <LabelList position="center" content={segmentLabels(toneRows.map((row) => row.negativeShare))} />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
