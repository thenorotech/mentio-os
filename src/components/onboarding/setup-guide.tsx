/**
 * The setup guide: the six things a campaign configures before Ágora tracks
 * it, in order, each with where it lives in the sidebar and its one action.
 * Status comes from `setupProgress` (src/lib/onboarding.ts); this file is
 * copy and layout only.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, Bell, Check, ChevronDown, ChevronRight, Hash, Lock, PlugZap, Swords, UserRound, UsersRound, type LucideIcon } from 'lucide-react';
import { entity } from '@/entity.config';
import { NewScrapeButton } from '@/app/(dashboard)/redes/parts';
import { Badge, LinkButton, cx, type Tone } from '@/components/ui';
import type { SetupSignals, SetupStatus, SetupStep, SetupStepKey } from '@/lib/onboarding';
import { setupProgress } from '@/lib/onboarding';

type StepCopy = {
  title: string;
  icon: LucideIcon;
  summary: string;
  /** Where it is configured: the sidebar path, last segment the control. */
  where: string[];
  how: string[];
  action: (primary: boolean, signals: SetupSignals) => ReactNode;
};

const variant = (primary: boolean) => (primary ? 'primary' : 'secondary');

const STEPS: Record<SetupStepKey, StepCopy> = {
  conexiones: {
    title: 'Conecta las fuentes',
    icon: PlugZap,
    summary: 'El motor de escucha sigue menciones de forma continua; el recolector recorre redes, buscadores y prensa bajo demanda.',
    where: ['Servidor', 'Variables de entorno'],
    how: [
      'La credencial de escucha habilita frases, alertas y análisis.',
      'La credencial de recolección habilita perfiles, hashtags, búsquedas y noticias.',
      'Ambas claves se quedan en el servidor; nadie las escribe en el tablero.',
    ],
    action: () => null,
  },
  candidatura: {
    title: 'Frases de la entidad',
    icon: UserRound,
    summary: 'El nombre oficial, siglas y variantes con los que la gente nombra a la entidad. Cada una es una frase que Ágora rastrea.',
    where: ['Configuración', 'Asistente de arranque'],
    how: [
      'El asistente crea el monitoreo y una frase por nombre o variante.',
      'Después se editan en Monitoreo › Entidad y temas.',
    ],
    action: (primary, s) => (s.brands
      ? <LinkButton href="/keywords" variant={variant(primary)}>Ver frases <ArrowRight /></LinkButton>
      : <LinkButton href="/arranque" variant={variant(primary)} create={primary}>Abrir asistente <ArrowRight /></LinkButton>),
  },
  contraste: {
    title: 'Temas y referentes',
    icon: Swords,
    summary: 'De qué asuntos seguir la conversación y, si quieres, con quién comparar: frases de tema y de referente.',
    where: ['Monitoreo', 'Entidad y temas', 'Nuevo'],
    how: [
      'Tipo “Adversario” para medir participación de voz en Cara a cara.',
      'Tipo “Tema” para el Mapa de temas y los voceros de cada asunto.',
    ],
    action: (primary) => <LinkButton href="/keywords/new" variant={variant(primary)} create={primary}>Agregar frase <ArrowRight /></LinkButton>,
  },
  perfiles: {
    title: 'Perfiles en redes',
    icon: UsersRound,
    summary: 'Las cuentas que Ágora recorre en Instagram, Facebook, X, TikTok y YouTube: la entidad, sus voceros y medios locales.',
    where: ['Redes y web', 'Panorama', 'Nueva recolección'],
    how: [
      'Escribe @cuenta o pega la URL del perfil; cada fuente toma solo lo que acepta.',
      'Cada recolección guarda publicaciones, likes, comentarios y vistas.',
      'Repite la recolección para actualizar el Panorama y la Comparativa.',
    ],
    action: (primary) => (
      <NewScrapeButton
        primary={primary}
        preset={{ label: 'Recolectar perfiles', sources: ['instagram', 'facebook', 'x', 'tiktok', 'youtube'], targets: [], placeholder: '@cuenta_oficial, https://www.facebook.com/…' }}
      />
    ),
  },
  eventos: {
    title: 'Eventos y búsquedas',
    icon: Hash,
    summary: 'Cierres, obras, tarifas o filas en los cruces: hashtags y frases que Ágora busca en redes, buscadores y noticias.',
    where: ['Redes y web', 'Panorama', 'Nueva recolección'],
    how: [
      '#hashtag para redes; texto libre (“Puente Zaragoza”) para Google, Noticias y X.',
      'Elige el periodo (24 h, 7 o 30 días) para acotar el evento.',
      'Consulta cada recolección y expórtala en Redes y web › Recolecciones.',
    ],
    action: (primary) => (
      <NewScrapeButton
        primary={primary}
        preset={{ label: 'Recolectar evento', sources: ['x', 'tiktok', 'google', 'news'], targets: entity.searches, placeholder: '#PuentesFronterizos, “Puente Zaragoza”' }}
      />
    ),
  },
  avisos: {
    title: 'Alertas y canales',
    icon: Bell,
    summary: 'Dónde y cuándo avisarte: un canal (Slack, correo, Telegram, webhook) y alertas de crisis o resumen diario.',
    where: ['Avisos', 'Canales', 'Alertas'],
    how: [
      'Primero un canal: es el destino de cada aviso.',
      'Después una plantilla: crisis o resumen diario.',
    ],
    action: (primary, s) => (s.channels
      ? <LinkButton href="/alerts/plantillas" variant={variant(primary)} create={primary}>Crear alerta <ArrowRight /></LinkButton>
      : <LinkButton href="/channels/new" variant={variant(primary)} create={primary}>Agregar canal <ArrowRight /></LinkButton>),
  },
};

