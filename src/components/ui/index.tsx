/**
 * The dashboard's kit: shadcn/ui components (the other files in this folder,
 * add more with `npx shadcn add <name>`) composed into the few shapes every
 * page repeats. Server-rendered; interactive pieces live in client.tsx,
 * form controls in form-controls.tsx, charts in components/charts.tsx.
 * The shapes follow Inerpy's design system (DESIGN.md): page header, KPI
 * strip, chart cards, data-view tables. Restyling the app is editing the
 * theme in globals.css, or these.
 */
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { ArrowLeft, ChevronLeft, ChevronRight, CircleAlert, Inbox, Info, TriangleAlert, type LucideIcon } from 'lucide-react';
import { Alert, AlertAction, AlertDescription, AlertTitle } from './alert';
import { Badge as ShadcnBadge } from './badge';
import { Kbd } from './kbd';
import { buttonVariants } from './button-variants';
import { Card as ShadcnCard, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { LinkToggle } from './client';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './empty';
import { Field as ShadcnField, FieldDescription, FieldLabel, FieldTitle } from './field';
import { FormSelect, type SelectOption } from './form-select';
import { Input as ShadcnInput } from './input';
import { Table as ShadcnTable, TableBody, TableHead, TableHeader, TableRow } from './table';
import { Textarea as ShadcnTextarea } from './textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';
import { Sparkline } from '../charts';
import { InfoTip } from '../info-tip';

export { BarList, LineChart, Sparkline, StackedBars } from '../charts';
export { CHART_COLORS, OTHER_COLOR, SENTIMENT_COLORS } from '@/lib/chart-colors';
export { TableCell, TableRow } from './table';
export { Checkbox, CheckboxGroup, Combobox, DatePicker, DateTimePicker, MultiSelect, PlatformPicker, Segmented, SwitchRow, TokenInput } from './form-controls';

/** Class names, later ones winning: shadcn's `cn` under its older name here. */
export const cx = cn;

/** Status meaning only, never decoration (Inerpy's tones). */
export const TONE_TEXT = {
  default: 'text-foreground',
  positive: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-500',
  negative: 'text-rose-600 dark:text-rose-400',
} as const;
export type KpiTone = keyof typeof TONE_TEXT;

/** A non-table page's header: one h1 and its description left, the screen's actions right (one primary). */
export function PageHeader({ title, description, actions, back }: { title: ReactNode; description?: ReactNode; actions?: ReactNode; back?: { href: string; label: string } }) {
  return (
    <header className="mb-6 flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between @lg:gap-4">
      <div className="min-w-0">
        {back ? (
          <Link href={back.href} data-slot="back-link" className="mb-2 inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
            <ArrowLeft aria-hidden className="size-3.5" /> {back.label}
          </Link>
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-pretty text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2 @lg:justify-end">{actions}</div> : null}
    </header>
  );
}

/**
 * A table view (Inerpy's data-view): no visible title (an sr-only h1), the
 * toolbar (UrlFilters) left and the screen's CTAs right on one row, an
 * optional one-line notice, then a full-bleed frame with the table and the
 * pager. Lists of records use this instead of PageHeader.
 */
export function DataView({ title, toolbar, actions, notice, children }: { title: string; toolbar?: ReactNode; actions?: ReactNode; notice?: ReactNode; children: ReactNode }) {
  return (
    <section data-slot="data-view" aria-label={title} className="flex min-h-0 flex-1 flex-col">
      <h1 className="sr-only">{title}</h1>
      <div className="flex flex-col gap-2 px-(--page-gutter) py-3 @2xl:flex-row @2xl:items-start @2xl:justify-between @2xl:gap-3">
        <div className="min-w-0 flex-1">{toolbar}</div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2 @max-2xl:*:flex-1">{actions}</div> : null}
      </div>
      {notice ? <p className="-mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-(--page-gutter) pb-2 text-xs text-pretty text-muted-foreground">{notice}</p> : null}
      <div data-slot="data-view-frame" className="flex min-h-0 flex-1 flex-col border-t">{children}</div>
    </section>
  );
}

/** A dashboard section's title: an icon tile, an h2 and a line under it; `aside` sits right (a range, a link). */
export function SectionHeading({ icon: Icon, title, description, aside, id }: { icon?: LucideIcon; title: ReactNode; description?: ReactNode; aside?: ReactNode; id?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {Icon ? (
          <span aria-hidden className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Icon className="size-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 id={id} className="text-sm leading-7 font-semibold">{title}</h2>
          {description ? <p className="text-xs text-pretty text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {aside ? <div className="shrink-0 text-xs text-muted-foreground">{aside}</div> : null}
    </div>
  );
}

/** A chart with nothing to draw: the card stays, the grid never collapses. */
export function ChartEmpty({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[220px] flex-1 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-balance text-muted-foreground">{children}</div>;
}

/**
 * A card (Inerpy's chart card): title with an optional `hint` (what it
 * measures and where it comes from), a description, actions right. `index`
 * staggers its entrance in a grid (45ms each, only with motion allowed).
 */
export function Card({ title, description, actions, hint, index, children, className }: { title?: ReactNode; description?: ReactNode; actions?: ReactNode; hint?: string; index?: number; children?: ReactNode; className?: string }) {
  return (
    <ShadcnCard
      className={cn('min-w-0', index !== undefined && 'fill-mode-both duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2', className)}
      style={index ? { animationDelay: `${index * 45}ms` } : undefined}
    >
      {title || actions ? (
        <CardHeader>
          {title ? (
            <CardTitle className="flex min-w-0 items-center gap-1 text-base font-semibold">
              <span className="min-w-0 truncate">{title}</span>
              {hint ? <InfoTip text={hint} /> : null}
            </CardTitle>
          ) : null}
          {description ? <CardDescription className="text-xs text-pretty sm:text-sm">{description}</CardDescription> : null}
          {actions ? <CardAction className="text-xs">{actions}</CardAction> : null}
        </CardHeader>
      ) : null}
      <CardContent className="min-w-0 flex-1">{children}</CardContent>
    </ShadcnCard>
  );
}

/**
 * The KPI strip (Inerpy's): ONE divided container of tiles, never a row of
 * cards. Put `Stat`s in it; tiles enter staggered (globals.css).
 */
export function KpiStrip({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <section
      data-slot="kpi-strip"
      aria-label={label}
      className={cn(
        'grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs @xl:grid-cols-3 @4xl:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] @max-xl:[&>*:last-child:nth-child(odd)]:col-span-2',
        className,
      )}
    >
      {children}
    </section>
  );
}

/**
 * A KPI tile: an uppercase label, the value (colored by `tone`, or by the
 * change when `delta` is given), the change in percent, a sparkline
 * (aria-hidden: the value carries the data), a detail line. With `href`
 * the whole tile opens the list behind the number.
 */
export function Stat({ label, value, hint, href, delta, spark, invert = false, tone }: { label: ReactNode; value: ReactNode; hint?: ReactNode; href?: string; delta?: number | null; spark?: number[]; invert?: boolean; tone?: KpiTone }) {
  const good = delta === null || delta === undefined ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <div
      data-slot="kpi-tile"
      className={cn(
        'relative flex min-w-0 flex-col gap-0.5 bg-card px-3.5 py-3 fill-mode-both duration-300 ease-out motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1',
        href && 'transition-colors hover:bg-muted/40',
      )}
    >
      <div className="flex min-w-0 items-center justify-between gap-1">
        <span className="min-w-0 truncate text-[11px] font-medium tracking-wide text-muted-foreground uppercase">{label}</span>
        {delta === null || delta === undefined ? null : (
          <span title="Cambio frente al periodo anterior" className={cn('shrink-0 text-[11px] font-semibold tabular-nums', good ? TONE_TEXT.positive : TONE_TEXT.negative)}>
            {delta > 0 ? '+' : ''}
            {Math.round(delta)}%
          </span>
        )}
      </div>
      <div className="flex min-w-0 items-end justify-between gap-2">
        <span className={cn('min-w-0 truncate text-xl leading-tight font-semibold tracking-tight tabular-nums', TONE_TEXT[tone ?? 'default'])}>{value}</span>
        {spark && spark.length > 1 ? <Sparkline values={spark} tone={good === false ? 'bad' : 'accent'} className="h-[22px] w-16" /> : null}
      </div>
      {hint ? <span className="truncate text-[11px] text-muted-foreground tabular-nums">{hint}</span> : null}
      {href ? <Link href={href} aria-label={`Ver detalles de ${typeof label === 'string' ? label : 'esta métrica'}`} className="absolute inset-0 z-10 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none focus-visible:ring-inset" /> : null}
    </div>
  );
}

/** Badge tones over shadcn's Badge. */
const TONES = {
  neutral: 'bg-secondary text-secondary-foreground',
  accent: 'bg-brand-soft text-primary',
  solid: '',
  good: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  warn: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  bad: '',
  outline: '',
} as const;
export type Tone = keyof typeof TONES;
const BADGE_VARIANT = { solid: 'default', bad: 'destructive', outline: 'outline' } as const;

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const variant = tone in BADGE_VARIANT ? BADGE_VARIANT[tone as keyof typeof BADGE_VARIANT] : 'secondary';
  return <ShadcnBadge variant={variant} className={cn(TONES[tone], className)}>{children}</ShadcnBadge>;
}

/**
 * A filter in a list row, kept to one line: the first `max` conditions as
 * badges, then "+N more" with every condition in a tooltip.
 */
export function Conditions({ conditions, max = 2, empty = 'Todo' }: { conditions: string[]; max?: number; empty?: string }) {
  if (conditions.length === 0) return <span className="text-xs text-muted-foreground">{empty}</span>;
  const rest = conditions.length - max;
  return (
    <span className="flex max-w-full flex-wrap items-center gap-1">
      {conditions.slice(0, max).map((c, i) => (
        <Badge key={`${c}-${i}`} tone="outline" className="max-w-56 justify-start font-normal"><span className="truncate">{c}</span></Badge>
      ))}
      {rest > 0 ? (
        <Tooltip>
          <TooltipTrigger render={<span className="cursor-default" />}>
            <Badge tone="neutral" className="font-normal">+{rest} más</Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <ul className="space-y-0.5">
              {conditions.map((c, i) => <li key={`${c}-${i}`}>{c}</li>)}
            </ul>
          </TooltipContent>
        </Tooltip>
      ) : null}
    </span>
  );
}

export const sentimentTone = (s?: string | null): Tone => (s === 'positive' ? 'good' : s === 'negative' ? 'bad' : 'neutral');

/** The kit's button names, mapped onto shadcn's Button variants. */
const VARIANTS = { primary: 'default', secondary: 'outline', danger: 'destructive', ghost: 'ghost' } as const;
export type ButtonVariant = keyof typeof VARIANTS;
/** shadcn's button look for a link or an <a> (a server component cannot render the client Button with an href). */
export const buttonClass = (variant: ButtonVariant = 'secondary', size: 'sm' | 'md' = 'md', className?: string) =>
  buttonVariants({ variant: VARIANTS[variant], size: size === 'sm' ? 'sm' : 'default', className });

export function LinkButton({ href, variant = 'secondary', size = 'md', children, className, create = false, ...rest }: { href: string; variant?: ButtonVariant; size?: 'sm' | 'md'; children: ReactNode; className?: string; /** The page's create action: pressed by the C shortcut, which it shows. */ create?: boolean } & Omit<ComponentProps<typeof Link>, 'href' | 'className'>) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)} data-create={create ? '' : undefined} {...rest}>
      {children}
      {create ? <Kbd className="ml-1 hidden bg-primary-foreground/20 text-current md:inline-flex">C</Kbd> : null}
    </Link>
  );
}

/** shadcn's Empty, laid out like Zernio's: an icon in a circle, a title, a line of help, one action. */
export function EmptyState({ title, children, icon: Icon = Inbox, action, example, compact = false, className }: { title: ReactNode; children?: ReactNode; icon?: LucideIcon; action?: ReactNode; example?: ReactNode; compact?: boolean; className?: string }) {
  return (
    <Empty className={cn('rounded-xl border border-dashed bg-card', compact ? 'py-5' : 'py-12', className)}>
      <EmptyHeader>
        <EmptyMedia className={cn('mb-3 flex items-center justify-center rounded-xl border bg-muted/50 shadow-xs', compact ? 'size-10' : 'size-12')}>
          <Icon aria-hidden className={cn('text-muted-foreground', compact ? 'size-5' : 'size-6')} />
        </EmptyMedia>
        <EmptyTitle className={cn('font-medium', compact ? 'text-sm' : 'text-base')}>{title}</EmptyTitle>
        {children ? <EmptyDescription className="max-w-sm text-sm text-balance">{children}</EmptyDescription> : null}
        {example ? <p className="max-w-sm text-xs text-muted-foreground"><span className="font-medium text-foreground">Ejemplo de campaña:</span> {example}</p> : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}

/** A message in the page: shadcn's Alert. */
export function Notice({ tone = 'info', title, children, action, className }: { tone?: 'info' | 'warn' | 'bad'; title?: ReactNode; children?: ReactNode; action?: ReactNode; className?: string }) {
  const Icon = tone === 'bad' ? CircleAlert : tone === 'warn' ? TriangleAlert : Info;
  return (
    <Alert variant={tone === 'bad' ? 'destructive' : 'default'} className={cn('px-4 py-3', tone === 'warn' && 'border-amber-300 bg-amber-50/60 text-amber-900 *:data-[slot=alert-description]:text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200 dark:*:data-[slot=alert-description]:text-amber-300/90', className)}>
      <Icon />
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children ? <AlertDescription>{children}</AlertDescription> : null}
      {action ? <AlertAction>{action}</AlertAction> : null}
    </Alert>
  );
}

/**
 * A labelled form row: shadcn's Field. The label wraps a single control so a
 * click focuses it; `group` is for a set of controls with labels of their
 * own (a CheckboxGroup), which a label must not wrap.
 */
export function Field({ label, hint, children, className, group = false }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; group?: boolean }) {
  return (
    <ShadcnField className={cn('gap-1.5', className)} role={group ? 'group' : undefined}>
      {group ? (
        <>
          <FieldTitle>{label}</FieldTitle>
          {children}
        </>
      ) : (
        <FieldLabel className="flex-col items-stretch gap-1.5 *:first:font-medium">
          <span>{label}</span>
          {children}
        </FieldLabel>
      )}
      {hint ? <FieldDescription className="text-xs">{hint}</FieldDescription> : null}
    </ShadcnField>
  );
}

export function Input(props: ComponentProps<'input'>) {
  return <ShadcnInput {...props} className={cn('bg-background font-normal', props.className)} />;
}

export function Textarea(props: ComponentProps<'textarea'>) {
  return <ShadcnTextarea rows={4} {...props} className={cn('bg-background font-normal', props.className)} />;
}

/** A select for forms (shadcn, submits under `name`); `placeholder` is the empty choice. */
export function Select({ options, placeholder, name, defaultValue, className, required, disabled, id, 'aria-label': ariaLabel }: {
  options: ReadonlyArray<SelectOption>;
  placeholder?: string;
  name?: string;
  defaultValue?: string | number | readonly string[];
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
  'aria-label'?: string;
}) {
  return <FormSelect name={name} options={options} placeholder={placeholder} defaultValue={defaultValue} className={cn('font-normal', className)} required={required} disabled={disabled} id={id} aria-label={ariaLabel} />;
}

/**
 * A data table (shadcn's) in a card: pass header labels and rows of cells.
 * A row's main link carries `data-row-link` and `rowLink`, which stretch it
 * over the whole row, so a click anywhere opens the record (a drawer); the
 * row's other links, buttons and forms stay clickable above it.
 */
export const rowLink = 'after:absolute after:inset-0';
const ROW_CLICK =
  '[&_tbody_tr]:relative [&_tbody_tr:has([data-row-link])]:cursor-pointer [&_td_a:not([data-row-link])]:relative [&_td_a:not([data-row-link])]:z-10 [&_td_button]:relative [&_td_button]:z-10 [&_td_form]:relative [&_td_form]:z-10';

/** Inerpy's grid: a muted 36px head, 44px rows, hairlines between columns, a soft hover. */
export const GRID =
  '[&_th]:h-9 [&_th]:bg-muted [&_th]:px-3 [&_th]:text-xs [&_th]:font-medium [&_th]:text-muted-foreground [&_th:not(:last-child)]:border-e [&_td:not(:last-child)]:border-e [&_th:first-child]:ps-4 [&_tbody_tr]:transition-colors [&_tbody_tr:hover]:bg-muted/40';

export function Table({ head, children, empty }: { head: ReactNode[]; children: ReactNode; empty?: ReactNode }) {
  return (
    <div data-slot="table-frame" className={cn('overflow-hidden rounded-xl border bg-card shadow-xs', ROW_CLICK, GRID)}>
      <ShadcnTable>
        <TableHeader>
          <TableRow>{head.map((h, i) => <TableHead key={i}>{h}</TableHead>)}</TableRow>
        </TableHeader>
        <TableBody>{children}</TableBody>
      </ShadcnTable>
      {empty}
    </div>
  );
}
export const td = 'h-11 px-3 py-2 align-middle whitespace-normal first:ps-4 last:pe-4';

/** The list's foot (Inerpy's pager): the range shown and of how many, previous/next on the right. */
export function OffsetPager({ total, limit, offset, href }: { total: number; limit: number; offset: number; href: (offset: number) => string }) {
  if (total === 0) return null;
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;
  const disabled = 'pointer-events-none opacity-50';
  return (
    <nav aria-label="Paginación" data-slot="pager" className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <span className="tabular-nums" role="status">
        {total <= limit ? `${total} en total` : `${offset + 1}–${Math.min(offset + limit, total)} de ${total}`}
      </span>
      {total > limit ? (
        <div className="flex gap-2">
          {hasPrev ? (
            <LinkButton href={href(Math.max(0, offset - limit))} size="sm" className="pressable" aria-label="Página anterior"><ChevronLeft aria-hidden /> Anterior</LinkButton>
          ) : (
            <span aria-disabled="true" className={buttonClass('secondary', 'sm', disabled)}><ChevronLeft aria-hidden /> Anterior</span>
          )}
          {hasNext ? (
            <LinkButton href={href(offset + limit)} size="sm" className="pressable" aria-label="Página siguiente">Siguiente <ChevronRight aria-hidden /></LinkButton>
          ) : (
            <span aria-disabled="true" className={buttonClass('secondary', 'sm', disabled)}>Siguiente <ChevronRight aria-hidden /></span>
          )}
        </div>
      ) : null}
    </nav>
  );
}

/** A window switch (7d, 30d, ...): shadcn's ToggleGroup, each choice a link that keeps the rest of the URL. */
export function RangeLinks({ current, options, href }: { current: string; options: readonly string[]; href: (value: string) => string }) {
  return <LinkToggle current={current} items={options.map((value) => ({ value, label: value, href: href(value) }))} />;
}
