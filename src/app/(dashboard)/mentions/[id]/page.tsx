import type { Mention } from '@mentio-dev/sdk';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar, keywordLabel } from '@/components/mention-card';
import { Check, ExternalLink } from 'lucide-react';
import { PlatformIcon } from '@/components/platform-icon';
import { Avatar as UiAvatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, Card, DateTimePicker, EmptyState, Field, LinkButton, PageHeader, Select, TONE_TEXT, Textarea, buttonClass, cx, sentimentTone, type Tone } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { ActionForm, CopyButton, SubmitButton } from '@/components/ui/client';
import { compact, platformName, tagName, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { muteAuthorInAlert, saveTriage, setMentionStatus, setVerdict, snoozeMention } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mención' };

/** A date, or nothing when the value is missing or not a date. */
function when(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(d) + ' UTC';
}

const ENGAGEMENT = [
  ['likes', 'Me gusta'],
  ['reposts', 'Republicaciones'],
  ['replies', 'Respuestas'],
  ['quotes', 'Citas'],
  ['views', 'Vistas'],
  ['bookmarks', 'Guardados'],
] as const;

const SENTIMENT_LABELS = { positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' } as const;
const STATUS_LABELS: Record<string, string> = { open: 'Abierto', done: 'Resuelto', ignored: 'Ignorado', snoozed: 'Pospuesto', new: 'Nuevo' };
const STATUS_TONES: Record<string, Tone> = { open: 'accent', new: 'accent', done: 'good', snoozed: 'warn', ignored: 'neutral' };
const INTENT_LABELS: Record<string, string> = { buy_intent: 'Intención de apoyo', question: 'Pregunta', complaint: 'Queja', praise: 'Reconocimiento', comparison: 'Comparación', churn_intent: 'Intención de cambio', bug_report: 'Reporte de error', pricing: 'Costo', hiring: 'Contratación', event: 'Evento', promotional: 'Promoción' };

/** One row of a record's facts: a muted label left, the value right. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm first:pt-0 last:pb-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right break-words text-foreground">{children}</dd>
    </div>
  );
}

/** An outside link: opens in a new tab, says so to screen readers. */
function OutLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cx('inline-flex items-center gap-1 rounded-sm text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none', className)}>
      {children}
      <ExternalLink aria-hidden className="size-3 shrink-0" />
      <span className="sr-only">(se abre en otra pestaña)</span>
    </a>
  );
}

/** A review's stars: the rating in the warning tone, the rest muted; the label carries the number. */
function Stars({ rating, max }: { rating: number; max: number }) {
  return (
    <span role="img" aria-label={`${rating} de ${max} estrellas`} className="tracking-tight">
      <span aria-hidden className={TONE_TEXT.warning}>{'★'.repeat(Math.max(0, Math.min(rating, max)))}</span>
      <span aria-hidden className="text-muted-foreground/40">{'★'.repeat(Math.max(0, max - rating))}</span>
    </span>
  );
}

/** The entry an alert's mute list takes: the profile link when there is one, else the handle or name. */
const muteEntry = (author: Mention['author']) => author?.url || author?.handle || author?.name || '';

