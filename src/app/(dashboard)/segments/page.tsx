import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Layers } from 'lucide-react';
import { ActionForm, SubmitButton, DrawerButton } from '@/components/ui/client';
import { Badge, Card, Conditions, EmptyState, Field, Input, LinkButton, Table, td, TableCell, TableRow, rowLink, DataView } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { FilterFields } from '../people/filter-fields';
import { describeFilter, filterToSearch } from '../people/filters';
import { createSegment, deleteSegment, savePreset } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Segmentos' };

/** Saved audience filters. Members are worked out on every read, never stored. */
export default async function Segments() {
  const api = mentio();
  const [segments, members] = await Promise.all([api.listSegments().then(unwrap), api.listMembers().then(unwrap)]);
  const memberNames = new Map(members.data.map((m) => [m.userId, m.name ?? m.email]));

  return (
    <DataView
        title="Segmentos"
        notice="Autores agrupados por tema, conversación o interacción. Se actualizan cuando llegan nuevas menciones."
        actions={
          <>
            <DrawerButton create variant="primary" label="Nuevo segmento" icon={<Plus />} title="Nuevo segmento" description="Guarda filtros para analizar grupos de audiencia de campaña. Se actualizan al llegar nuevas menciones.">
              <ActionForm action={createSegment} className="grid gap-4">
                <Field label="Nombre"><Input name="name" required maxLength={80} placeholder="Autores que mencionan la movilidad" /></Field>
                <Field label="Descripción"><Input name="description" maxLength={500} /></Field>
                <FilterFields filter={{}} members={members.data} />
                <div data-slot="form-actions" className="flex justify-end"><SubmitButton>Crear segmento</SubmitButton></div>
              </ActionForm>
            </DrawerButton>
          </>
        }
    >

      {segments.data.length === 0 ? (
        <EmptyState icon={Layers} title="Aún no hay segmentos." example="Crea “Autores que mencionan movilidad” para reunir y revisar a quienes publican sobre ese tema." action={<LinkButton href="/people" variant="primary">Explorar audiencia</LinkButton>}>Guarda una plantilla, crea un segmento o filtra la audiencia para seguir a un grupo de autores.</EmptyState>
      ) : (
        <Table head={[
          <span className="inline-flex items-center gap-1">Segmento <InfoTip term="segmento" /></span>,
          <span className="inline-flex items-center gap-1">Condiciones <InfoTip text="Filtros que deciden qué autores pertenecen al segmento." /></span>,
          <span className="inline-flex items-center gap-1">Autores <InfoTip term="autor" /></span>,
          <span className="inline-flex items-center gap-1">Actualizado <InfoTip text="Última vez que se guardaron cambios en este segmento." /></span>,
          '',
        ]}>
          {segments.data.map((segment) => {
            const conditions = describeFilter(segment.filter, memberNames);
            return (
              <TableRow key={segment.id}>
                <TableCell className={td}>
                  <Link href={`/segments/${segment.id}`} data-row-link className={`font-medium hover:underline ${rowLink}`}>{segment.name}</Link>
                  {segment.description ? <p className="text-xs text-muted-foreground">{segment.description}</p> : null}
                </TableCell>
                <TableCell className={td}>
                  <Conditions conditions={conditions} empty="Toda la audiencia" />
                </TableCell>
                <TableCell className={`${td} tabular-nums`}>
                  <Link href={`/people?segmentId=${segment.id}`} className="text-primary hover:underline">{segment.count}</Link>
                </TableCell>
                <TableCell className={`${td} text-xs whitespace-nowrap text-muted-foreground`}>{timeAgo(segment.updatedAt)}</TableCell>
                <TableCell className={td}>
                  <div className="flex justify-end gap-1.5">
                    <LinkButton href={`/people?segmentId=${segment.id}`} size="sm">Ver audiencia</LinkButton>
                    <LinkButton href={`/segments/${segment.id}`} size="sm">Editar</LinkButton>
                    <ActionForm action={deleteSegment}>
                      <input type="hidden" name="id" value={segment.id} />
                      <SubmitButton variant="danger" size="sm" confirm={`¿Eliminar el segmento "${segment.name}"? Los autores se conservarán.`}>Eliminar</SubmitButton>
                    </ActionForm>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </Table>
      )}

      {segments.presets.length ? (
        <div className="border-t p-(--page-gutter)">
        <Card title="Plantillas" description="Puntos de partida para crear segmentos. Guarda una y edítala como cualquier otro segmento.">
          <ul className="grid gap-3 @lg:grid-cols-2">
            {segments.presets.map((preset) => (
              <li key={preset.key} className="flex flex-col justify-between gap-2 rounded-lg border p-3 transition-colors hover:bg-muted/40">
                <div>
                  <p className="text-sm font-medium">{preset.name}</p>
                  <p className="text-xs text-muted-foreground">{preset.description}</p>
                  <div className="mt-2">
                    <Conditions conditions={describeFilter(preset.filter, memberNames)} empty="Toda la audiencia" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <ActionForm action={savePreset}>
                    <input type="hidden" name="key" value={preset.key} />
                    <SubmitButton size="sm">Guardar</SubmitButton>
                  </ActionForm>
                  <Link href={`/people?${filterToSearch(preset.filter)}`} className="text-xs text-primary hover:underline">Vista previa de audiencia</Link>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        </div>
      ) : null}
    </DataView>
  );
}