const STATUS: Record<SetupStatus, { label: string; tone: Tone }> = {
  done: { label: 'Listo', tone: 'good' },
  current: { label: 'Siguiente', tone: 'accent' },
  todo: { label: 'Pendiente', tone: 'neutral' },
  blocked: { label: 'Requiere conexión', tone: 'warn' },
};

/** The guide's progress as a ring: the arc animates in from empty once, then stays. */
export function SetupRing({ done, total, size = 44 }: { done: number; total: number; size?: number }) {
  const r = (size - 6) / 2;
  const c = 2 * Math.PI * r;
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }}>
      <svg aria-hidden viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={3} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: c * (1 - done / total), ['--ring-empty' as string]: c }}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none starting:[stroke-dashoffset:var(--ring-empty)]"
        />
      </svg>
      <span className="text-xs font-semibold tabular-nums">{done}/{total}</span>
    </span>
  );
}

function Where({ path }: { path: string[] }) {
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      <span className="sr-only">Dónde se configura: </span>
      {path.map((segment, i) => (
        <span key={segment} className="inline-flex items-center gap-1">
          {i ? <ChevronRight aria-hidden className="size-3 opacity-60" /> : null}
          <span className={cx('rounded-md px-1.5 py-0.5', i === path.length - 1 ? 'bg-muted font-medium text-foreground' : '')}>{segment}</span>
        </span>
      ))}
    </span>
  );
}

function Node({ status, index }: { status: SetupStatus; index: number }) {
  return (
    <span
      aria-hidden
      className={cx(
        'relative z-10 grid size-7 shrink-0 place-items-center rounded-full border bg-card text-xs font-semibold tabular-nums transition-colors',
        status === 'done' && 'border-primary bg-primary text-primary-foreground',
        status === 'current' && 'border-primary text-primary',
        status === 'blocked' && 'text-muted-foreground',
        status === 'todo' && 'text-muted-foreground',
      )}
    >
      {status === 'current' ? <span className="absolute inset-0 animate-ping rounded-full border border-primary/40 motion-reduce:hidden" /> : null}
      {status === 'done' ? <Check className="size-3.5" /> : status === 'blocked' ? <Lock className="size-3" /> : index + 1}
    </span>
  );
}

