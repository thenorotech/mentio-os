/** Pieces the "Redes y web" pages share: setup notice, run status, the new-scrape drawer. */
import { Plus } from 'lucide-react';
import { Badge, Field, Input, Notice, PlatformPicker, Segmented, TokenInput, type Tone } from '@/components/ui';
import { ActionForm, DrawerButton, SubmitButton } from '@/components/ui/client';
import type { RunStatus } from '@/lib/apify';
import { SOURCE_KEYS, SOURCE_LIST } from '@/lib/scraping/sources';
import { startScrapeAction } from './actions';

export function ApifySetup() {
  return (
    <Notice tone="warn" title="Conecta Apify para recolectar redes y web">
      Crea un token en Apify (Settings › API &amp; Integrations) y agrégalo como <code className="font-mono text-xs">APIFY_TOKEN</code> en <code className="font-mono text-xs">.env.local</code>. El token se queda en el servidor. Con <code className="font-mono text-xs">npm run demo</code> puedes probar con datos de ejemplo.
    </Notice>
  );
}

const STATUS: Record<RunStatus, { label: string; tone: Tone }> = {
  READY: { label: 'En cola', tone: 'neutral' },
  RUNNING: { label: 'Recolectando', tone: 'accent' },
  SUCCEEDED: { label: 'Lista', tone: 'good' },
  FAILED: { label: 'Falló', tone: 'bad' },
  ABORTING: { label: 'Deteniendo', tone: 'warn' },
  ABORTED: { label: 'Detenida', tone: 'neutral' },
  'TIMING-OUT': { label: 'Agotando tiempo', tone: 'warn' },
  'TIMED-OUT': { label: 'Tiempo agotado', tone: 'bad' },
};

export function RunStatusBadge({ status }: { status: RunStatus }) {
  const { label, tone } = STATUS[status];
  const live = status === 'RUNNING' || status === 'READY';
  return (
    <Badge tone={tone} className="gap-1.5">
      {live ? (
        <span className="relative flex size-1.5" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-current" />
        </span>
      ) : null}
      {label}
    </Badge>
  );
}

const SOURCE_LABELS = Object.fromEntries(SOURCE_LIST.map((s) => [s.key, s.label]));

/** The page's create action: one Apify run per chosen source, same targets. */
export function NewScrapeButton({ primary = true }: { primary?: boolean }) {
  return (
    <DrawerButton create={primary} variant={primary ? 'primary' : 'secondary'} label="Nueva recolección" icon={<Plus />} title="Nueva recolección" description="Apify recolecta en segundo plano; los resultados aparecen en el panorama al terminar.">
      <ActionForm action={startScrapeAction} className="grid gap-5">
        <Field label="Fuentes" group hint="Redes por cuenta, hashtag o búsqueda; YouTube por búsqueda o canal; Google y Noticias por búsqueda. Cada fuente es una corrida de Apify.">
          <PlatformPicker name="sources" options={SOURCE_KEYS} defaultValue={['instagram', 'facebook', 'x', 'tiktok']} labels={SOURCE_LABELS} />
        </Field>
        <Field label="Qué recolectar" hint="@cuenta para perfiles, #tema para hashtags, texto para búsquedas, o una URL. Enter agrega cada uno.">
          <TokenInput name="targets" placeholder="@candidata, #seguridad, “propuesta de agua”" max={20} splitOnComma={false} />
        </Field>
        <Field label="Resultados por fuente" hint="Más resultados cuestan más créditos de Apify.">
          <Input name="limit" type="number" min={1} max={500} defaultValue={50} required />
        </Field>
        <Field label="Periodo" group>
          <Segmented
            name="days"
            defaultValue="7"
            options={[
              { value: '1', label: '24 h' },
              { value: '7', label: '7 días' },
              { value: '30', label: '30 días' },
              { value: '0', label: 'Todo', description: 'Sin filtro de fecha: lo más reciente que entregue cada fuente.' },
            ]}
          />
        </Field>
        <div data-slot="form-actions" className="flex justify-end">
          <SubmitButton>Iniciar recolección</SubmitButton>
        </div>
      </ActionForm>
    </DrawerButton>
  );
}
