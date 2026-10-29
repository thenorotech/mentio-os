import Link from 'next/link';
import { Card, CheckboxGroup, Field, Input, PageHeader, Textarea, cx } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { isOneOf } from '@/lib/form';
import { mentio, unwrap } from '@/lib/mentio';
import { one, type SearchParams } from '@/lib/params';
import { createEmailChannel, createSlackChannel, createWebhookChannel } from '../actions';
import { ACCOUNT_EVENTS, KINDS, KIND_LABELS, targetText, type ChannelKind } from '../kinds';
import { SecretForm } from '../secret-form';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Crear canal' };

const BLURBS: Record<ChannelKind, string> = {
  slack: 'Envía avisos a un canal del espacio de trabajo conectado en Slack.',
  email: 'Envía avisos a una lista de direcciones.',
  webhook: 'Envía datos JSON firmados a tu propio endpoint.',
  telegram: 'Envía mensajes a un chat o grupo de Telegram.',
};

export default async function NewChannel({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const requested = one(params, 'type');
  const kind: ChannelKind = isOneOf(KINDS, requested) ? requested : 'webhook';

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title="Crear canal" description="Elige dónde recibir las alertas de campaña." back={{ href: '/channels', label: 'Canales' }} />

      <nav aria-label="Tipo de canal" className="grid grid-cols-2 gap-2 @2xl:grid-cols-4">
        {KINDS.map((k, kIndex) => (
          <Link
            key={`${k}-${kIndex}`}
            href={`/channels/new?type=${k}`}
            aria-current={k === kind ? 'page' : undefined}
            className={cx(
              'pressable flex flex-col gap-1 rounded-xl border bg-card p-3.5 text-sm shadow-xs transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              k === kind ? 'border-primary bg-brand-soft ring-1 ring-primary' : 'hover:border-foreground/25 hover:bg-muted/40',
            )}
          >
            <span className="font-medium">{KIND_LABELS[k]}</span>
            <span className="text-xs text-pretty text-muted-foreground">{BLURBS[k]}</span>
          </Link>
        ))}
      </nav>

      {kind === 'slack' ? <SlackForm /> : null}
      {kind === 'email' ? <EmailForm /> : null}
      {kind === 'webhook' ? <WebhookForm /> : null}
      {kind === 'telegram' ? <TelegramInfo /> : null}
    </div>
  );
}

function SlackForm() {
  return (
    <Card title="Canal de Slack" description="Primero conecta tu espacio de trabajo de Slack desde el panel de administración. Para un canal privado, agrega la aplicación al canal.">
      <ActionForm action={createSlackChannel} className="space-y-4">
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field label="ID del canal" hint="En Slack, abre los detalles del canal; el ID aparece en la parte inferior (C0123ABCD).">
            <Input name="channelId" required maxLength={40} placeholder="C0123ABCD" />
          </Field>
          <Field label="Nombre del canal" hint="Se usará como etiqueta.">
            <Input name="channelName" required maxLength={90} placeholder="#alertas-campana" />
          </Field>
        </div>
        <div data-slot="form-actions" className="flex justify-end">
          <SubmitButton>Agregar canal de Slack</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

function EmailForm() {
  return (
    <Card title="Lista de correo" description="Cada dirección recibe un enlace de confirmación y no recibirá avisos hasta abrirlo. Las direcciones de miembros de tu espacio de trabajo se confirman de inmediato.">
      <ActionForm action={createEmailChannel} className="space-y-4">
        <Field label="Direcciones" hint="Hasta 20, una por línea o separadas por comas.">
          <Textarea name="emails" required rows={4} placeholder={'equipo@campana.mx\ncoordinacion@campana.mx'} />
        </Field>
        <div data-slot="form-actions" className="flex justify-end">
          <SubmitButton>Agregar lista de correo</SubmitButton>
        </div>
      </ActionForm>
    </Card>
  );
}

function WebhookForm() {
  return (
    <Card title="Webhook" description="Cada solicitud se firma con una clave secreta que se muestra una sola vez al crear el canal.">
      <SecretForm action={createWebhookChannel} className="space-y-4" title="Tu clave de firma" warning="Se muestra una sola vez. Úsala para verificar la firma v2: el valor HMAC-SHA256 hexadecimal de la marca de tiempo, un punto y el cuerpo original.">
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field label="URL" hint="Destino de las solicitudes POST. Usa https.">
            <Input name="url" type="text" inputMode="url" required placeholder="https://ejemplo.mx/webhooks/campana" />
          </Field>
          <Field label="Etiqueta (opcional)" hint="Si la dejas vacía, se usa el dominio de la URL.">
            <Input name="label" maxLength={80} placeholder="Alertas de campaña" />
          </Field>
        </div>
        <Field label="Encabezados personalizados" hint={'Uno por línea con el formato "Nombre: valor", para tu autenticación.'}>
          <Textarea name="headers" rows={3} placeholder="Authorization: Bearer ..." className="font-mono text-xs" />
        </Field>
        <Field group label="Eventos de la cuenta (opcional)" hint="Se envían directamente, sin una alerta. Las menciones y los resúmenes periódicos siguen llegando por medio de las alertas.">
          <CheckboxGroup name="events" options={ACCOUNT_EVENTS.map(([id, label]) => [id, `${label} (${id})`] as const)} selected={[]} />
        </Field>
        <div data-slot="form-actions" className="flex justify-end">
          <SubmitButton>Crear webhook</SubmitButton>
        </div>
      </SecretForm>
    </Card>
  );
}

async function TelegramInfo() {
  const telegram = unwrap(await mentio().listChannels()).data.filter((c) => c.kind === 'telegram');
  return (
    <Card title="Telegram" description="Los chats de Telegram se conectan desde el panel de administración, no mediante la API.">
      <ol className="list-decimal space-y-1.5 pl-5 text-sm text-pretty text-foreground/80 marker:text-muted-foreground">
        <li>Abre el panel de administración y conecta Telegram.</li>
        <li>Sigue el enlace que aparece y pulsa Iniciar, o agrega el bot a un grupo.</li>
        <li>El chat aparecerá aquí como un canal. Selecciónalo en una alerta.</li>
      </ol>
      <div className="mt-5 grid gap-2">
        <h2 id="telegram-chats" className="text-sm font-medium">Chats conectados</h2>
        {telegram.length ? (
          <ul aria-labelledby="telegram-chats" className="divide-y rounded-lg border text-sm">
            {telegram.map((c) => (
              <li key={c.id} className="flex min-h-11 items-center justify-between gap-3 px-3 py-1.5">
                <Link href={`/channels/${c.id}`} className="min-w-0 truncate rounded-sm font-medium hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">{c.label}</Link>
                <span className="shrink-0 text-xs text-muted-foreground">{targetText(c)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-muted-foreground">Aún no hay chats conectados.</p>
        )}
      </div>
    </Card>
  );
}
