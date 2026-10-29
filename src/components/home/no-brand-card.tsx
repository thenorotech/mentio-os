import { ArrowRight, Sparkles } from 'lucide-react';
import { LinkButton } from '@/components/ui';
import { Card as ShadcnCard, CardContent } from '@/components/ui/card';

const steps = [
  { title: 'Agrega a tu candidato', description: 'El nombre y las cuentas que quieres escuchar.' },
  { title: 'Define a quién comparar', description: 'Los adversarios que miden tu participación de voz.' },
  { title: 'Elige los temas', description: 'Los asuntos de campaña que quieres seguir.' },
];

/** The empty home: what to set up first, in three steps, and the one way to start. */
export function NoBrandCard() {
  return (
    <ShadcnCard className="@container">
      <CardContent className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl:items-center @3xl:gap-10">
        <div className="max-w-xl">
          <span aria-hidden className="mb-4 flex size-10 items-center justify-center rounded-lg bg-brand-soft text-primary">
            <Sparkles className="size-5" />
          </span>
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">Empieza aquí</p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-balance">Configura tu campaña en 3 pasos</h2>
          <p className="mt-2 text-sm leading-relaxed text-pretty text-muted-foreground">
            Cuando termines, aquí verás cómo va la conversación sobre tu candidato.
          </p>
          <LinkButton href="/arranque" variant="primary" className="mt-5">
            Abrir asistente <ArrowRight aria-hidden className="size-4" />
          </LinkButton>
        </div>
        <ol className="grid gap-px overflow-hidden rounded-xl border bg-border">
          {steps.map((step, i) => (
            <li key={step.title} className="flex items-start gap-3 bg-card px-4 py-3">
              <span aria-hidden className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold text-muted-foreground tabular-nums">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{step.title}</span>
                <span className="block text-xs text-muted-foreground">{step.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </CardContent>
    </ShadcnCard>
  );
}
