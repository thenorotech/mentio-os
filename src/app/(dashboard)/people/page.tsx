import Link from 'next/link';
import { Download, Users, UsersRound } from 'lucide-react';
import { ActionForm, DrawerButton, SubmitButton } from '@/components/ui/client';
import { Badge, DataView, EmptyState, Field, Input, LinkButton, OffsetPager, Table, buttonClass, td, TableCell, TableRow, rowLink } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { UrlFilters } from '@/components/url-filters';
import { compact, platformName, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { one, withParams, type SearchParams } from '@/lib/params';
import { saveAsSegment } from './actions';
import { Avatar, SentimentBar, displayName } from './bits';
import { peopleFilterDefs } from './filter-defs';
import { SORT_LABELS, SORTS, audienceFilter, describeFilter, peopleQuery, stageName } from './filters';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Audiencia' };

const LIMIT = 50;

/** The audience: everyone who mentioned you, filtered in the URL. */
export default async function People({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const offset = Math.max(0, Number(one(params, 'offset')) || 0);
  const filter = audienceFilter(params);
  const query = peopleQuery(params, { limit: LIMIT, offset });
  const api = mentio();
  const [page, segments, members] = await Promise.all([
    api.listPeople({ query }).then(unwrap),
    api.listSegments().then(unwrap),
    api.listMembers().then(unwrap),
  ]);
  const memberNames = new Map(members.data.map((m) => [m.userId, m.name ?? m.email]));
  const segment = query.segmentId ? segments.data.find((s) => s.id === query.segmentId) : undefined;
  const conditions = describeFilter(filter, memberNames);
  const filterQuery = new URLSearchParams(
    Object.entries(params).flatMap(([key, value]) => (key === 'offset' || value === undefined ? [] : (Array.isArray(value) ? value : [value]).map((v) => [key, v]))),
  ).toString();

  return (
    <DataView
        title="Personas"
        notice={
          segment ? (
            <>
              <span>
                Segmento <span className="font-medium text-foreground">{segment.name}</span>
                {segment.description ? <>: {segment.description}</> : null}
              </span>
              <Link href={`/segments/${segment.id}`} className="font-medium text-primary hover:underline">Editar segmento</Link>
            </>
          ) : (
            <span>Autores que mencionaron a tus candidatos o temas, con sus cuentas agrupadas para comparar alcance y conversación.</span>
          )
        }
        actions={
          <>
            <a href={`/people/export${filterQuery ? `?${filterQuery}` : ''}`} className={buttonClass('secondary')} download>
              <Download /> Exportar CSV
            </a>
          </>
        }
        toolbar={<UrlFilters
        className="grid gap-2"
        search={{ placeholder: 'Nombre, usuario o enlace al perfil' }}
        sort={{ options: SORTS.map((value) => ({ value, label: SORT_LABELS[value] })) }}
        filters={peopleFilterDefs(members.data, segments.data)}
        actions={
          conditions.length && !query.segmentId ? (
            <DrawerButton label="Guardar como segmento" icon={<UsersRound />} title="Guardar como segmento" description="Guarda estos filtros con un nombre para consultar grupos de audiencia de campaña. La búsqueda y la fecha de primera actividad no se guardan.">
              <ActionForm action={saveAsSegment} className="grid gap-4">
                <input type="hidden" name="query" value={filterQuery} />
                <Field label="Nombre"><Input name="name" required maxLength={80} placeholder="Autores que mencionan la seguridad" /></Field>
                <Field label="Descripción"><Input name="description" maxLength={500} /></Field>
                <div data-slot="form-actions" className="flex justify-end"><SubmitButton>Guardar segmento</SubmitButton></div>
              </ActionForm>
            </DrawerButton>
          ) : null
        }
      />}
    >

      {page.data.length === 0 ? (
        <EmptyState icon={Users} title="Ningún autor coincide con estos filtros." example="Una periodista que publique varias veces sobre “seguridad” aparecerá aquí como autora de la conversación." action={<div className="flex flex-wrap justify-center gap-2"><LinkButton href="/people">Quitar filtros</LinkButton><LinkButton href="/keywords/new" variant="primary">Agregar términos a la campaña</LinkButton></div>}>Cuando aparezcan menciones nuevas, sus autores se agruparán aquí para que puedas revisar su actividad.</EmptyState>
      ) : (
        <Table head={[
          <span className="inline-flex items-center gap-1">Autor <InfoTip term="autor" /></span>,
          <span className="inline-flex items-center gap-1">Seguidores <InfoTip term="alcance" /></span>,
          <span className="inline-flex items-center gap-1">Menciones <InfoTip term="menciones" /></span>,
          <span className="inline-flex items-center gap-1">Sentimiento <InfoTip term="sentimiento o tono" /></span>,
          <span className="inline-flex items-center gap-1">Etapa <InfoTip text="Punto del seguimiento del equipo, por ejemplo nuevo, contactado o aliado." /></span>,
          <span className="inline-flex items-center gap-1">Etiquetas <InfoTip text="Notas breves que el equipo asigna para organizar a los autores." /></span>,
          <span className="inline-flex items-center gap-1">Última actividad <InfoTip text="Fecha de la publicación más reciente de esta persona." /></span>,
        ]}>
          {page.data.map((person) => (
            <TableRow key={person.id} className={person.annotations.muted ? 'text-muted-foreground' : ''}>
              <TableCell className={td}>
                <Link href={`/people/${person.id}`} data-row-link className={`flex min-w-48 items-center gap-2.5 hover:underline ${rowLink}`}>
                  <Avatar person={person} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{displayName(person)}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {[person.handle, ...new Set(person.accounts.map((a) => platformName(a.platform)))].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </Link>
              </TableCell>
              <TableCell className={`${td} tabular-nums`}>{person.reach.followers === null ? <span className="text-muted-foreground">?</span> : compact(person.reach.followers)}</TableCell>
              <TableCell className={`${td} tabular-nums whitespace-nowrap`}>
                {person.stats.mentions}
                <span className="ml-1 text-xs text-muted-foreground">{person.stats.relevant} relevantes</span>
              </TableCell>
              <TableCell className={td}><SentimentBar sentiment={person.stats.sentiment} /></TableCell>
              <TableCell className={`${td} whitespace-nowrap`}>
                <span className="text-xs">{stageName(person.outreach.stage)}</span>
                {person.outreach.owner ? <span className="block text-xs text-muted-foreground">{person.outreach.owner.name ?? person.outreach.owner.email}</span> : null}
              </TableCell>
              <TableCell className={td}>
                <div className="flex flex-wrap gap-1">
                  {person.annotations.muted ? <Badge tone="warn">silenciado</Badge> : null}
                  {person.annotations.tags.map((t, tIndex) => <Badge key={`${t}-${tIndex}`}>{t}</Badge>)}
                </div>
              </TableCell>
              <TableCell className={`${td} text-xs whitespace-nowrap text-muted-foreground`}>{timeAgo(person.stats.lastSeenAt)}</TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      <OffsetPager total={page.total} limit={LIMIT} offset={offset} href={(o) => withParams('/people', params, { offset: o ? String(o) : undefined })} />
    </DataView>
  );
}