function StepItem({ step, index, last, signals }: { step: SetupStep; index: number; last: boolean; signals: SetupSignals }) {
  const copy = STEPS[step.key];
  const Icon = copy.icon;
  const current = step.status === 'current';
  const action = step.status === 'blocked' ? null : copy.action(current, signals);
  return (
    <li
      aria-current={current ? 'step' : undefined}
      style={{ animationDelay: `${index * 45}ms` }}
      className="relative grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-300"
    >
      {last ? null : (
        <span aria-hidden className={cx('absolute top-8 bottom-0 left-[0.8125rem] w-px', step.status === 'done' ? 'bg-primary' : 'bg-border')} />
      )}
      <Node status={step.status} index={index} />
      <details open={current} className={cx('group/step mb-3 min-w-0 rounded-xl border transition-colors', current ? 'border-primary/30 bg-card shadow-xs' : 'border-transparent hover:bg-muted/40 open:border-border open:bg-card')}>
        <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-xl px-4 py-3 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          <Icon aria-hidden className={cx('size-4 shrink-0', current ? 'text-primary' : 'text-muted-foreground')} />
          <span className="min-w-0 flex-1 text-sm font-medium">{copy.title}</span>
          <Badge tone={STATUS[step.status].tone}>{STATUS[step.status].label}</Badge>
          <ChevronDown aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform group-open/step:rotate-180 motion-reduce:transition-none" />
          <span className="basis-full ps-7"><Where path={copy.where} /></span>
        </summary>
        <div className="grid gap-4 px-4 pb-4 ps-11">
          <p className="text-sm text-pretty text-muted-foreground">{copy.summary}</p>
          <ul className="grid gap-1.5 text-sm">
            {copy.how.map((line) => (
              <li key={line} className="flex gap-2 text-pretty">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" />
                {line}
              </li>
            ))}
          </ul>
          {step.facts.length || action ? (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
              <span className="flex flex-wrap gap-1.5">
                {step.facts.map((fact) => <Badge key={fact} tone="neutral">{fact}</Badge>)}
              </span>
              {action ? <span className="flex flex-wrap gap-2">{action}</span> : null}
            </div>
          ) : null}
          {step.status === 'blocked' ? (
            <p className="text-xs text-muted-foreground">Completa “{STEPS.conexiones.title}” para habilitar este paso.</p>
          ) : null}
        </div>
      </details>
    </li>
  );
}

/** The whole guide: progress, then every step in order (the next one open). */
export function SetupGuide({ signals }: { signals: SetupSignals }) {
  const { steps, done, total, next, complete } = setupProgress(signals);
  return (
    <section aria-labelledby="setup-guide-title" className="grid gap-5">
      <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 shadow-xs">
        <SetupRing done={done} total={total} />
        <div className="min-w-0 flex-1">
          <h2 id="setup-guide-title" className="text-sm font-semibold">{complete ? 'Todo configurado' : `${done} de ${total} pasos listos`}</h2>
          <p className="text-xs text-pretty text-muted-foreground">
            {complete ? 'Ágora ya escucha frases, recorre perfiles y eventos, y te avisa.' : next ? `Siguiente: ${STEPS[next.key].title}.` : 'Conecta las fuentes para continuar.'}
          </p>
        </div>
        <span aria-hidden className="hidden gap-1 @md:flex">
          {steps.map((s) => <span key={s.key} className={cx('h-1.5 w-5 rounded-full transition-colors', s.status === 'done' ? 'bg-primary' : s.status === 'current' ? 'bg-primary/40' : 'bg-muted')} />)}
        </span>
      </div>
      <ol className="grid">
        {steps.map((step, i) => <StepItem key={step.key} step={step} index={i} last={i === steps.length - 1} signals={signals} />)}
      </ol>
    </section>
  );
}

/** The home's reminder while setup is open: progress and the next step, linking to the guide. */
export function SetupStrip({ signals }: { signals: SetupSignals }) {
  const { done, total, next, complete } = setupProgress(signals);
  if (complete) return null;
  return (
    <Link
      href="/guia"
      className="group flex items-center gap-3.5 rounded-xl border bg-card px-4 py-3 shadow-xs transition-colors hover:border-primary/30 hover:bg-muted/40 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none motion-safe:animate-in motion-safe:fade-in motion-safe:duration-300"
    >
      <SetupRing done={done} total={total} size={36} />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">Termina de configurar tu seguimiento</span>
        <span className="block truncate text-xs text-muted-foreground">{next ? `Siguiente: ${STEPS[next.key].title} · ${STEPS[next.key].where.join(' › ')}` : 'Conecta las fuentes para continuar.'}</span>
      </span>
      <ArrowRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-[color,transform] group-hover:text-primary motion-safe:group-hover:translate-x-0.5" />
    </Link>
  );
}
