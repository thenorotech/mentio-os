import { Badge, Card, CheckboxGroup, Field, Input, PageHeader, Stat, Table, Textarea, td, type Tone, TableCell, TableRow, KpiStrip } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
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
    <div className="space-y-6">
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

      <KpiStrip>
        <Stat label="Alertas que envían aquí" value={`${channel.stats.activeAlerts} de ${channel.stats.alerts}`} hint={channel.stats.activeAlerts === 0 ? 'Ninguna activa: no recibe avisos' : 'Activas del total'} />
        <Stat label="Envíos en los últimos 7 días" value={channel.stats.last7d.total} hint={channel.stats.last7d.failed ? `${channel.stats.last7d.failed} fallidos` : 'Ninguno fallido'} />
        <Stat label="Último envío" value={channel.stats.lastDeliveryAt ? timeAgo(channel.stats.lastDeliveryAt) : 'Nunca'} hint={date(channel.stats.lastDeliveryAt)} />
      </KpiStrip>

      {channel.kind === 'email' ? (
        <Card title="Destinatarios" description="Las direcciones sin confirmar no reciben avisos hasta que abren el enlace que se les envió.">
          <ul className="divide-y divide-line text-sm">
            {channel.config.recipients.map((r) => (
              <li key={r.email} className="flex items-center justify-between gap-3 py-2">
                <span className="truncate">{r.email}</span>
                {r.confirmedAt ? <Badge tone="good">Confirmada {timeAgo(r.confirmedAt)}</Badge> : <Badge tone="warn">Falta confirmar</Badge>}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card title="Ajustes">
        <ActionForm action={updateChannelAction} className="space-y-4">
          {hidden}
          <input type="hidden" name="kind" value={channel.kind} />
          <Field label="Etiqueta">
            <Input name="label" required maxLength={80} defaultValue={channel.label} />
          </Field>
          {channel.kind === 'webhook' ? (
            <>
              <Field label="URL">
                <Input name="url" type="text" inputMode="url" required defaultValue={channel.config.url} />
              </Field>
              <Field label="Encabezados personalizados" hint={'Uno por línea con el formato "Nombre: valor". Al guardar se reemplazan todos los encabezados.'}>
                <Textarea name="headers" rows={3} defaultValue={headersText(channel.config.headers)} className="font-mono" />
              </Field>
              <div>
                <p className="text-sm font-medium text-foreground">Eventos de la cuenta</p>
                <p className="mb-2 text-xs text-muted-foreground">Algunos cambios del espacio se envían directamente, sin una alerta. Desmarca todos para no recibirlos.</p>
                <CheckboxGroup name="events" options={ACCOUNT_EVENTS.map(([eid, label]) => [eid, `${label} (${eid})`] as const)} selected={channel.config.events} />
              </div>
            </>
          ) : null}
          <SubmitButton>Guardar</SubmitButton>
        </ActionForm>
      </Card>

      {channel.kind === 'webhook' ? (
        <Card title="Clave de firma" description="Al rotarla, se muestra una clave nueva una sola vez. La anterior deja de funcionar de inmediato; actualiza tu endpoint.">
          <SecretForm action={rotateSecretAction} title="Tu nueva clave de firma">
            {hidden}
            <SubmitButton variant="secondary" confirm="¿Rotar la clave? La actual dejará de funcionar de inmediato.">Rotar clave</SubmitButton>
          </SecretForm>
        </Card>
      ) : null}

      <section>
        <h2 className="mb-2 text-sm font-semibold">Historial de envíos</h2>
        <Table head={['Estado', 'Evento', 'Contenido', 'Intentos', 'Hora']} empty={deliveries.data.length === 0 ? <p className="p-6 text-center text-sm text-muted-foreground">Aún no hay envíos.</p> : null}>
          {deliveries.data.map((d) => (
            <TableRow key={d.id}>
              <TableCell className={`${td} whitespace-nowrap`}>
                <Badge tone={STATUS_TONE[d.status]}>{({ pending: 'Pendiente', delivered: 'Entregado', failed: 'Fallido' } as const)[d.status]}</Badge>
              </TableCell>
              <TableCell className={`${td} font-mono text-xs whitespace-nowrap`}>{eventLabel(d.event)}</TableCell>
              <TableCell className={`${td} min-w-56 text-xs`}>
                {d.alert.name ? <p className="font-medium">{d.alert.name}</p> : null}
                {d.mention ? (
                  <a href={d.mention.url} target="_blank" rel="noreferrer" className="line-clamp-2 text-muted-foreground hover:underline">{d.mention.text}</a>
                ) : (
                  <p className="text-muted-foreground">{d.kind === 'digest' ? 'Resumen periódico' : d.kind === 'event' ? 'Evento de la cuenta' : 'Mención'}</p>
                )}
                {d.error ? <p className="mt-1 text-red-600">{d.error}</p> : null}
              </TableCell>
              <TableCell className={`${td} text-xs tabular-nums`}>{d.attempts}</TableCell>
              <TableCell className={`${td} text-xs whitespace-nowrap text-muted-foreground`} title={date(d.sentAt ?? d.createdAt)}>{timeAgo(d.sentAt ?? d.createdAt)}</TableCell>
            </TableRow>
          ))}
        </Table>
      </section>

      <Card title="Eliminar canal" description="Las alertas dejarán de enviarse aquí, pero se conservarán.">
        <ActionForm action={deleteChannelAction}>
          {hidden}
          <SubmitButton variant="danger" confirm={`¿Eliminar el canal "${channel.label}"?`}>Eliminar canal</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
