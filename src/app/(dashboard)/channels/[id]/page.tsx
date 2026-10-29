import { History } from 'lucide-react';
import { Badge, Card, CheckboxGroup, Field, Input, PageHeader, SectionHeading, Stat, Table, Textarea, TONE_TEXT, td, type Tone, TableCell, TableRow, KpiStrip } from '@/components/ui';
import { ActionForm, FormCard, SubmitButton } from '@/components/ui/client';
import { date, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { deleteChannelAction, rotateSecretAction, testChannelAction, updateChannelAction } from '../actions';
import { ACCOUNT_EVENTS, KIND_LABELS, eventLabel, headersText, targetText } from '../kinds';
import { SecretForm } from '../secret-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Canal' };

const STATUS_TONE: Record<'pending' | 'delivered' | 'failed', Tone> = { pending: 'warn', delivered: 'good', failed: 'bad' };

/** Edit and test a channel, rotate a webhook key, and review its delivery history. */
export default async function ChannelDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const api = mentio();
  const [channel, deliveries] = await Promise.all([
    api.getChannel({ path: { id } }).then(unwrap),
    api.listChannelDeliveries({ path: { id }, query: { limit: 50 } }).then(unwrap),
  ]);
  const hidden = <input type="hidden" name="id" value={channel.id} />;

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader
        back={{ href: '/channels', label: 'Canales' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {channel.label}
            <Badge tone="outline">{KIND_LABELS[channel.kind]}</Badge>
          </span>
        }
        description={targetText(channel)}
        actions={
          <ActionForm action={testChannelAction}>
            {hidden}
            <SubmitButton variant="secondary">Enviar prueba</SubmitButton>
          </ActionForm>
        }
      />

      <KpiStrip label="Actividad del canal">
        <Stat
          label="Alertas activas"
          value={`${channel.stats.activeAlerts} de ${channel.stats.alerts}`}
          tone={channel.stats.alerts > 0 && channel.stats.activeAlerts === 0 ? 'warning' : undefined}
          hint={channel.stats.activeAlerts === 0 ? 'Ninguna activa: no recibe avisos' : 'Alertas que envían aquí'}
        />
        <Stat
          label="Envíos (7 días)"
          value={channel.stats.last7d.total}
          hint={channel.stats.last7d.failed ? `${channel.stats.last7d.failed} fallidos` : 'Ninguno fallido'}
        />
        <Stat label="Último envío" value={channel.stats.lastDeliveryAt ? timeAgo(channel.stats.lastDeliveryAt) : 'Nunca'} hint={channel.stats.lastDeliveryAt ? date(channel.stats.lastDeliveryAt) : 'Aún no hay envíos'} />
      </KpiStrip>

      {channel.kind === 'email' ? (
        <Card title="Destinatarios" description="Las direcciones sin confirmar no reciben avisos hasta que abren el enlace que se les envió." actions={<span className="tabular-nums">{channel.config.recipients.length}</span>}>
          <ul aria-label="Destinatarios" className="divide-y rounded-lg border text-sm">
            {channel.config.recipients.map((r) => (
              <li key={r.email} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
                <span className="min-w-0 truncate" title={r.email}>{r.email}</span>
                {r.confirmedAt ? <Badge tone="good">Confirmada {timeAgo(r.confirmedAt)}</Badge> : <Badge tone="warn">Falta confirmar</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <FormCard
        action={updateChannelAction}
        title="Ajustes"
        description={channel.kind === 'webhook' ? 'Destino, encabezados y eventos de la cuenta que recibe este webhook.' : 'Cómo se llama este canal en las alertas.'}
        hint={channel.kind === 'webhook' ? 'Al guardar se reemplazan todos los encabezados.' : undefined}
      >
        {hidden}
        <input type="hidden" name="kind" value={channel.kind} />
        <Field label="Etiqueta">
          <Input name="label" required maxLength={80} defaultValue={channel.label} />
        </Field>
        {channel.kind === 'webhook' ? (
          <>
            <Field label="URL" hint="Destino de las solicitudes POST. Usa https.">
              <Input name="url" type="text" inputMode="url" required defaultValue={channel.config.url} />
            </Field>
            <Field label="Encabezados personalizados" hint={'Uno por línea con el formato "Nombre: valor".'}>
              <Textarea name="headers" rows={3} defaultValue={headersText(channel.config.headers)} className="font-mono text-xs" />
            </Field>
            <Field group label="Eventos de la cuenta" hint="Algunos cambios del espacio se envían directamente, sin una alerta. Desmarca todos para no recibirlos.">
              <CheckboxGroup name="events" options={ACCOUNT_EVENTS.map(([eid, label]) => [eid, `${label} (${eid})`] as const)} selected={channel.config.events} />
            </Field>
          </>
        ) : null}
      </FormCard>

      {channel.kind === 'webhook' ? (
        <Card title="Clave de firma" description="Al rotarla, se muestra una clave nueva una sola vez. La anterior deja de funcionar de inmediato; actualiza tu endpoint.">
          <SecretForm action={rotateSecretAction} title="Tu nueva clave de firma">
            {hidden}
            <SubmitButton variant="secondary" size="sm" confirm="¿Rotar la clave? La actual dejará de funcionar de inmediato y tendrás que actualizar tu endpoint.">Rotar clave</SubmitButton>
          </SecretForm>
        </Card>
      ) : null}

      <section aria-labelledby="channel-deliveries" className="grid gap-3">
        <SectionHeading
          id="channel-deliveries"
          icon={History}
          title="Historial de envíos"
          description="Los 50 envíos más recientes, con su resultado y los intentos."
          aside={deliveries.data.length ? <span className="tabular-nums">{deliveries.data.length} envíos</span> : undefined}
        />
        <Table head={['Estado', 'Evento', 'Contenido', 'Intentos', 'Hora']} empty={deliveries.data.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Aún no hay envíos. Usa «Enviar prueba» para comprobar el canal.</p> : null}>
          {deliveries.data.map((d) => (
            <TableRow key={d.id}>
              <TableCell className={`${td} whitespace-nowrap`}>
                <Badge tone={STATUS_TONE[d.status]}>{({ pending: 'Pendiente', delivered: 'Entregado', failed: 'Fallido' } as const)[d.status]}</Badge>
              </TableCell>
              <TableCell className={`${td} font-mono text-xs whitespace-nowrap`}>{eventLabel(d.event)}</TableCell>
              <TableCell className={`${td} min-w-56 text-xs`}>
                {d.alert.name ? <p className="font-medium">{d.alert.name}</p> : null}
                {d.mention ? (
                  <a href={d.mention.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-muted-foreground hover:text-foreground hover:underline">{d.mention.text}</a>
                ) : (
                  <p className="text-muted-foreground">{d.kind === 'digest' ? 'Resumen periódico' : d.kind === 'event' ? 'Evento de la cuenta' : 'Mención'}</p>
                )}
                {d.error ? <p className={`mt-1 ${TONE_TEXT.negative}`}>{d.error}</p> : null}
              </TableCell>
              <TableCell className={`${td} text-xs tabular-nums`}>{d.attempts}</TableCell>
              <TableCell className={`${td} text-xs whitespace-nowrap text-muted-foreground`}>
                <time dateTime={d.sentAt ?? d.createdAt} title={date(d.sentAt ?? d.createdAt)}>{timeAgo(d.sentAt ?? d.createdAt)}</time>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </section>

      <Card title="Eliminar canal" description="Las alertas dejarán de enviarse aquí, pero se conservarán." className="ring-destructive/30">
        <ActionForm action={deleteChannelAction}>
          {hidden}
          <SubmitButton variant="danger" size="sm" confirm={`¿Eliminar el canal "${channel.label}"? Las alertas dejarán de enviarse aquí. Esta acción no se puede deshacer.`}>Eliminar canal</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
