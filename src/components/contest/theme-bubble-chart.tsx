'use client';

import { SENTIMENT_COLORS } from '@/lib/chart-colors';

export type ThemeBubble = {
  id: string;
  name: string;
  matched: number;
  sentimentScore: number | null;
  href: string;
};

const WIDTH = 1000;
const LEFT = 116;
const RIGHT = 28;
const TOP = 40;
const BOTTOM_GAP = 82;

function mixColor(from: string, to: string, amount: number) {
  const start = from.match(/[a-f\d]{2}/gi)?.map((part) => Number.parseInt(part, 16)) ?? [128, 128, 128];
  const end = to.match(/[a-f\d]{2}/gi)?.map((part) => Number.parseInt(part, 16)) ?? [128, 128, 128];
  const channels = start.map((value, index) => Math.round(value + ((end[index] ?? value) - value) * amount));
  return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
}

/** The bubble's fill: the sentiment palette, blended from negative through neutral to positive. */
function toneColor(score: number | null) {
  if (score === null) return SENTIMENT_COLORS.neutral;
  const bounded = Math.max(-1, Math.min(1, score));
  return bounded <= 0
    ? mixColor(SENTIMENT_COLORS.negative, SENTIMENT_COLORS.neutral, bounded + 1)
    : mixColor(SENTIMENT_COLORS.neutral, SENTIMENT_COLORS.positive, bounded);
}

function toneText(score: number | null) {
  if (score === null) return 'Aún no hay menciones con tono identificado.';
  if (score >= 0.15) return 'El tono se inclina a positivo.';
  if (score <= -0.15) return 'El tono se inclina a negativo.';
  return 'El tono está equilibrado entre positivo y negativo.';
}

function scoreForPlot(score: number | null) {
  return score === null || !Number.isFinite(score) ? 0 : Math.max(-1, Math.min(1, score));
}

