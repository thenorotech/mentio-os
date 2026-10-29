import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Field, Input, PageHeader, Textarea } from '@/components/ui';
import { FormCard } from '@/components/ui/client';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { mentio, unwrap } from '@/lib/mentio';
import { updateContextAction, updateProfileAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Perfil de la organización' };

/** Organization profile used to evaluate the political conversation around candidates. */
export default async function Company() {
  const company = unwrap(await mentio().getCompany());

  return (
    <div className="max-w-3xl">
      <PageHeader title="Perfil de la organización" description="Contexto de tu organización para analizar la conversación sobre tus candidatos. Cuanto más preciso, menos ruido." />

      <div className="grid gap-4">
        <FormCard action={updateProfileAction} title="Organización" description="Quiénes son y dónde publican." hint="Estas cuentas permiten identificar las publicaciones propias de la organización.">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Nombre">
              <Input name="name" required maxLength={120} defaultValue={company.name} />
            </Field>
            <Field label="Sitio web">
              <Input name="website" inputMode="url" maxLength={300} defaultValue={company.website ?? ''} placeholder="https://campana.mx" />
            </Field>
            <Field label="Cuenta de X">
              <Input name="x" maxLength={60} defaultValue={company.accounts.x ?? ''} placeholder="campana_mx" />
            </Field>
            <Field label="Página de LinkedIn">
              <Input name="linkedin" maxLength={200} defaultValue={company.accounts.linkedin ?? ''} placeholder="equipo-campana" />
            </Field>
          </div>
        </FormCard>

        <FormCard action={updateProfileAction} title="Qué hace la organización" description="Resume su trabajo en un párrafo. Esto ayuda a evaluar la relevancia de las menciones." hint="Se aplica a las menciones nuevas.">
          <Field label="A qué se dedica" hint="Hasta 1000 caracteres.">
            <Textarea name="description" rows={4} maxLength={1000} defaultValue={company.description} placeholder="Somos el equipo de campaña de…" />
          </Field>
        </FormCard>

        <FormCard action={updateProfileAction} title="Relevancia" description="Qué temas importan a la campaña y qué adversarios comparar." hint="Se aplica a las menciones nuevas.">
          <Field label="Criterios de relevancia" hint="Qué cuenta como conversación relevante y qué es ruido.">
            <Textarea name="guidelines" rows={3} maxLength={2000} defaultValue={company.guidelines ?? ''} placeholder="Cuenta la conversación sobre propuestas y gestión. Excluye anuncios de empleo." />
          </Field>
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Temas prioritarios" hint="Uno por línea.">
              <Textarea name="useCases" rows={4} defaultValue={company.useCases.join('\n')} placeholder={'Seguridad pública\nTransporte y movilidad'} />
            </Field>
            <Field label="Adversarios" hint="Uno por línea: nombres, apodos o nombres de campaña.">
              <Textarea name="competitors" rows={4} defaultValue={company.competitors.join('\n')} placeholder={'Nombre del adversario\nApodo o nombre de campaña'} />
            </Field>
          </div>
        </FormCard>

        <Collapsible>
          <CollapsibleTrigger className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none [&[data-panel-open]>svg]:rotate-90">
            <ChevronRight aria-hidden className="size-4 transition-transform duration-150 motion-reduce:transition-none" />
            Avanzado: texto que usa el clasificador
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-3">
            <FormCard action={updateContextAction} title="Contexto del clasificador" description="Se compone con los campos anteriores. Puedes editarlo; al guardar cualquier campo de arriba, se vuelve a componer." submit="Guardar contexto">
              <Textarea name="context" rows={10} maxLength={4000} defaultValue={company.context} className="font-mono text-xs" aria-label="Contexto del clasificador" />
            </FormCard>
          </CollapsibleContent>
        </Collapsible>

        <p className="text-xs text-muted-foreground">
          Los términos monitoreados en una <Link href="/settings/groups" className="rounded-sm text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">campaña</Link> con descripción propia se evalúan con ese contexto.
        </p>
      </div>
    </div>
  );
}
