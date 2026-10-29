import { ActionForm, SubmitButton } from '@/components/ui/client';
import { Badge, Card, Conditions, Field, Input, LinkButton, PageHeader, Stat, KpiStrip } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { date } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { FilterFields } from '../../people/filter-fields';
import { describeFilter, filterToSearch } from '../../people/filters';
import { deleteSegment, updateSegment } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Segmento' };

/** Edit one segment: its name, what it means, and the conditions. */
export default async function SegmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = mentio();
  const [segment, members] = await Promise.all([api.getSegment({ path: { id } }).then(unwrap), api.listMembers().then(unwrap)]);
  const conditions = describeFilter(segment.filter, new Map(members.data.map((m) => [m.userId, m.name ?? m.email])));
  const filterSearch = filterToSearch(segment.filter);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/segments', label: 'Segmentos' }}
        title={segment.name}
        description={segment.description || undefined}
        actions={
          <>
            <LinkButton href={`/people?segmentId=${segment.id}`} variant="primary">Ver {segment.count} autores</LinkButton>
            <a href={`/people/export?segmentId=${segment.id}`} download className="text-sm text-primary hover:underline">Exportar CSV</a>
          </>
        }
      />

      <KpiStrip>
        <Stat label={<span className="inline-flex items-center gap-1">Autores actuales <InfoTip term="autor" /></span>} value={segment.count} href={`/people?segmentId=${segment.id}`} />
        <Stat label={<span className="inline-flex items-center gap-1">Creado <InfoTip text="Fecha en que se guardó este segmento." /></span>} value={<span className="text-base">{date(segment.createdAt)}</span>} />
        <Stat label={<span className="inline-flex items-center gap-1">Actualizado <InfoTip text="Fecha del cambio más reciente en el nombre, la descripción o los filtros." /></span>} value={<span className="text-base">{date(segment.updatedAt)}</span>} />
      </KpiStrip>

      <div className="flex flex-wrap items-center gap-1.5">
        <Conditions conditions={conditions} max={3} empty="Sin condiciones: toda la audiencia." />
        {filterSearch ? <LinkButton href={`/people?${filterSearch}`} size="sm" variant="ghost">Ajustar en Audiencia</LinkButton> : null}
      </div>

      <Card title="Editar segmento">
        <ActionForm action={updateSegment} className="space-y-5">
          <input type="hidden" name="id" value={segment.id} />
          <div className="grid gap-3 @lg:grid-cols-[1fr_2fr]">
            <Field label="Nombre"><Input name="name" required maxLength={80} defaultValue={segment.name} /></Field>
            <Field label="Descripción"><Input name="description" maxLength={500} defaultValue={segment.description} /></Field>
          </div>
          <FilterFields filter={segment.filter} members={members.data} />
          <SubmitButton>Guardar</SubmitButton>
        </ActionForm>
      </Card>

      <Card title="Eliminar segmento" description="Quita el filtro guardado. No modifica a los autores incluidos.">
        <ActionForm action={deleteSegment}>
          <input type="hidden" name="id" value={segment.id} />
          <SubmitButton variant="danger" confirm={`¿Eliminar el segmento "${segment.name}"?`}>Eliminar segmento</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
