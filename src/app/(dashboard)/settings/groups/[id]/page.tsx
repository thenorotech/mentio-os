import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Badge, Card, Field, Input, LinkButton, PageHeader, Stat, Textarea, KpiStrip } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
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
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/settings/groups', label: 'Campañas' }}
        title={
          <span className="flex items-center gap-2">
            {group.name}
            {group.isDefault ? <Badge tone="accent">Predeterminada</Badge> : null}
          </span>
        }
        description={`Creada ${date(group.createdAt)}. Último cambio ${date(group.updatedAt)}.`}
        actions={<LinkButton href={keywordsHref}>Ver candidatos y temas</LinkButton>}
      />

      <KpiStrip className="@lg:max-w-md">
        <Stat label="Candidatos y temas" value={n} href={keywordsHref} />
        <Stat label="Activos" value={group.stats.active} hint="sin pausa" />
      </KpiStrip>

      <Card title="Ajustes">
        <ActionForm action={updateGroupAction} className="space-y-4">
          <input type="hidden" name="id" value={group.id} />
          {group.isDefault ? <input type="hidden" name="isDefault" value="true" /> : null}
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Nombre" hint="Debe ser único en este espacio de trabajo.">
              <Input name="name" required maxLength={80} defaultValue={group.name} />
            </Field>
            <Field label="Identificador externo" hint="Tu propio identificador para esta campaña. Déjalo vacío para quitarlo.">
              <Input name="externalId" maxLength={128} defaultValue={group.externalId ?? ''} />
            </Field>
          </div>
          {group.isDefault ? (
            <p className="text-sm text-muted-foreground">
              La campaña predeterminada corresponde a todo el espacio de trabajo: sus términos se evalúan con el <Link href="/settings/company" className="text-primary hover:underline">perfil de la organización</Link>.
            </p>
          ) : (
            <Field
              label="Descripción de campaña"
              hint="El clasificador la usa para evaluar los términos de esta campaña en lugar del perfil completo de la organización. Se aplica a las menciones nuevas; las anteriores no se vuelven a evaluar. Si la dejas vacía, se usa el perfil de la organización."
            >
              <Textarea name="context" rows={6} maxLength={4000} defaultValue={group.context ?? ''} />
            </Field>
          )}
          <SubmitButton>Guardar cambios</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Eliminar campaña">
        {group.isDefault ? (
          <p className="text-sm text-muted-foreground">No puedes eliminar la campaña predeterminada. Los términos creados sin una campaña se agregan aquí. En su lugar, mueve o elimina esos términos.</p>
        ) : (
          <ActionForm action={deleteGroupAction} className="space-y-3">
            <input type="hidden" name="id" value={group.id} />
            <p className="text-sm text-muted-foreground">
              Se eliminará la campaña y {n === 1 ? 'su término monitoreado' : `sus ${n} términos monitoreados`}, junto con sus menciones.
            </p>
            <SubmitButton variant="danger" confirm={`¿Eliminar "${group.name}" y sus ${n} ${n === 1 ? 'término monitoreado' : 'términos monitoreados'}? También se eliminarán sus menciones. Esta acción no se puede deshacer.`}>
              Eliminar campaña y términos
            </SubmitButton>
          </ActionForm>
        )}
      </Card>
    </div>
  );
}
