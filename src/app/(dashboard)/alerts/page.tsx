import Link from 'next/link';
import { Bell, Plus, Sparkles } from 'lucide-react';
import { Badge, Conditions, EmptyState, LinkButton, Table, td, TableCell, TableRow, rowLink, DataView } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { compact, date, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { setAlertEnabled } from './actions';
import { loadRuleContext } from './names';
import { MODE_LABELS, describeFilter, whenText } from './rule';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Alertas' };

/** Every rule: what it watches, when and where it sends, and a switch to pause it. */
export default async function Alerts() {
  const [alerts, context] = await Promise.all([mentio().listAlerts().then(unwrap), loadRuleContext()]);

  return (
    <DataView
      title="Alertas"
      notice="Reglas que envían menciones de candidatos y temas a tus canales, al momento o en un resumen periódico."
      actions={<><LinkButton href="/alerts/plantillas" variant="secondary"><Sparkles /> Usar una plantilla</LinkButton><LinkButton href="/alerts/new" variant="primary" create><Plus /> Crear alerta</LinkButton></>}
    >

      {alerts.data.length === 0 ? (
        <EmptyState icon={Bell} title="Aún no hay alertas">
          <Link href="/alerts/new" className="text-primary hover:underline">Crea una</Link> para recibir menciones por Slack, correo electrónico, webhook o Telegram.
        </EmptyState>
      ) : (
        <Table head={['Alerta', 'Envío', 'Canales', 'Últimos 7 días', '']}>
          {alerts.data.map((alert) => (
            <TableRow key={alert.id} className={alert.enabled ? '' : 'text-muted-foreground'}>
              <TableCell className={`${td} min-w-64`}>
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/alerts/${alert.id}`} data-row-link className={`font-medium hover:underline ${rowLink}`}>{alert.name}</Link>
                  <Badge tone={alert.mode === 'instant' ? 'accent' : 'outline'}>{MODE_LABELS[alert.mode]}</Badge>
                  {alert.enabled ? null : <Badge>Desactivada</Badge>}
                </div>
                <div className="mt-1.5">
                  <Conditions conditions={describeFilter(alert.filter, context.names)} empty="Todas las menciones relevantes" />
                </div>
              </TableCell>
              <TableCell className={`${td} text-xs text-muted-foreground`}>
                {whenText(alert)}
                {alert.stats.nextRunAt && alert.enabled ? <p className="text-muted-foreground">Siguiente: {date(alert.stats.nextRunAt)}</p> : null}
              </TableCell>
              <TableCell className={td}>
                <div className="flex flex-wrap gap-1">
                  {alert.channels.length ? alert.channels.map((c) => <Badge key={c.id} tone="outline">{c.label}</Badge>) : <Badge tone="warn">Sin canal</Badge>}
                </div>
              </TableCell>
              <TableCell className={`${td} text-xs whitespace-nowrap text-muted-foreground`}>
                <span className="tabular-nums">{compact(alert.stats.sentLast7d)}</span> envíos
                {alert.stats.lastSentAt ? <p className="text-muted-foreground">último {timeAgo(alert.stats.lastSentAt)}</p> : null}
              </TableCell>
              <TableCell className={`${td} text-right`}>
                <ActionForm action={setAlertEnabled}>
                  <input type="hidden" name="id" value={alert.id} />
                  <input type="hidden" name="enabled" value={String(!alert.enabled)} />
                  <SubmitButton size="sm" variant="secondary">{alert.enabled ? 'Desactivar' : 'Activar'}</SubmitButton>
                </ActionForm>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
    </DataView>
  );
}
