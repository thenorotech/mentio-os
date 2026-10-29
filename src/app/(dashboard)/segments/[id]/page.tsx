import { Download } from 'lucide-react';
import { ActionForm, FormCard, SubmitButton } from '@/components/ui/client';
import { Card, Conditions, Field, Input, LinkButton, PageHeader, Stat, KpiStrip, buttonClass } from '@/components/ui';
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
    <div className="max-w-3xl space-y-6">
      <PageHeader
        back={{ href: '/segments', label: 'Segmentos' }}
        title={segment.name}
        description={segment.description || undefined}
        actions={
          <>
            <a href={`/people/export?segmentId=${segment.id}`} download className={buttonClass('ghost')}>
              <Download aria-hidden /> Exportar CSV
            </a>
            <LinkButton href={`/people?segmentId=${segment.id}`}>Ver {segment.count} autores</LinkButton>
          </>
        }
      />

      <KpiStrip label="Resumen del segmento">
        <Stat label={<span className="inline-flex items-center gap-1">Autores actuales <InfoTip term="autor" /></span>} value={segment.count} href={`/people?segmentId=${segment.id}`} />
        <Stat label={<span className="inline-flex items-center gap-1">Creado <InfoTip text="Fecha en que se guardó este segmento." /></span>} value={<span className="text-base">{date(segment.createdAt)}</span>} />
        <Stat label={<span className="inline-flex items-center gap-1">Actualizado <InfoTip text="Fecha del cambio más reciente en el nombre, la descripción o los filtros." /></span>} value={<span className="text-base">{date(segment.updatedAt)}</span>} />
      </KpiStrip>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Condiciones</span>
        <Conditions conditions={conditions} max={3} empty="Sin condiciones: toda la audiencia." />
        {filterSearch ? <LinkButton href={`/people?${filterSearch}`} size="sm" variant="ghost">Ajustar en Audiencia</LinkButton> : null}
      </div>

      <FormCard action={updateSegment} title="Editar segmento" description="El nombre, lo que representa y las condiciones que deben cumplir sus autores.">
        <input type="hidden" name="id" value={segment.id} />
        <div className="grid gap-4 @lg:grid-cols-[1fr_2fr]">
          <Field label="Nombre"><Input name="name" required maxLength={80} defaultValue={segment.name} /></Field>
          <Field label="Descripción (opcional)"><Input name="description" maxLength={500} defaultValue={segment.description} /></Field>
        </div>
        <FilterFields filter={segment.filter} members={members.data} />
      </FormCard>

      <Card title="Eliminar segmento" description="Quita el filtro guardado. No modifica a los autores incluidos." className="ring-destructive/30">
        <ActionForm action={deleteSegment}>
          <input type="hidden" name="id" value={segment.id} />
          <SubmitButton variant="danger" size="sm" confirm={`¿Eliminar el segmento "${segment.name}"? Los autores no se modifican.`}>Eliminar segmento</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
