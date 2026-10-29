import { ArrowUpRight, Gauge } from 'lucide-react';
import { Badge, LinkButton, TONE_TEXT, type KpiTone, type Tone } from '@/components/ui';
import { Card as ShadcnCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { plainSentence, trafficLight, type CandidateGroup, type InsightSummary, type PreviousInsightSummary, type TrafficLightColor } from '@/lib/insights';
import { ToneMeter } from './tone-meter';

/** The traffic light as a badge tone and a dot tone: the label always says it, the color only repeats it. */
const statusBadge: Record<TrafficLightColor, Tone> = {
  green: 'good',
  yellow: 'warn',
  red: 'bad',
  gray: 'neutral',
};

const statusDot: Record<TrafficLightColor, KpiTone | null> = {
  green: 'positive',
  yellow: 'warning',
  red: 'negative',
  gray: null,
};

export function BrandInsightCard({ candidate, summary, previous, topic }: {
  candidate: CandidateGroup;
  summary: InsightSummary;
  previous: PreviousInsightSummary;
  topic?: string;
}) {
  const light = trafficLight(summary, previous);
  const focus = summary.sentiment.negative >= summary.sentiment.positive ? 'negative' : 'positive';
  const href = `/mentions?keywordIds=${encodeURIComponent(candidate.keywordIds.join(','))}&sentiments=${focus}`;
  const dot = statusDot[light.color];

  return (
    <ShadcnCard className="min-w-0 @container">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><Gauge className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Pulso del candidato</p>
            <CardTitle className="truncate text-base font-semibold">{candidate.name}</CardTitle>
          </div>
        </div>
        <Badge tone={statusBadge[light.color]} className="shrink-0 gap-1.5">
          <span aria-hidden className={cn('size-1.5 rounded-full bg-current', dot ? TONE_TEXT[dot] : 'text-muted-foreground')} />
          {light.label}
        </Badge>
      </CardHeader>

      <CardContent className="grid items-center gap-5 @xl:grid-cols-[minmax(0,1fr)_minmax(220px,0.65fr)] @xl:gap-8">
        <div className="min-w-0">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Lectura rápida</p>
          <p className="mt-1.5 max-w-3xl text-sm leading-6 text-pretty text-foreground @2xl:text-base">{plainSentence(summary, previous, topic)}</p>
          {topic ? (
            <p className="mt-3 inline-flex items-center gap-2 rounded-md bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              <span aria-hidden className="size-1.5 rounded-full bg-primary" /> Tema que más conversa: <strong className="font-semibold text-foreground">{topic}</strong>
            </p>
          ) : null}
          <div className="mt-4">
            <LinkButton href={href} variant="secondary" size="sm" aria-label={`Revisar menciones ${focus === 'negative' ? 'negativas' : 'positivas'} sobre ${candidate.name}`}>
              Revisar conversación <ArrowUpRight aria-hidden className="size-4" />
            </LinkButton>
          </div>
        </div>
        <div className="rounded-lg border bg-muted/30 px-4 py-3">
          <p className="text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Tono de la conversación</p>
          <ToneMeter sentiment={summary.sentiment} id={candidate.mainId} />
        </div>
      </CardContent>
    </ShadcnCard>
  );
}
