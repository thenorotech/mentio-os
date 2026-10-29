/** One form for a new rule and an existing one, in reading order: the rule, what it watches, when it sends, where. */
import type { Alert, Channel, Group, Keyword } from '@mentio-dev/sdk';
import Link from 'next/link';
import type { ReactNode } from 'react';
import type { ActionState } from '@/lib/action';
import { INTENTS, SENTIMENTS, platformName, tagName } from '@/lib/format';
import { Card, CheckboxGroup, Combobox, Field, Input, Select, Textarea, SwitchRow, Segmented } from '@/components/ui';
import { FormFilters } from '@/components/url-filters';
import { filterDefaults } from '@/lib/filter-defaults';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { MODE_LABELS, MODES, RELEVANCE_LINE, WEEKDAYS, alertFilterDefs, timeOf } from './rule';

const KIND_LABELS: Record<Channel['kind'], string> = { slack: 'Slack', email: 'Email', webhook: 'Webhook', telegram: 'Telegram' };

function timezones() {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return ['UTC'];
  }
}

/** One block of the rule: a card on the page, a titled section in a drawer (globals.css). */
function Section({ title, description, children }: { title: string; description?: ReactNode; children: ReactNode }) {
  return (
    <Card title={title} description={description}>
      <div className="grid gap-4">{children}</div>
    </Card>
  );
}

export function AlertForm({
  alert,
  channels,
  keywords,
  groups,
  action,
}: {
  alert?: Alert;
  channels: Channel[];
  keywords: Keyword[];
  groups: Group[];
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
}) {
  const f = alert?.filter ?? {};
  const s = alert?.schedule ?? null;
  const joined = (values?: string[]) => (values ?? []).join(', ');
  return (
    <ActionForm action={action} className="grid gap-4">
      {alert ? <input type="hidden" name="id" value={alert.id} /> : null}

      <Section title="Regla" description="Cómo se llama la alerta y si está enviando avisos.">
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field label="Nombre">
            <Input name="name" required maxLength={80} defaultValue={alert?.name} placeholder="Menciones negativas de la candidatura" />
          </Field>
          <Field label="Nombre del evento de webhook" hint="Se incluye en los datos del webhook. Si lo dejas vacío, se usa el evento predeterminado o el resumen periódico.">
            <Input name="event" maxLength={60} defaultValue={alert?.event ?? ''} placeholder="candidato.mencion.negativa" />
          </Field>
        </div>
        <SwitchRow name="enabled" defaultChecked={alert?.enabled ?? true} label="Activa" hint="Una regla desactivada conserva sus ajustes, pero no envía avisos." />
      </Section>

      <Section title="Qué monitorea" description="Deben cumplirse todas las condiciones que configures. Deja un campo vacío para aceptar cualquier valor.">
        <Field
          label="Relevancia mínima"
          hint={`De 0 a 100. Si lo dejas vacío, se envían solo menciones relevantes (con puntuación de ${RELEVANCE_LINE} o más). Por debajo de ${RELEVANCE_LINE} también se incluye contenido clasificado como ruido; 0 envía todas las coincidencias. Los canales de correo siempre conservan el mínimo de ${RELEVANCE_LINE}.`}
        >
          <Input type="number" name="minRelevance" min={0} max={100} step={1} defaultValue={f.minRelevance ?? ''} placeholder={String(RELEVANCE_LINE)} className="@lg:max-w-40" />
        </Field>

        <Field group label="Condiciones" hint="Deben cumplirse todas. Sin condiciones, se envían todas las menciones relevantes.">
          <FormFilters
            filters={alertFilterDefs(
              keywords.map((k) => ({ value: k.id, label: k.group.isDefault ? k.term : `${k.term} (${k.group.name})` })),
              groups.length > 1 ? groups.map((g) => ({ value: g.id, label: g.name })) : [],
            )}
            defaults={filterDefaults({ ...f, minRelevance: undefined, excludeAuthors: undefined })}
            empty="Aún no hay condiciones."
          />
        </Field>

        {alert ? null : (
          <Field label="Autores silenciados" hint="Uno por línea: enlaces a perfiles o publicaciones, @usuarios o nombres. Nunca se envían sus menciones.">
            <Textarea name="excludeAuthors" rows={3} placeholder={'x.com/somebot\n@spammer'} />
          </Field>
        )}
      </Section>

      <Section title="Cuándo se envía" description="El envío inmediato avisa cuando llega cada mención. El resumen periódico reúne las menciones y se envía a la hora local indicada.">
        <div className="grid gap-4 @lg:grid-cols-2">
          <Field group label="Frecuencia" className="@lg:col-span-2">
            <Segmented
              name="mode"
              defaultValue={alert?.mode ?? 'instant'}
              options={MODES.map((m) => ({ value: m, label: MODE_LABELS[m], description: m === 'instant' ? 'Cada mención se envía al momento.' : m === 'daily' ? 'Un resumen al día, a la hora indicada.' : 'Un resumen a la semana, el día y la hora indicados.' }))}
            />
          </Field>
          <Field label="Día de la semana" hint="Solo para resúmenes semanales.">
            <Select name="weekday" defaultValue={String(s?.weekday ?? 1)} options={WEEKDAYS.map((d, i) => [String(i), d] as const)} />
          </Field>
          <Field label="Hora" hint="Para resúmenes diarios y semanales.">
            <Input type="time" name="time" defaultValue={s ? timeOf(s) : '09:00'} />
          </Field>
          <Field label="Zona horaria" hint="Una zona IANA, como America/Mexico_City.">
            <Combobox name="timezone" options={timezones()} defaultValue={s?.timezone ?? 'UTC'} placeholder="Buscar una zona" />
          </Field>
        </div>
        <SwitchRow name="skipEmpty" defaultChecked={s?.skipEmpty ?? true} label="Omitir el resumen si no hay coincidencias" />
      </Section>

      <Section title="Canales de envío" description={<>Elige uno o más canales. <Link href="/channels/new" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">Agregar un canal</Link></>}>
        {channels.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-5 text-center text-sm text-balance text-muted-foreground">Aún no hay canales. Puedes guardar la regla y conectarle canales después.</p>
        ) : (
          <CheckboxGroup
            name="channelIds"
            options={channels.map((c) => [c.id, `${c.label} (${KIND_LABELS[c.kind]})`] as const)}
            selected={alert?.channels.map((c) => c.id) ?? []}
          />
        )}
      </Section>

      <div data-slot="form-actions" className="flex items-center justify-end gap-3">
        <SubmitButton>{alert ? 'Guardar alerta' : 'Crear alerta'}</SubmitButton>
      </div>
    </ActionForm>
  );
}
