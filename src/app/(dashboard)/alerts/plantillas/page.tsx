import { ArrowRight, BellRing, CalendarClock, GitCompareArrows, Info, Plus, Radio } from 'lucide-react';
import type { Channel } from '@mentio-dev/sdk';
import { Badge, Field, LinkButton, Notice, PageHeader, Select, cx } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { mentio, unwrap } from '@/lib/mentio';
import { createTemplateAlertAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Plantillas de alerta' };

const CHANNEL_KIND: Record<Channel['kind'], string> = { slack: 'Slack', email: 'Correo', webhook: 'Webhook', telegram: 'Telegram' };

type TemplateProps = {
  id: 'crisis' | 'daily' | 'competitors';
  title: string;
  description: string;
  detail: string;
  icon: typeof BellRing;
  channels: Channel[];
  hasCompetitors?: boolean;
  /** Position in the gallery: staggers the entrance (45ms each, only with motion allowed). */
  index: number;
};

/**
 * A template in the gallery: what it does, how it is sent and, in the
 * footer, its one action (use it with a channel, or the step it is missing).
 */
function TemplateCard({ id, title, description, detail, icon: Icon, channels, hasCompetitors = true, index }: TemplateProps) {
  const titleId = `template-${id}-title`;
  return (
    <Card
      aria-labelledby={titleId}
      role="article"
      className={cx(
        'h-full gap-0 py-0 transition-colors hover:border-foreground/20',
        'fill-mode-both duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2',
      )}
      style={index ? { animationDelay: `${index * 45}ms` } : undefined}
    >
      <CardHeader className="gap-3 pt-4">
        <div className="flex items-start justify-between gap-3">
          <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-primary">
            <Icon className="size-4.5" />
          </span>
          <Badge tone="outline" className="font-normal">{id === 'daily' ? 'Diaria · 8:00 a. m.' : 'Inmediata'}</Badge>
        </div>
        <div className="grid gap-1">
          <h2 id={titleId} className="text-sm font-semibold">{title}</h2>
          <p className="text-sm text-pretty text-muted-foreground">{description}</p>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pt-3 pb-4">
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-xs leading-relaxed text-pretty text-muted-foreground">
          <Info aria-hidden className="mt-0.5 size-3.5 shrink-0" />
          {detail}
        </p>
      </CardContent>
      <CardFooter className="bg-muted/30 py-3">
        {channels.length === 0 ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Radio aria-hidden className="size-3.5 shrink-0" />
            Disponible cuando conectes un canal.
          </p>
        ) : id === 'competitors' && !hasCompetitors ? (
          <div className="grid w-full gap-2">
            <p className="text-xs text-muted-foreground">Primero registra a quién quieres comparar.</p>
            <LinkButton href="/arranque" variant="secondary" size="sm" className="justify-self-start">
              Agregar adversarios <ArrowRight aria-hidden="true" />
            </LinkButton>
          </div>
        ) : (
          <ActionForm action={createTemplateAlertAction} className="grid w-full gap-3">
            <input type="hidden" name="template" value={id} />
            <Field label="Canal de envío">
              <Select
                name="channelId"
                required
                placeholder="Elige un canal"
                options={channels.map((channel) => [channel.id, `${channel.label} · ${CHANNEL_KIND[channel.kind]}`] as const)}
              />
            </Field>
            <div className="flex justify-end">
              <SubmitButton size="sm">Usar esta plantilla</SubmitButton>
            </div>
          </ActionForm>
        )}
      </CardFooter>
    </Card>
  );
}

export default async function AlertTemplates() {
  const [channelResponse, competitorResponse] = await Promise.all([
    mentio().listChannels().then(unwrap),
    mentio().listKeywords({ query: { kind: ['competitor'] } }).then(unwrap),
  ]);
  const channels = channelResponse.data;
  const hasCompetitors = competitorResponse.data.length > 0;

  return (
    <div>
      <PageHeader
        title="Plantillas de alerta"
        description="Elige una regla lista para usar y el canal donde quieres recibirla. Podrás ajustarla después."
        back={{ href: '/alerts', label: 'Alertas' }}
        actions={channels.length > 0 ? <LinkButton href="/channels/new" variant="secondary"><Plus aria-hidden="true" /> Crear canal</LinkButton> : undefined}
      />
      {channels.length === 0 ? (
        <Notice
          className="mb-4"
          tone="warn"
          title="Aún no hay canales conectados"
          action={<LinkButton href="/channels/new" variant="primary" size="sm"><Plus aria-hidden="true" /> Crear canal</LinkButton>}
        >
          Las alertas llegan por Slack, correo, Telegram o webhook. Conecta uno y podrás usar cualquiera de estas plantillas.
        </Notice>
      ) : null}
      <section aria-label="Plantillas disponibles" className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        <TemplateCard
          id="crisis"
          index={0}
          title="Avísame si hay crisis"
          description="Recibe un aviso inmediato por cada mención clasificada como negativa."
          detail="Usa el filtro de sentimiento negativo; el semáforo del tablero resume el estado general."
          icon={BellRing}
          channels={channels}
        />
        <TemplateCard
          id="daily"
          index={1}
          title="Resumen diario a las 8am"
          description="Un resumen cada día con las menciones relevantes que coincidan."
          detail="Se envía a las 8:00 a. m., hora de Chihuahua. Si no hay menciones, no se envía un mensaje vacío."
          icon={CalendarClock}
          channels={channels}
        />
        <TemplateCard
          id="competitors"
          index={2}
          title="Menciones de adversarios"
          description="Recibe menciones que coincidan con los nombres registrados como adversarios."
          detail="Filtra por los términos de tus adversarios; no exige que la misma publicación mencione también a tu candidatura."
          icon={GitCompareArrows}
          channels={channels}
          hasCompetitors={hasCompetitors}
        />
      </section>
    </div>
  );
}
