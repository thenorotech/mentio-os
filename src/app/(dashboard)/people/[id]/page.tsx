import Link from 'next/link';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { Badge, Card, DateTimePicker, EmptyState, Field, Input, LinkButton, PageHeader, Select, Stat, Textarea, buttonClass, sentimentTone, SwitchRow, KpiStrip } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { Button } from '@/components/ui/button';
import { compact, date, platformName, tagName, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { one, type SearchParams } from '@/lib/params';
import { Avatar, SentimentBar, displayName } from '../bits';
import { STAGE_OPTIONS, stageName } from '../filters';
import { deleteActivity, logActivity, mergePeople, splitAccount, updatePerson } from './actions';
import { ACTIVITY_CHANNELS, CHANNEL_NAMES } from './channels';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Autor' };

const excerpt = (text: string, max = 220) => (text.length > max ? `${text.slice(0, max).trimEnd()}…` : text);

/** One person: who they are, what they said, and where you stand with them. */
export default async function PersonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) {
  const { id } = await params;
  const search = await searchParams;
  const mergeQ = one(search, 'merge');
  const api = mentio();
  const [person, activities, mentions, members, candidates] = await Promise.all([
    api.getPerson({ path: { id } }).then(unwrap),
    api.listPersonActivities({ path: { id } }).then(unwrap),
    api.searchMentions({ query: { personId: id, limit: 20 } }).then(unwrap),
    api.listMembers().then(unwrap),
    mergeQ ? api.listPeople({ query: { q: mergeQ, limit: 10 } }).then(unwrap) : Promise.resolve(null),
  ]);
  const { stats, reach, profile, annotations, outreach } = person;
  const others = candidates?.data.filter((p) => p.id !== person.id) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/people', label: 'Audiencia' }}
        title={
          <span className="flex items-center gap-3">
            <Avatar person={person} size="size-10" />
            <span className="min-w-0">
              <span className="flex items-center gap-1 truncate">{displayName(person)} <InfoTip term="autor" /></span>
              <span className="block text-sm font-normal text-muted-foreground">
                {[person.handle, platformName(person.platform)].filter(Boolean).join(' · ')}
              </span>
            </span>
          </span>
        }
        actions={
          <>
            {annotations.muted ? <Badge tone="warn">Silenciado</Badge> : null}
            <Badge tone="accent">{stageName(outreach.stage)}</Badge>
            {person.url ? <a href={person.url} target="_blank" rel="noreferrer" className={buttonClass('secondary')}>Ver perfil ↗</a> : null}
          </>
        }
      />

      <KpiStrip>
        <Stat label={<span className="inline-flex items-center gap-1">Seguidores <InfoTip term="alcance" /></span>} value={reach.followers === null ? '?' : compact(reach.followers)} hint={reach.posts !== null ? `${compact(reach.posts)} publicaciones` : undefined} />
        <Stat label={<span className="inline-flex items-center gap-1">Menciones <InfoTip term="menciones" /></span>} value={stats.mentions} hint={`${stats.relevant} relevantes`} />
        <Stat label={<span className="inline-flex items-center gap-1">Primera actividad <InfoTip text="Fecha de la primera mención que se registró para este autor." /></span>} value={<span className="text-base">{timeAgo(stats.firstSeenAt)}</span>} hint={date(stats.firstSeenAt)} />
        <Stat label={<span className="inline-flex items-center gap-1">Última actividad <InfoTip text="Fecha de la mención más reciente que se registró para este autor." /></span>} value={<span className="text-base">{timeAgo(stats.lastSeenAt)}</span>} hint={date(stats.lastSeenAt)} />
        <Stat
          label={<span className="inline-flex items-center gap-1">Último contacto <InfoTip text="Fecha en que el equipo registró el contacto más reciente con este autor." /></span>}
          value={<span className="text-base">{outreach.lastContactedAt ? timeAgo(outreach.lastContactedAt) : 'Nunca'}</span>}
          hint={outreach.owner ? `Responsable: ${outreach.owner.name ?? outreach.owner.email}` : 'Sin responsable'}
        />
      </KpiStrip>

      <div className="grid gap-6 @4xl:grid-cols-[3fr_2fr]">
        <div className="min-w-0 space-y-6">
          <Card title="Perfil público" description={profile ? `Consultado ${timeAgo(profile.fetchedAt)}` : 'Aún no se ha consultado.'}>
            {profile ? (
              <dl className="grid gap-x-6 gap-y-3 text-sm @lg:grid-cols-2">
                {profile.bio ? <div className="@lg:col-span-2"><dt className="text-xs text-muted-foreground">Biografía</dt><dd className="whitespace-pre-line">{profile.bio}</dd></div> : null}
                <Fact label="Organización" value={profile.company} />
                <Fact label="Ubicación" value={profile.location} />
                <Fact label="Sitio web" value={profile.website} href={profile.website ? (profile.website.startsWith('http') ? profile.website : `https://${profile.website}`) : null} />
                <Fact label="Correo electrónico" value={profile.email} href={profile.email ? `mailto:${profile.email}` : null} />
                {profile.links.length ? (
                  <div className="@lg:col-span-2">
                    <dt className="text-xs text-muted-foreground">Cuentas vinculadas</dt>
                    <dd className="mt-1 flex flex-wrap gap-2">
                      {profile.links.map((l) => (
                        <a key={l.url} href={l.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{tagName(l.provider)}</a>
                      ))}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Los datos del perfil aparecen cuando se consulta al autor en su canal.</p>
            )}
            <div className="mt-4 border-t border-line pt-3">
              <p className="mb-1.5 inline-flex items-center gap-1 text-xs text-muted-foreground">Sentimiento de sus menciones <InfoTip term="sentimiento o tono" /></p>
              <SentimentBar sentiment={stats.sentiment} className="h-2 w-full" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                {stats.sentiment.positive} positivo · {stats.sentiment.neutral} neutral · {stats.sentiment.negative} negativo
              </p>
            </div>
          </Card>

          <Card title="Cuentas" description="Cuentas agrupadas bajo este autor. La primera es la principal.">
            <ul className="divide-y divide-line text-sm">
              {person.accounts.map((account, i) => (
                <li key={account.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span className="min-w-0">
                    <span className="font-medium">{account.name ?? account.handle ?? account.id}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{[account.handle, platformName(account.platform)].filter(Boolean).join(' · ')}</span>
                    {i === 0 ? <Badge className="ml-2">Principal</Badge> : null}
                  </span>
                  <span className="flex items-center gap-2">
                    {account.url ? <a href={account.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Abrir ↗</a> : null}
                    {i > 0 ? (
                      <ActionForm action={splitAccount}>
                        <input type="hidden" name="id" value={person.id} />
                        <input type="hidden" name="accountId" value={account.id} />
                        <SubmitButton variant="secondary" size="sm" confirm="¿Separar esta cuenta para que vuelva a ser un registro independiente?">Separar cuenta</SubmitButton>
                      </ActionForm>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Menciones recientes" actions={<Link href={`/mentions?personId=${person.id}`} className="text-xs text-primary hover:underline">Ver todas</Link>}>
            {mentions.data.length === 0 ? (
              <EmptyState compact title="Aún no hay menciones de esta persona" example="Cuando esta autora publique sobre “María López” o “seguridad”, la conversación aparecerá aquí." action={<LinkButton href="/keywords/new" variant="primary" size="sm">Agregar término a la campaña</LinkButton>}>Las menciones se muestran cuando coinciden con algún término monitoreado.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {mentions.data.map((m) => (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <Link href={`/mentions/${m.id}`} className="block rounded hover:bg-muted/50">
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <span>{platformName(m.post.platform)}</span>
                        <span>·</span>
                        <span>{m.keyword.term}</span>
                        <span>·</span>
                        <span>{timeAgo(m.post.publishedAt)}</span>
                        {m.classification ? <Badge tone={sentimentTone(m.classification.sentiment)}>{{ positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' }[m.classification.sentiment]}</Badge> : null}
                        {m.relevant ? <Badge tone="accent">Relevante</Badge> : null}
                        {m.review ? <Badge>{'★'.repeat(m.review.rating)}</Badge> : null}
                      </div>
                      <p className="mt-1 text-sm text-foreground">{excerpt(m.post.text) || <span className="text-muted-foreground">Sin texto</span>}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title="Notas del equipo">
            <ActionForm action={updatePerson} className="space-y-3">
              <input type="hidden" name="id" value={person.id} />
              <Field label="Etapa de contacto">
                <Select name="stage" defaultValue={outreach.stage} options={STAGE_OPTIONS} />
              </Field>
              <Field label="Responsable">
                <Select
                  name="ownerId"
                  defaultValue={outreach.owner?.id ?? ''}
                  placeholder="Sin responsable"
                  options={members.data.map((m) => [m.userId, m.name ?? m.email] as const)}
                />
              </Field>
              <Field label="Etiquetas" hint="Sepáralas con comas; máximo 20.">
                <Input name="tags" defaultValue={annotations.tags.join(', ')} />
              </Field>
              <Field label="Notas">
                <Textarea name="notes" maxLength={2000} defaultValue={annotations.notes} />
              </Field>
              <SwitchRow name="muted" defaultChecked={annotations.muted} label="Silenciar autor" hint="Oculta sus publicaciones del listado en todos los canales." />
              <SubmitButton>Guardar</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Bitácora de contacto" description="El primer contacto asigna el registro a quien lo realiza y cambia su etapa a contactado.">
            <ActionForm action={logActivity} className="space-y-3" resetOnSuccess>
              <input type="hidden" name="id" value={person.id} />
              <div className="grid gap-3 @lg:grid-cols-2">
                <Field label="Canal">
                  <Select name="channel" defaultValue="email" options={ACTIVITY_CHANNELS.map((c) => [c, CHANNEL_NAMES[c]] as const)} />
                </Field>
                <Field label="Fecha y hora (UTC)" hint="Si queda vacío, se usa la hora actual.">
                  <DateTimePicker name="occurredAt" placeholder="Ahora" />
                </Field>
              </div>
              <Field label="Nota">
                <Textarea name="note" rows={2} maxLength={2000} placeholder="Qué se envió o conversó" />
              </Field>
              <SubmitButton>Registrar contacto</SubmitButton>
            </ActionForm>
            {activities.data.length ? (
              <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
                {activities.data.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">{CHANNEL_NAMES[a.channel]}</span> · {date(a.occurredAt)}
                        {a.member ? ` · ${a.member.name ?? a.member.email}` : ''}
                      </p>
                      {a.note ? <p className="mt-0.5 whitespace-pre-line">{a.note}</p> : null}
                    </div>
                    <ActionForm action={deleteActivity}>
                      <input type="hidden" name="id" value={person.id} />
                      <input type="hidden" name="activityId" value={a.id} />
                      <SubmitButton variant="ghost" size="sm" confirm="¿Eliminar esta entrada?">Eliminar</SubmitButton>
                    </ActionForm>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 border-t border-line pt-3 text-sm text-muted-foreground">Aún no hay contactos registrados.</p>
            )}
          </Card>

          <Card title="Combinar cuentas" description="Si dos cuentas pertenecen al mismo autor, combínalas para reunir sus menciones, etiquetas, notas y contactos. El cambio solo aplica en este espacio de trabajo y puedes separarlas después.">
            <form method="GET" className="flex gap-2">
              <Input name="merge" defaultValue={mergeQ} placeholder="Buscar autores por nombre o usuario" />
              <Button type="submit" variant="outline">Buscar</Button>
            </form>
            {candidates ? (
              others.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No hay otros autores que coincidan.</p>
              ) : (
                <ul className="mt-3 divide-y divide-line text-sm">
                  {others.map((p) => (
                    <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                      <Link href={`/people/${p.id}`} className="flex min-w-0 items-center gap-2 hover:underline">
                        <Avatar person={p} size="size-6" />
                        <span className="truncate">{displayName(p)}</span>
                        <span className="text-xs text-muted-foreground">{platformName(p.platform)} · {p.stats.mentions} menciones</span>
                      </Link>
                      <span className="flex gap-1.5">
                        <ActionForm action={mergePeople}>
                          <input type="hidden" name="from" value={p.id} />
                          <input type="hidden" name="into" value={person.id} />
                          <SubmitButton size="sm" confirm={`¿Combinar ${displayName(p)} con ${displayName(person)}?`}>Combinar aquí</SubmitButton>
                        </ActionForm>
                        <ActionForm action={mergePeople}>
                          <input type="hidden" name="from" value={person.id} />
                          <input type="hidden" name="into" value={p.id} />
                          <SubmitButton variant="secondary" size="sm" confirm={`¿Combinar ${displayName(person)} con ${displayName(p)}?`}>Combinar con este autor</SubmitButton>
                        </ActionForm>
                      </span>
                    </li>
                  ))}
                </ul>
              )
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, href }: { label: string; value: string | null; href?: string | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate">{href ? <a href={href} target="_blank" rel="noreferrer" className="text-primary hover:underline">{value}</a> : value}</dd>
    </div>
  );
}
