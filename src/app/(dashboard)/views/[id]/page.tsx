import { notFound } from 'next/navigation';
import { Card, Conditions, Field, Input, LinkButton, PageHeader } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { ActionForm, FormCard, SubmitButton } from '@/components/ui/client';
import { describeFilter, fromViewFilter } from '@/app/(dashboard)/mentions/filters';
import { ViewFilterFields } from '@/app/(dashboard)/mentions/filter-fields';
import { loadFilterOptions } from '@/app/(dashboard)/mentions/options';
import { mentio, unwrap } from '@/lib/mentio';
import { deleteView, updateView } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Editar vista' };

export default async function ViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [result, options] = await Promise.all([mentio().getView({ path: { id } }), loadFilterOptions()]);
  if (result.response?.status === 404) notFound();
  const view = unwrap(result);
  const values = fromViewFilter(view.filter);
  const conditions = describeFilter(values, options.names);

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        back={{ href: '/views', label: 'Vistas' }}
        title={<span className="inline-flex items-center gap-1">{view.name} <InfoTip term="vista guardada" /></span>}
        description={view.description || undefined}
        actions={<LinkButton href={`/mentions?viewId=${encodeURIComponent(view.id)}`}>Abrir menciones</LinkButton>}
      />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Condiciones</span>
        <Conditions conditions={conditions} max={3} empty="Sin condiciones: todas las menciones." />
      </div>

      <FormCard action={updateView} title="Editar vista" description="Al guardar, se reemplazan todos los filtros por los de este formulario." submit="Guardar vista">
        <input type="hidden" name="id" value={view.id} />
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field label="Nombre">
            <Input name="name" required maxLength={80} defaultValue={view.name} />
          </Field>
          <Field label="Descripción (opcional)">
            <Input name="description" maxLength={500} defaultValue={view.description} />
          </Field>
        </div>
        <ViewFilterFields values={values} options={options} />
      </FormCard>

      <Card title="Eliminar vista" description="Las menciones se conservan; solo se elimina el filtro guardado." className="ring-destructive/30">
        <ActionForm action={deleteView}>
          <input type="hidden" name="id" value={view.id} />
          <SubmitButton variant="danger" size="sm" confirm={`¿Eliminar la vista "${view.name}"? Las menciones se conservan.`}>Eliminar vista</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
