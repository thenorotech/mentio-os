import { Badge, Card, Field, LinkButton, PageHeader, Stat, Textarea, KpiStrip } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { compact, date, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { deleteAlertAction, muteAuthorsAction, runDigestAction, testAlertAction, unmuteAuthorAction, updateAlertAction } from '../actions';
import { AlertForm } from '../alert-form';
import { loadRuleContext } from '../names';
import { MODE_LABELS, describeFilter, whenText } from '../rule';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alerta' };

/** Edit the rule, send a test, run its summary, and manage silenced authors. */
export default async function AlertDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [alert, context] = await Promise.all([mentio().getAlert({ path: { id } }).then(unwrap), loadRuleContext()]);
  const muted = alert.filter.excludeAuthors ?? [];
  const hidden = <input type="hidden" name="id" value={alert.id} />;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader
        back={{ href: '/alerts', label: 'Alertas' }}
        title={
          <span className="flex flex-wrap items-center gap-2">
            {alert.name}
            <Badge tone={alert.mode === 'instant' ? 'accent' : 'outline'}>{MODE_LABELS[alert.mode]}</Badge>
            {alert.enabled ? <Badge tone="good">Activa</Badge> : <Badge>Desactivada</Badge>}
          </span>
        }
        description={describeFilter(alert.filter, context.names).join(' · ')}
        actions={<LinkButton href={`/mentions?alertId=${encodeURIComponent(alert.id)}`}>Ver menciones coincidentes</LinkButton>}
      />

      <KpiStrip label="Actividad de la alerta">
        <Stat label="Envíos (7 días)" value={compact(alert.stats.sentLast7d)} hint="En todos los canales" />
        <Stat label="Último envío" value={alert.stats.lastSentAt ? timeAgo(alert.stats.lastSentAt) : 'Nunca'} hint={alert.stats.lastSentAt ? date(alert.stats.lastSentAt) : 'Aún no se ha enviado'} />
        <Stat label="Programación" value={<span className="text-base">{whenText(alert)}</span>} hint={alert.stats.nextRunAt ? `Siguiente: ${date(alert.stats.nextRunAt)}` : undefined} />
      </KpiStrip>

      <Card
        title="Probar alerta"
        description={alert.mode === 'instant' ? 'Envía una muestra a cada canal para comprobar que llega.' : 'La prueba envía una muestra a cada canal. El resumen envía ahora las menciones de las últimas 24 horas, sin cambiar la programación.'}
      >
        <div className="flex flex-wrap items-start gap-2">
          <ActionForm action={testAlertAction}>
            {hidden}
            <SubmitButton variant="secondary" size="sm">Enviar prueba</SubmitButton>
          </ActionForm>
          {alert.mode === 'instant' ? null : (
            <ActionForm action={runDigestAction}>
              {hidden}
              <SubmitButton variant="secondary" size="sm">Enviar resumen ahora</SubmitButton>
            </ActionForm>
          )}
        </div>
      </Card>

      <AlertForm alert={alert} action={updateAlertAction} channels={context.channels} keywords={context.keywords} groups={context.groups} />

      <Card title="Autores silenciados" description="Esta regla nunca enviará sus menciones. Los enlaces se guardan como perfil; un nombre o usuario coincide en todas las plataformas." actions={muted.length ? <span className="tabular-nums">{muted.length}</span> : undefined}>
        <div className="grid gap-4">
          {muted.length ? (
            <ul aria-label="Autores silenciados" className="divide-y rounded-lg border">
              {muted.map((author, authorIndex) => (
                <li key={`${author}-${authorIndex}`} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5 text-sm">
                  <span className="min-w-0 truncate" title={author}>{author}</span>
                  <ActionForm action={unmuteAuthorAction}>
                    {hidden}
                    <input type="hidden" name="author" value={author} />
                    <SubmitButton size="sm" variant="ghost">
                      Dejar de silenciar<span className="sr-only"> a {author}</span>
                    </SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">No hay autores silenciados.</p>
          )}
          <ActionForm action={muteAuthorsAction} resetOnSuccess className="grid gap-3">
            {hidden}
            <Field label="Silenciar autores" hint="Hasta 50 por envío, uno por línea: enlaces a perfiles o publicaciones, @usuarios o nombres visibles.">
              <Textarea name="authors" rows={3} placeholder={'https://x.com/somebot\n@spammer'} />
            </Field>
            <div className="flex justify-end">
              <SubmitButton variant="secondary" size="sm">Silenciar</SubmitButton>
            </div>
          </ActionForm>
        </div>
      </Card>

      <Card title="Eliminar alerta" description="La regla se detiene de inmediato. Sus canales permanecen conectados." className="ring-destructive/30">
        <ActionForm action={deleteAlertAction}>
          {hidden}
          <SubmitButton variant="danger" size="sm" confirm={`¿Eliminar la alerta "${alert.name}"? Dejará de enviar avisos de inmediato. Esta acción no se puede deshacer.`}>Eliminar alerta</SubmitButton>
        </ActionForm>
      </Card>
    </div>
  );
}
