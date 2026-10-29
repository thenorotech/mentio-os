/** Small pieces the people pages share. */
import type { Person } from '@mentio-dev/sdk';
import { SENTIMENT_COLORS } from '@/lib/chart-colors';

/** Positive, neutral and negative as one stacked bar, in the sentiment colors every chart uses. */
export function SentimentBar({ sentiment, className = 'h-1.5 w-24' }: { sentiment: Person['stats']['sentiment']; className?: string }) {
  const total = sentiment.positive + sentiment.neutral + sentiment.negative;
  if (total === 0) return <span className="text-xs text-muted-foreground">Sin datos de sentimiento</span>;
  const pct = (n: number) => `${(n / total) * 100}%`;
  const label = `${sentiment.positive} positivo, ${sentiment.neutral} neutral, ${sentiment.negative} negativo`;
  return (
    <div role="img" aria-label={`Sentimiento: ${label}`} title={label} className={`flex overflow-hidden rounded-full bg-muted ${className}`}>
      <div style={{ width: pct(sentiment.positive), backgroundColor: SENTIMENT_COLORS.positive }} />
      <div style={{ width: pct(sentiment.neutral), backgroundColor: SENTIMENT_COLORS.neutral }} />
      <div style={{ width: pct(sentiment.negative), backgroundColor: SENTIMENT_COLORS.negative }} />
    </div>
  );
}

export function Avatar({ person, size = 'size-8' }: { person: Pick<Person, 'name' | 'handle' | 'avatarUrl'>; size?: string }) {
  const initial = (person.name ?? person.handle ?? '?').replace(/^@/, '').charAt(0).toUpperCase();
  return person.avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={person.avatarUrl} alt="" className={`${size} shrink-0 rounded-full bg-muted object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-medium text-primary`}>{initial}</span>
  );
}

export const displayName = (person: Pick<Person, 'name' | 'handle' | 'id'>) => person.name ?? person.handle ?? person.id;
