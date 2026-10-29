import { ArrowUpRight, TriangleAlert } from 'lucide-react';
import { LinkButton, TONE_TEXT } from '@/components/ui';

export function CrisisBanner({ candidateName, negativeMentions, growth, href }: { candidateName: string; negativeMentions: number; growth: number | null; href: string }) {
  const change = growth === null ? 'subieron con fuerza' : `subieron ${Math.round(growth)}%`;

  return (
    <section role="alert" aria-label="Señal de posible crisis" className="@container min-w-0 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-3 dark:bg-destructive/10">
      <div className="flex min-w-0 flex-col gap-3 @lg:flex-row @lg:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-2.5">
        <span aria-hidden className={`flex size-7 shrink-0 items-center justify-center rounded-md bg-destructive/10 ${TONE_TEXT.negative}`}><TriangleAlert className="size-4" /></span>
        <p className="min-w-0 text-sm leading-6 text-pretty text-foreground">
          <strong className={`font-semibold ${TONE_TEXT.negative}`}>Posible crisis</strong>
          <span aria-hidden className="mx-1.5 text-muted-foreground">·</span>
          <strong className="font-semibold">{candidateName}</strong>: las menciones negativas {change} frente al periodo anterior{' '}
          <span className="text-muted-foreground tabular-nums">({new Intl.NumberFormat('es-MX').format(negativeMentions)} en este periodo)</span>.
        </p>
      </div>
      <LinkButton href={href} size="sm" variant="danger" className="shrink-0 self-start @lg:self-auto">
        Ver qué pasó <ArrowUpRight aria-hidden className="size-3.5" />
      </LinkButton>
      </div>
    </section>
  );
}