export function ThemeBubbleChart({ topics }: { topics: ThemeBubble[] }) {
  const height = Math.max(440, Math.min(1200, topics.length * 28 + 180));
  const plotBottom = height - BOTTOM_GAP;
  const plotRight = WIDTH - RIGHT;
  const plotWidth = plotRight - LEFT;
  const plotHeight = plotBottom - TOP;

  // Keep nearly identical volumes from landing on the exact same pixel. The
  // displayed mention count remains the source value shown in each tooltip.
  const sortedTopics = [...topics].sort((a, b) => a.matched - b.matched || a.name.localeCompare(b.name, 'es'));
  const plottedVolume = new Map<string, number>();
  for (let start = 0; start < sortedTopics.length;) {
    const anchor = sortedTopics[start];
    const anchorScore = scoreForPlot(anchor.sentimentScore);
    let end = start + 1;
    while (end < sortedTopics.length) {
      const next = sortedTopics[end];
      if (next.matched - anchor.matched > 10 || Math.abs(scoreForPlot(next.sentimentScore) - anchorScore) > 0.35) break;
      end += 1;
    }
    const cluster = sortedTopics.slice(start, end);
    const pitch = cluster.length > 1 ? Math.min(2.5, 8 / (cluster.length - 1)) : 0;
    cluster.forEach((topic, index) => {
      const offset = (index - (cluster.length - 1) / 2) * pitch;
      plottedVolume.set(topic.id, Math.max(0, topic.matched + offset));
    });
    start = end;
  }

  const maxVolume = Math.max(1, ...topics.map((topic) => plottedVolume.get(topic.id) ?? topic.matched));
  const xFor = (volume: number) => LEFT + (Math.max(0, volume) / maxVolume) * plotWidth;
  const yFor = (score: number) => TOP + ((1 - score) / 2) * plotHeight;
  const xTicks = maxVolume <= 4
    ? [0, maxVolume / 2, maxVolume]
    : [0, maxVolume * 0.25, maxVolume * 0.5, maxVolume * 0.75, maxVolume];
  const formatTick = (value: number) => Math.round(value).toLocaleString('es-MX');

  if (topics.length === 0) {
    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
        No hay temas en este periodo.
      </div>
    );
  }

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${height}`}
      role="group"
      aria-label="Mapa de temas por volumen de menciones y tono"
      className="block h-auto w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Conversación por tema</title>

      {[-1, 0, 1].map((score) => {
        const y = yFor(score);
        const label = score < 0 ? 'Negativo' : score > 0 ? 'Positivo' : 'Parejo';
        return (
          <g key={score}>
            <line x1={LEFT} y1={y} x2={plotRight} y2={y} stroke="var(--border)" strokeDasharray={score === 0 ? undefined : '3 5'} />
            <text x={LEFT - 10} y={y + 4} textAnchor="end" fill="var(--muted-foreground)" fontSize={12}>{label}</text>
          </g>
        );
      })}

      {xTicks.map((tick, index) => {
        const x = xFor(tick);
        return (
          <g key={`${tick}-${index}`}>
            <line x1={x} y1={TOP} x2={x} y2={plotBottom} stroke="var(--border)" strokeDasharray="3 5" />
            <text x={x} y={plotBottom + 20} textAnchor="middle" fill="var(--muted-foreground)" fontSize={12}>{formatTick(tick)}</text>
          </g>
        );
      })}

      <line x1={LEFT} y1={plotBottom} x2={plotRight} y2={plotBottom} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
      <line x1={LEFT} y1={TOP} x2={LEFT} y2={plotBottom} stroke="var(--muted-foreground)" strokeOpacity={0.6} />
      <text x={(LEFT + plotRight) / 2} y={height - 18} textAnchor="middle" fill="var(--muted-foreground)" fontSize={13}>
        Cuánto se habla
      </text>
      <text
        x={20}
        y={(TOP + plotBottom) / 2}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize={13}
        transform={`rotate(-90 20 ${(TOP + plotBottom) / 2})`}
      >
        Tono
      </text>

      {topics.map((topic) => {
        const matched = Number.isFinite(topic.matched) ? Math.max(0, topic.matched) : 0;
        const plotted = plottedVolume.get(topic.id) ?? matched;
        const ratio = Math.max(0, Math.min(1, matched / maxVolume));
        const radius = 8 + Math.sqrt(ratio) * 16;
        const cx = xFor(plotted);
        const cy = yFor(scoreForPlot(topic.sentimentScore));
        const labelInside = radius >= 25 && topic.name.length <= 12;
        const labelOnLeft = cx > plotRight - 110;
        const labelX = cx + (labelInside ? 0 : (labelOnLeft ? -1 : 1) * (radius + 7));
        const labelAnchor = labelInside ? 'middle' : labelOnLeft ? 'end' : 'start';
        const tooltip = `${topic.name}: ${matched.toLocaleString('es-MX')} menciones. ${toneText(topic.sentimentScore)}`;

        return (
          <a
            key={topic.id}
            href={topic.href}
            aria-label={`Ver menciones de ${topic.name}, ${matched.toLocaleString('es-MX')} menciones. ${toneText(topic.sentimentScore)}`}
            className="group cursor-pointer outline-none"
          >
            <title>{tooltip}</title>
            {/* The focus ring: a halo in --ring around the bubble, only while it has keyboard focus. */}
            <circle cx={cx} cy={cy} r={radius + 4} fill="none" stroke="var(--ring)" strokeWidth={3} className="opacity-0 group-focus-visible:opacity-100" />
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill={toneColor(topic.sentimentScore)}
              fillOpacity={0.88}
              stroke="var(--background)"
              strokeWidth={2}
              className="motion-safe:transition-[fill-opacity] group-hover:[fill-opacity:1]"
            />
            <text
              x={labelX}
              y={cy + 4}
              textAnchor={labelAnchor}
              fill={labelInside ? 'white' : 'var(--foreground)'}
              stroke={labelInside ? 'rgb(0 0 0 / 0.55)' : 'var(--background)'}
              strokeWidth={2.5}
              paintOrder="stroke"
              fontSize={labelInside ? 9 : 11}
              fontWeight={600}
              pointerEvents="none"
            >
              {topic.name}
            </text>
          </a>
        );
      })}
    </svg>
  );
}