export default async function MentionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = mentio();
  const [result, members, alerts] = await Promise.all([
    api.getMention({ path: { id } }),
    // The two pickers are secondary: a failure empties them instead of failing the page.
    api.listMembers().then(unwrap).then((r) => r.data).catch(() => null),
    api.listAlerts().then(unwrap).then((r) => r.data).catch(() => null),
  ]);
  if (result.response?.status === 404) notFound();
  const mention = unwrap(result);
  const { post, author, review, classification: verdict, triage } = mention;
  const snoozedUntil = triage.snoozedUntil ? new Date(triage.snoozedUntil) : null;
  const snoozed = snoozedUntil !== null && !Number.isNaN(snoozedUntil.getTime()) && snoozedUntil.getTime() > Date.now();
  const engagement = post.engagement ? ENGAGEMENT.filter(([key]) => post.engagement?.[key] !== null && post.engagement?.[key] !== undefined) : [];
  const entry = muteEntry(author);
  const platform = platformName(post.platform);

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: '/mentions', label: 'Menciones' }}
        title={
          <span className="flex min-w-0 items-center gap-3">
            <UiAvatar className="size-9">
              {author?.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-sm font-semibold">{(author?.name ?? author?.handle ?? '?').replace(/^@/, '').slice(0, 1).toUpperCase()}</AvatarFallback>
            </UiAvatar>
            <span className="min-w-0 truncate">{author?.name ?? author?.handle ?? 'Mención'}</span>
          </span>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1">
            <PlatformIcon platform={post.platform} />
            <span>{platform} · {when(post.publishedAt) ?? 'Hora desconocida'} ({timeAgo(post.publishedAt)})</span>
            <Badge tone={STATUS_TONES[mention.status] ?? 'neutral'}>{STATUS_LABELS[mention.status] ?? mention.status}</Badge>
          </span>
        }
        actions={
          // Triage is the record's one primary action: resolve it, or reopen it once resolved.
          <div role="group" aria-label="Estado de la mención">
            <ActionForm action={setMentionStatus} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="id" value={mention.id} />
              {mention.status !== 'ignored' ? <SubmitButton variant="secondary" name="status" value="ignored">Ignorar</SubmitButton> : null}
              {mention.status !== 'open' && mention.status !== 'done' ? <SubmitButton variant="secondary" name="status" value="open">Reabrir</SubmitButton> : null}
              {mention.status !== 'done' ? (
                <SubmitButton name="status" value="done"><Check aria-hidden /> Marcar como resuelta</SubmitButton>
              ) : (
                <SubmitButton name="status" value="open">Reabrir</SubmitButton>
              )}
            </ActionForm>
          </div>
        }
      />

      <div className="grid gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Card
            title="Publicación"
            actions={
              <div role="group" aria-label="Publicación original" className="flex items-center gap-1.5">
                <a href={post.url} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'sm')}>
                  <ExternalLink aria-hidden /> Abrir en {platform}
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
                <CopyButton text={post.url} label="Copiar enlace" />
              </div>
            }
          >
            <div className="space-y-4">
              {post.replyTo ? (
                <div className="rounded-lg border-l-2 border-border bg-muted/40 px-3 py-2.5 text-sm">
                  <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                    <span>En respuesta a {post.replyTo.author ?? 'una publicación'}</span>
                    {post.replyTo.url ? <OutLink href={post.replyTo.url}>abrir</OutLink> : null}
                  </p>
                  {post.replyTo.text ? <p className="mt-1 line-clamp-6 whitespace-pre-line text-muted-foreground">{post.replyTo.text}</p> : null}
                </div>
              ) : null}

              {review ? (
                <div className="space-y-1">
                  <p className="flex items-center gap-2 text-lg">
                    <Stars rating={review.rating} max={review.ratingMax} />
                    <span aria-hidden className="text-xs text-muted-foreground tabular-nums">{review.rating} de {review.ratingMax}</span>
                  </p>
                  {review.title ? <p className="font-semibold">{review.title}</p> : null}
                </div>
              ) : null}

              <p className="text-[15px] leading-relaxed text-pretty whitespace-pre-line text-foreground">{post.text || <span className="text-muted-foreground">(sin texto)</span>}</p>

              {engagement.length ? (
                <dl aria-label="Interacción" className="flex flex-wrap gap-x-6 gap-y-2 border-t pt-3 text-sm">
                  {engagement.map(([key, label]) => (
                    <div key={key}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="font-semibold tabular-nums">{compact(post.engagement?.[key])}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}

              {post.links.length ? (
                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground">Enlaces de esta publicación</p>
                  <ul className="mt-1 space-y-1 text-sm">
                    {post.links.map((link, linkIndex) => (
                      <li key={`${link}-${linkIndex}`} className="min-w-0 truncate">
                        <a href={link} target="_blank" rel="noopener noreferrer" className="rounded-sm text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{link}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </Card>

          {review ? (
            <Card title="Reseña">
              <dl className="divide-y">
                <Row label="Tienda">
                  <OutLink href={review.app.url}>{platformName(review.app.platform)}: {review.app.id}</OutLink>
                </Row>
                {review.country ? <Row label="País">{review.country.toUpperCase()}</Row> : null}
                {review.version ? <Row label="Versión">{review.version}</Row> : null}
                {review.verified !== null ? <Row label="Verificada">{review.verified ? 'Sí' : 'No'}</Row> : null}
              </dl>
              {review.response ? (
                <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="text-xs text-muted-foreground">Respuesta del equipo{when(review.responseAt) ? `, ${when(review.responseAt)}` : ''}</p>
                  <p className="mt-1 whitespace-pre-line text-foreground/80">{review.response}</p>
                </div>
              ) : null}
            </Card>
          ) : null}

          <Card
            title="Clasificación"
            hint="Lectura automática del tono, el tema y la relevancia de esta publicación."
            description={verdict?.feedback ? 'El equipo corrigió esta clasificación.' : 'Resultado del análisis de esta mención.'}
          >
            {!verdict ? (
              <EmptyState compact title="Aún no se ha clasificado esta mención" example="Un post que apoya una propuesta de seguridad puede quedar como positivo y relevante." action={<LinkButton href="/mentions" size="sm">Volver a las menciones</LinkButton>}>Cuando se complete el análisis, aquí aparecerán su tono y los temas que expresa.</EmptyState>
            ) : verdict.failed ? (
              <p className="text-sm text-muted-foreground">No se pudo clasificar esta mención.</p>
            ) : (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={mention.relevant ? 'solid' : 'neutral'} className="tabular-nums">Relevancia {verdict.relevance ?? 'sin dato'}</Badge>
                  <Badge tone={sentimentTone(verdict.sentiment)}>{SENTIMENT_LABELS[verdict.sentiment]}</Badge>
                  {verdict.intents.map((intent, intentIndex) => <Badge key={`${intent}-${intentIndex}`} tone="accent">{INTENT_LABELS[intent] ?? tagName(intent)}</Badge>)}
                  {verdict.uncertain ? <Badge tone="warn">Incierta</Badge> : null}
                  {verdict.automated ? <Badge tone="outline">Automatizada</Badge> : null}
                </div>
                {verdict.note ? <p className="text-sm text-pretty text-foreground/80">{verdict.note}</p> : null}
                <dl className="divide-y">
                  <Row label="Relevante">{mention.relevant ? 'Sí' : 'No'}</Row>
                  {verdict.confidence !== null ? <Row label="Confianza"><span className="tabular-nums">{Math.round(verdict.confidence * 100)}%</span></Row> : null}
                  {verdict.language ? <Row label="Idioma">{verdict.language}</Row> : null}
                  <Row label="Prioridad"><span className="tabular-nums">{mention.priority}</span></Row>
                  {verdict.feedback ? (
                    <Row label="Antes de la corrección">
                      relevancia {verdict.feedback.original.relevance ?? 'sin dato'}, {SENTIMENT_LABELS[verdict.feedback.original.sentiment].toLowerCase()}
                    </Row>
                  ) : null}
                </dl>

                <div className="space-y-3 border-t pt-4">
                  <p className="text-xs text-muted-foreground">¿La clasificación no es correcta? Corrige la relevancia o el sentimiento; la opción actual lleva una marca.</p>
                  <div role="group" aria-label="Corregir relevancia">
                    <ActionForm action={setVerdict} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={mention.id} />
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">Relevancia</span>
                      <SubmitButton variant="secondary" size="sm" name="relevant" value="true">{mention.relevant ? <Check aria-hidden /> : null}Relevante</SubmitButton>
                      <SubmitButton variant="secondary" size="sm" name="relevant" value="false">{mention.relevant ? null : <Check aria-hidden />}No relevante</SubmitButton>
                      {verdict.feedback?.relevant !== null && verdict.feedback?.relevant !== undefined ? (
                        <SubmitButton variant="ghost" size="sm" name="relevant" value="reset">Deshacer cambio</SubmitButton>
                      ) : null}
                    </ActionForm>
                  </div>
                  <div role="group" aria-label="Corregir sentimiento">
                    <ActionForm action={setVerdict} className="flex flex-wrap items-center gap-2">
                      <input type="hidden" name="id" value={mention.id} />
                      <span className="w-24 shrink-0 text-xs text-muted-foreground">Sentimiento</span>
                      {(['positive', 'neutral', 'negative'] as const).map((s, sIndex) => (
                        <SubmitButton key={`${s}-${sIndex}`} variant="secondary" size="sm" name="sentiment" value={s}>{verdict.sentiment === s ? <Check aria-hidden /> : null}{SENTIMENT_LABELS[s]}</SubmitButton>
                      ))}
                      {verdict.feedback?.sentiment ? <SubmitButton variant="ghost" size="sm" name="sentiment" value="reset">Deshacer cambio</SubmitButton> : null}
                    </ActionForm>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="min-w-0 space-y-6">
          <Card title={<span className="inline-flex items-center gap-1">Autor <InfoTip term="autor" /></span>}>
            {author ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={author.name} url={author.avatarUrl} size="size-10" />
                  <div className="min-w-0">
                    <p className="truncate font-medium">{author.name ?? 'Desconocido'}</p>
                    <p className="truncate text-xs text-muted-foreground tabular-nums">
                      {[author.handle, author.followers !== null ? `${compact(author.followers)} seguidores` : null].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                </div>
                {author.tags.length ? (
                  <div className="flex flex-wrap gap-1">{author.tags.map((t, tIndex) => <Badge key={`${t}-${tIndex}`} tone="outline">{t}</Badge>)}</div>
                ) : null}
                {author.id || author.url ? (
                  <div className="flex flex-wrap gap-2">
                    {author.id ? <LinkButton href={`/people/${encodeURIComponent(author.id)}`} size="sm">Ver en audiencia</LinkButton> : null}
                    {author.url ? (
                      <a href={author.url} target="_blank" rel="noopener noreferrer" className={buttonClass('ghost', 'sm')}>
                        <ExternalLink aria-hidden /> Ver perfil
                        <span className="sr-only">(se abre en otra pestaña)</span>
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">El canal no identifica al autor.</p>
            )}
          </Card>

          <Card title="Término monitoreado" hint="Candidato, adversario o tema que coincidió con esta publicación.">
            <dl className="divide-y">
              <Row label="Término">
                <Link href={`/mentions?keywordIds=${encodeURIComponent(mention.keyword.id)}`} className="rounded-sm text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{keywordLabel(mention.keyword)}</Link>
              </Row>
              <Row label="Campaña">{mention.keyword.group.name}</Row>
              <Row label="Detectada">{when(mention.createdAt) ?? '—'}</Row>
              <Row label="Alerta enviada">{mention.delivered ? 'Sí' : 'No'}</Row>
            </dl>
          </Card>

          <Card title="Seguimiento" description="Quién la atiende y cuándo vuelve a la lista.">
            <div className="space-y-5">
              <ActionForm action={saveTriage} className="space-y-3">
                <input type="hidden" name="id" value={mention.id} />
                <Field label="Responsable">
                  {members ? (
                    <Select
                      name="assigneeId"
                      defaultValue={triage.assignee?.id ?? ''}
                      placeholder="Sin responsable"
                      options={[
                        ...members.map((m) => [m.userId, m.name ?? m.email] as const),
                        // Someone assigned who has since left still shows.
                        ...(triage.assignee && !members.some((m) => m.userId === triage.assignee?.id)
                          ? [[triage.assignee.id, triage.assignee.name ?? triage.assignee.email ?? triage.assignee.id] as const]
                          : []),
                      ]}
                    />
                  ) : (
                    <p className="text-xs text-muted-foreground">No se pudo cargar el equipo.</p>
                  )}
                </Field>
                <Field label="Nota interna" hint="Solo la ve tu equipo.">
                  <Textarea name="note" rows={3} maxLength={2000} defaultValue={triage.note ?? ''} />
                </Field>
                <div className="flex justify-end">
                  <SubmitButton variant="secondary" size="sm">Guardar</SubmitButton>
                </div>
              </ActionForm>

              <ActionForm action={snoozeMention} className="space-y-3 border-t pt-4">
                <input type="hidden" name="id" value={mention.id} />
                <div>
                  <p className="text-sm font-medium text-foreground">Posponer</p>
                  <p className="text-xs text-pretty text-muted-foreground">
                    {snoozed ? `Fuera de la lista hasta ${when(triage.snoozedUntil)}.` : 'Oculta esta mención de la lista por un tiempo.'}
                  </p>
                </div>
                <div role="group" aria-label="Posponer por" className="flex flex-wrap gap-1.5">
                  <SubmitButton variant="secondary" size="sm" name="snooze" value="hour">1 hora</SubmitButton>
                  <SubmitButton variant="secondary" size="sm" name="snooze" value="day">1 día</SubmitButton>
                  <SubmitButton variant="secondary" size="sm" name="snooze" value="week">1 semana</SubmitButton>
                  {snoozed ? <SubmitButton variant="ghost" size="sm" name="snooze" value="clear">Mostrar ahora</SubmitButton> : null}
                </div>
                <div className="flex flex-wrap items-end gap-2">
                  <Field label="Hasta (UTC)" className="min-w-0 flex-1">
                    <DateTimePicker name="until" />
                  </Field>
                  <SubmitButton variant="secondary" size="sm" name="snooze" value="custom">Posponer</SubmitButton>
                </div>
              </ActionForm>
            </div>
          </Card>

          {entry ? (
            <Card title={<span className="inline-flex items-center gap-1">Silenciar autor <InfoTip term="alerta" /></span>} description="Evita que una alerta envíe sus publicaciones. Seguirán apareciendo en la lista.">
              {alerts === null ? (
                <p className="text-sm text-muted-foreground">No se pudieron cargar las alertas.</p>
              ) : alerts.length === 0 ? (
                <EmptyState compact title="Aún no hay alertas" example="Puedes crear un aviso para que el equipo reciba una mención negativa sobre “seguridad”." action={<LinkButton href="/alerts/new" size="sm">Crear una alerta</LinkButton>}>Una alerta puede avisarte cuando llegue una publicación que cumpla tus reglas.</EmptyState>
              ) : (
                <ActionForm action={muteAuthorInAlert} className="space-y-3">
                  <input type="hidden" name="author" value={entry} />
                  <p className="truncate text-xs text-muted-foreground" title={entry}>Silenciar: <span className="text-foreground">{entry}</span></p>
                  <Select name="alertId" required defaultValue="" placeholder="Elige una alerta" options={alerts.map((a) => [a.id, a.name] as const)} aria-label="Alerta en la que silenciar al autor" />
                  <div className="flex justify-end">
                    <SubmitButton variant="secondary" size="sm">Silenciar en la alerta</SubmitButton>
                  </div>
                </ActionForm>
              )}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
