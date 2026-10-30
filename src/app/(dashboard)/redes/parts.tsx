/** Pieces the "Redes y web" pages share: setup notice, run status, the new-scrape drawer. */
import { Plus } from 'lucide-react';
import { Badge, Field, Input, Notice, PlatformPicker, Segmented, TokenInput, type Tone } from '@/components/ui';
import { ActionForm, DrawerButton, SubmitButton } from '@/components/ui/client';
import type { RunStatus } from '@/lib/apify';
import { SOURCE_KEYS, SOURCE_LIST, type SourceKey } from '@/lib/scraping/sources';
import { entity } from '@/entity.config';
import { startScrapeAction } from './actions';

export function ApifySetup() {
  return (
    <Notice tone="warn" title="La recolección de redes y web no está activa">
      Falta la credencial de recolección en el servidor. Pide al administrador que la configure.
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

type ScrapePreset = { label?: string; sources?: readonly SourceKey[]; targets?: readonly string[]; placeholder?: string };

/** The page's create action: one Apify run per chosen source, same targets, prefilled with the entity's post searches. A preset opens it for profiles or events (the setup guide). */
export function NewScrapeButton({ primary = true, preset = {} }: { primary?: boolean; preset?: ScrapePreset }) {
  const label = preset.label ?? 'Nueva recolección';
  return (
    <DrawerButton create={primary} variant={primary ? 'primary' : 'secondary'} label={label} icon={<Plus />} title={label} description="Ágora recolecta en segundo plano; los resultados aparecen en el panorama al terminar.">
      <ActionForm action={startScrapeAction} className="grid gap-5">
        <Field label="Fuentes" group hint="Redes por cuenta, hashtag o búsqueda; YouTube por búsqueda o canal; Google y Noticias por búsqueda. Cada fuente es una recolección.">
          <PlatformPicker name="sources" options={SOURCE_KEYS} defaultValue={preset.sources ?? ['x', 'tiktok', 'instagram', 'youtube', 'news']} labels={SOURCE_LABELS} />
        </Field>
        <Field label="Qué recolectar" hint="@cuenta para perfiles, #tema para hashtags, texto para búsquedas, o una URL. Enter agrega cada uno.">
          <TokenInput name="targets" defaultValue={preset.targets ?? entity.searches} placeholder={preset.placeholder ?? '#PuentesFronterizos, “Puente Zaragoza”, @cuenta'} max={20} splitOnComma={false} />
        </Field>
        <Field label="Resultados por objetivo" hint="Por cada cuenta, hashtag o búsqueda, en cada fuente. Más resultados tardan más.">
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
