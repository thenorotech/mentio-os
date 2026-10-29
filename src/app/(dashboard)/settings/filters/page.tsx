import type { ReactNode } from 'react';
import { Field, PageHeader, Textarea } from '@/components/ui';
import { FormCard } from '@/components/ui/client';
import { InfoTip } from '@/components/info-tip';
import { date } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { updateFiltersAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Filtros de ruido' };

/** One platform's rules inside the card: a legend and its fields, a hairline between groups. */
function Group({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-3 border-t pt-4 first:border-t-0 first:pt-0">
      <legend className="text-sm font-medium">{title}</legend>
      {description ? <p className="-mt-2 text-xs text-muted-foreground">{description}</p> : null}
      {children}
    </fieldset>
  );
}

/** Organization-wide noise rules in addition to each candidate or topic's rules. */
export default async function Filters() {
  const filters = unwrap(await mentio().getFilters());

  return (
    <div className="max-w-3xl">
      <PageHeader
        title={<span className="inline-flex items-center gap-1">Filtros de ruido <InfoTip term="filtros de ruido" /></span>}
        description="Reglas para todos los candidatos y temas del espacio de trabajo, además de sus reglas individuales. Ejemplo de campaña: excluir “vacante” para no confundir ofertas de empleo con menciones a una candidata."
      />

      <FormCard
        action={updateFiltersAction}
        title="Reglas de exclusión"
        description="Escribe un elemento por línea o sepáralos con comas. Al guardar se reemplazan todas las listas."
        hint={filters.updatedAt ? `Último cambio: ${date(filters.updatedAt)}` : 'Se aplican desde la próxima consulta.'}
        submit="Guardar filtros"
      >
        <Group title="Todas las plataformas">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Términos excluidos" hint="Se descarta cualquier publicación que incluya uno de estos términos, sin importar qué término monitoreado coincidió. Usa * al inicio o al final como comodín. Hasta 200.">
              <Textarea name="excludedTerms" rows={6} defaultValue={filters.excludedTerms.join('\n')} placeholder={'empleo\nvacante\ntrabajo'} />
            </Field>
            <Field label={<span className="inline-flex items-center gap-1">Autores excluidos <InfoTip term="autor" /></span>} hint="Cuentas propias, integrantes del equipo o cuentas falsas conocidas: enlaces a perfiles o publicaciones, @usuarios, nombres de cuenta, DID de Bluesky o nombres visibles. Hasta 200.">
              <Textarea name="excludedAuthors" rows={6} defaultValue={filters.excludedAuthors.join('\n')} placeholder={'@cuenta_campana\n@cuenta_falsa'} />
            </Field>
          </div>
        </Group>

        <Group title="GitHub">
          <Field label="Repositorios excluidos" hint="Se descartan las incidencias, solicitudes de cambios y comentarios de estos repositorios. Usa propietario/nombre o un enlace de github.com.">
            <Textarea name="excludedRepos" rows={4} defaultValue={filters.excludedRepos.join('\n')} placeholder="campana/sitio-web" />
          </Field>
        </Group>

        <Group title="Reddit" description="Si agregas foros a «Solo estos foros», se ignora la lista de exclusión.">
          <div className="grid gap-4 @lg:grid-cols-2">
            <Field label="Solo estos foros de Reddit" hint="Solo se aceptan publicaciones de estos foros. Usa r/nombre o nombre.">
              <Textarea name="subredditsOnly" rows={4} defaultValue={filters.subreddits.only.join('\n')} placeholder="r/mexico" />
            </Field>
            <Field label="Foros de Reddit excluidos" hint="Se descartan las publicaciones de estos foros. Usa r/nombre o nombre.">
              <Textarea name="subredditsExcluded" rows={4} defaultValue={filters.subreddits.excluded.join('\n')} placeholder="r/politica" />
            </Field>
          </div>
        </Group>
      </FormCard>
    </div>
  );
}
