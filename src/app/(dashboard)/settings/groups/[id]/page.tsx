import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, Field, Input, LinkButton, PageHeader, Stat, Textarea, KpiStrip } from '@/components/ui';
import { ActionForm, FormCard, SubmitButton } from '@/components/ui/client';
import { date } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { deleteGroupAction, updateGroupAction } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Campaña' };

export default async function GroupDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await mentio().getGroup({ path: { id } });
  if (result.response?.status === 404) notFound();
  const group = unwrap(result);
  const keywordsHref = `/keywords?groupId=${encodeURIComponent(group.id)}`;
  const n = group.stats.keywords;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        back={{ href: '/settings/groups', label: 'Campañas' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {group.name}
            {group.isDefault ? <Badge tone="accent">Predeterminada</Badge> : null}
          </span>
        }
        description={`Creada ${date(group.createdAt)}. Último cambio ${date(group.updatedAt)}.`}
        actions={<LinkButton href={keywordsHref}>Ver candidatos y temas</LinkButton>}
      />

      <KpiStrip label="Términos de la campaña" className="@lg:max-w-md">
        <Stat label="Candidatos y temas" value={n} href={keywordsHref} />
        <Stat label="Activos" value={group.stats.active} hint="Sin pausa" />
      </KpiStrip>

      <FormCard
        action={updateGroupAction}
        title="Ajustes"
        description="Nombre, identificador y contexto con el que se evalúan sus términos."
        hint={group.isDefault ? undefined : 'La descripción se aplica a las menciones nuevas.'}
        submit="Guardar cambios"
      >
        <input type="hidden" name="id" value={group.id} />
        {group.isDefault ? <input type="hidden" name="isDefault" value="true" /> : null}
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field label="Nombre" hint="Debe ser único en este espacio de trabajo.">
            <Input name="name" required maxLength={80} defaultValue={group.name} />
          </Field>
          <Field label="Identificador externo (opcional)" hint="Tu propio identificador para esta campaña. Déjalo vacío para quitarlo.">
            <Input name="externalId" maxLength={128} defaultValue={group.externalId ?? ''} className="font-mono text-xs" />
          </Field>
        </div>
        {group.isDefault ? (
          <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-pretty text-muted-foreground">
            La campaña predeterminada corresponde a todo el espacio de trabajo: sus términos se evalúan con el{' '}
            <Link href="/settings/company" className="rounded-sm text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">perfil de la organización</Link>.
          </p>
        ) : (
          <Field
            label="Descripción de campaña (opcional)"
            hint="El clasificador la usa para evaluar los términos de esta campaña en lugar del perfil completo de la organización. Las menciones anteriores no se vuelven a evaluar. Si la dejas vacía, se usa el perfil de la organización."
          >
            <Textarea name="context" rows={6} maxLength={4000} defaultValue={group.context ?? ''} />
          </Field>
        )}
      </FormCard>

      <Card
        title="Eliminar campaña"
        description={group.isDefault ? undefined : `Se eliminará la campaña y ${n === 1 ? 'su término monitoreado' : `sus ${n} términos monitoreados`}, junto con sus menciones.`}
        className={group.isDefault ? undefined : 'ring-destructive/30'}
      >
        {group.isDefault ? (
          <p className="text-sm text-pretty text-muted-foreground">No puedes eliminar la campaña predeterminada: los términos creados sin una campaña se agregan aquí. En su lugar, mueve o elimina esos términos.</p>
        ) : (
          <ActionForm action={deleteGroupAction}>
            <input type="hidden" name="id" value={group.id} />
            <SubmitButton variant="danger" size="sm" confirm={`¿Eliminar "${group.name}" y sus ${n} ${n === 1 ? 'término monitoreado' : 'términos monitoreados'}? También se eliminarán sus menciones. Esta acción no se puede deshacer.`}>
              Eliminar campaña y términos
            </SubmitButton>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
