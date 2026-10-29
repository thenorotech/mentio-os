import Link from 'next/link';
import { Eye, Plus } from 'lucide-react';
import { Conditions, EmptyState, Field, Input, LinkButton, Table, td, TableCell, TableRow, rowLink, DataView } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { ActionForm, DrawerButton, SubmitButton } from '@/components/ui/client';
import { describeFilter, fromViewFilter, parseFilters } from '@/app/(dashboard)/mentions/filters';
import { ViewFilterFields } from '@/app/(dashboard)/mentions/filter-fields';
import { loadFilterOptions, type FilterOptions } from '@/app/(dashboard)/mentions/options';
import { timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { createView } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Vistas' };

/** Create a saved view in a drawer. */
function NewView({ options, primary = true }: { options: FilterOptions; primary?: boolean }) {
  return (
    <DrawerButton create={primary} label="Nueva vista" icon={<Plus />} title="Nueva vista" description="Guarda filtros para seguir temas de conversación de campaña." variant={primary ? 'primary' : 'secondary'}>
      <ActionForm action={createView} className="grid gap-5">
        <Field label="Nombre">
          <Input name="name" required maxLength={80} placeholder="Críticas a la propuesta de seguridad" />
        </Field>
        <Field label="Descripción">
          <Input name="description" maxLength={500} placeholder="Qué conversación de campaña quieres seguir" />
        </Field>
        <ViewFilterFields values={parseFilters(() => [])} options={options} />
        <div data-slot="form-actions" className="flex justify-end">
          <SubmitButton>Crear vista</SubmitButton>
        </div>
      </ActionForm>
    </DrawerButton>
  );
}

/** Saved filters over the mentions feed. */
export default async function ViewsPage() {
  const [views, options] = await Promise.all([mentio().listViews().then(unwrap), loadFilterOptions()]);

  return (
    <DataView title="Vistas" notice="Filtros guardados para consultar menciones de candidatos y temas de campaña." actions={<NewView options={options} />}>

      {views.data.length === 0 ? (
        <EmptyState icon={Eye} title="Aún no hay vistas guardadas" example="Guarda “críticas a la propuesta de seguridad” para consultar esas menciones con facilidad." action={<NewView options={options} primary={false} />}>
          Filtra las <Link href="/mentions" className="text-primary hover:underline">menciones</Link> de campaña y guarda la búsqueda para volver a usarla.
        </EmptyState>
      ) : (
        <Table head={[
          <span className="inline-flex items-center gap-1">Vista guardada <InfoTip term="vista guardada" /></span>,
          <span className="inline-flex items-center gap-1">Condiciones <InfoTip text="Filtros que se aplican al abrir esta vista de menciones." /></span>,
          <span className="inline-flex items-center gap-1">Actualizada <InfoTip text="Última vez que se guardaron cambios en esta vista." /></span>,
          '',
        ]}>
          {views.data.map((view) => {
            const href = `/mentions?viewId=${encodeURIComponent(view.id)}`;
            return (
              <TableRow key={view.id}>
                <TableCell className={td}>
                  <Link href={href} data-row-link className={`font-medium hover:underline ${rowLink}`}>{view.name}</Link>
                  {view.description ? <p className="text-xs text-muted-foreground">{view.description}</p> : null}
                </TableCell>
                <TableCell className={td}>
                  <Conditions conditions={describeFilter(fromViewFilter(view.filter), options.names)} empty="Todas las menciones" />
                </TableCell>
                <TableCell className={`${td} text-xs whitespace-nowrap text-muted-foreground`}>{timeAgo(view.updatedAt)}</TableCell>
                <TableCell className={`${td} text-right whitespace-nowrap`}>
                  <LinkButton href={href} size="sm" variant="ghost">Abrir</LinkButton>
                  <LinkButton href={`/views/${encodeURIComponent(view.id)}`} size="sm" variant="ghost">Editar</LinkButton>
                </TableCell>
              </TableRow>
            );
          })}
        </Table>
      )}
    </DataView>
  );
}
