import { SENTIMENT_COLORS } from '@/lib/chart-colors';
import type { InsightSummary } from '@/lib/insights';

const number = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });

/** A half-dial from negative to positive: the arc in the sentiment colors, the needle and the score in the foreground. */
export function ToneMeter({ sentiment, id }: { sentiment: InsightSummary['sentiment']; id: string }) {
  const classified = sentiment.positive + sentiment.neutral + sentiment.negative;
  const score = classified ? (sentiment.positive - sentiment.negative) / classified : 0;
  const angle = Math.PI + ((score + 1) / 2) * Math.PI;
  const tipX = 80 + Math.cos(angle) * 53;
  const tipY = 78 + Math.sin(angle) * 53;
  const label = classified ? `${score > 0 ? '+' : ''}${number.format(Math.round(score * 100))} de 100` : 'Sin datos';
  const gradientId = `tone-${id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div className="mx-auto w-full max-w-56">
      <svg viewBox="0 0 160 106" role="img" aria-label={`Tono de la conversación, de negativo a positivo: ${label}`} className="mx-auto block w-full text-foreground">
        <defs>
          <linearGradient id={gradientId} x1="0%" x2="100%" y1="0%" y2="0%">
            <stop offset="0%" stopColor={SENTIMENT_COLORS.negative} />
            <stop offset="50%" stopColor={SENTIMENT_COLORS.neutral} />
            <stop offset="100%" stopColor={SENTIMENT_COLORS.positive} />
          </linearGradient>
        </defs>
        <path d="M 18 78 A 62 62 0 0 1 142 78" fill="none" stroke={`url(#${gradientId})`} strokeWidth="10" strokeLinecap="round" opacity={classified ? 1 : 0.35} />
        <line x1="80" y1="78" x2={tipX} y2={tipY} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="80" cy="78" r="4.5" fill="currentColor" />
        <text x="80" y="68" textAnchor="middle" className="fill-foreground text-[13px] font-semibold tabular-nums">{label}</text>
      </svg>
      <div aria-hidden className="-mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>Negativo</span>
        <span>Positivo</span>
      </div>
    </div>
  );
}
