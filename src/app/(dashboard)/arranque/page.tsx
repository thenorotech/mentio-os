import Link from 'next/link';
import { ArrowRight, Bell, ChartNoAxesColumnIncreasing, CircleCheck, Radio, ListChecks } from 'lucide-react';
import { LinkButton, PageHeader, SectionHeading, TONE_TEXT, cx } from '@/components/ui';
import { ActionForm } from '@/components/ui/client';
import { entity } from '@/entity.config';
import { startCampaignAction } from './actions';
import { SetupWizard } from './setup-wizard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Arranque' };

const NEXT_STEPS = [
  { title: 'Configura tu alerta de crisis', description: 'Recibe un aviso inmediato cuando aparezcan menciones negativas.', href: '/alerts/plantillas', icon: Bell },
  { title: 'Revisa tu semáforo', description: 'Mira el tono y el volumen de la conversación sobre la entidad.', href: '/', icon: ChartNoAxesColumnIncreasing },
  { title: 'Recolecta sus posts', description: 'Busca en redes y noticias las publicaciones que mencionan a la entidad.', href: '/redes', icon: Radio },
];

export default async function Arranque({ searchParams }: { searchParams: Promise<{ completado?: string }> }) {
  const { completado } = await searchParams;

  if (completado === '1') {
    return (
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title={(
            <span className="inline-flex items-center gap-2">
              <CircleCheck aria-hidden className={cx('size-6 shrink-0', TONE_TEXT.positive)} />
              Tu tablero está listo
            </span>
          )}
          description="Ágora ya escucha tus frases. La guía te lleva a los perfiles, eventos y alertas."
          actions={<LinkButton href="/guia" variant="primary">Continuar la guía <ArrowRight aria-hidden /></LinkButton>}
        />
        <section aria-labelledby="next-steps-heading" className="grid gap-3">
          <SectionHeading id="next-steps-heading" icon={ListChecks} title="Siguientes pasos" description="Tres cosas que conviene dejar listas hoy." />
          <ol className="grid gap-2">
            {NEXT_STEPS.map(({ title, description, href, icon: Icon }, index) => (
              <li key={href}>
                <Link
                  href={href}
                  className="group flex items-center gap-3.5 rounded-xl border bg-card px-4 py-3.5 shadow-xs transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-medium">{title}</span>
                      <span className="text-[11px] text-muted-foreground tabular-nums">Paso {index + 1} de {NEXT_STEPS.length}</span>
                    </span>
                    <span className="mt-0.5 block text-sm text-pretty text-muted-foreground">{description}</span>
                  </span>
                  <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:text-primary motion-safe:group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ol>
        </section>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl">
      <PageHeader title="Prepara tu tablero" description={`Ya cargamos los nombres y temas de ${entity.shortName}. Revísalos en tres pasos; puedes cambiarlos después.`} />
      <ActionForm action={startCampaignAction}>
        <SetupWizard />
      </ActionForm>
    </div>
  );
}
