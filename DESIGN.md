# Ágora Design System

Ágora adopts the **Inerpy design system** (source of truth: `INERPY/Inerpy.com` → `DESIGN.md`): Vercel-inspired restraint on shadcn/ui, Geist, a zinc neutral base and one brand accent. This file is the visual contract for this repo; it maps Inerpy's rules onto Ágora's own processes (server components over the Mentio API, URL filters, route drawers, server actions, Base UI primitives). Architecture and data rules stay in [`AGENTS.md`](./AGENTS.md). When Inerpy's system improves, copy from Inerpy, never from a third repo.

Personality: **Corporate** (an operations panel). No mesh heroes, no scroll-triggered entrances, no decorative motion. Motion explains hierarchy and cause → effect only.

---

## 1. Tokens

| Token | Value | Notes |
| --- | --- | --- |
| Font | Geist Sans / Geist Mono | `layout.tsx` → `--font-geist`; mono only for IDs, code, kbd |
| Neutrals | shadcn **zinc** (oklch hue ≈ 286) | `globals.css` `:root` / `.dark` |
| `--primary` | `brand.config.ts → accent` | the only brand hex; injected as `--brand-accent` on `<html>` |
| `--ring` | `--primary` | focus follows the brand |
| `--radius` | `0.625rem` (10px) | Inerpy default; `rounded-md` controls, `rounded-xl` cards |
| `--chart-1…6` | Inerpy chart palette; `--chart-1` = brand | series colors only through `CHART_COLORS` (`src/lib/chart-colors.ts`) |

Rules: components never hardcode hex; status tone is semantic and dark-aware:

| Tone | Class |
| --- | --- |
| default | `text-foreground` |
| positive | `text-emerald-600 dark:text-emerald-400` |
| warning | `text-amber-600 dark:text-amber-500` |
| negative | `text-rose-600 dark:text-rose-400` |

Exported as `TONE_TEXT` from `src/components/ui/index.tsx`.

## 2. Shell

`(dashboard)/layout.tsx` composes the Inerpy shell:

```
SidebarProvider (.agora-shell, defaultOpen from the `sidebar_state` cookie)
├─ AppSidebar variant="inset" collapsible="icon"
└─ SidebarInset  — rounded canvas: h-[calc(100svh-1rem)], border-border/60, shadow-md
   ├─ SiteHeader — h-10 (h-11 touch), bg-background/90 backdrop-blur: trigger · breadcrumb · ⌘K · theme
   ├─ ShellContent — the ONLY scroll surface (data-slot="shell-content"), re-keyed per route, 180ms fade
   │  └─ div.@container.p-4.md:p-6 — the page
   └─ @drawer
```

- Pages scroll inside the canvas, never the document. Full-height views use `flex min-h-0 flex-1 flex-col`.
- Breadcrumb is derived from `NAV` / `SETTINGS` (`src/lib/nav.ts`); there are no per-page submodule pills.
- Sidebar menu buttons keep a medium radius (never pill), 13px; scrollbars are 4px.
- Chrome buttons press to `scale(0.97)` on fine pointers only.

## 3. Page header (non-table pages)

`PageHeader` = one `h1` (`text-2xl font-semibold tracking-tight`) + optional `text-sm text-muted-foreground` description on the left; CTAs right in `flex flex-wrap items-center justify-end gap-2`. **One primary CTA per screen.** Render the actions column only when there are actions. In a drawer the header becomes the sticky top bar (globals.css `[data-drawer]`).

## 4. Table views (Inerpy data-view)

Every list of records uses `DataView` (`src/components/ui/index.tsx`):

```
<h1 class="sr-only">          ← no visible title, no description, no pills
toolbar  [UrlFilters: search · Filtrar · sort ·········· CTAs]
notice   text-xs muted: counts, scope, what the list means (optional)
frame    border-t, full-bleed, sticky thead (bg-muted h-9), rows h-11, hairline grid
footer   "1–25 de 312"                                   [‹ Anterior][Siguiente ›]
```

- Filters stay the Ágora way: `UrlFilters` writes the URL under the API's parameter names; no Apply buttons, no rows of selects.
- The page's create action is the toolbar's primary button (`create` → the `C` shortcut); it opens a drawer or a "new" page the drawer intercepts.
- Full-bleed means no `Card` around the table, no zebra; hover `bg-muted/40`. Numbers `tabular-nums`; empty values `—`.
- A row's main link carries `data-row-link` + `rowLink` so the whole row opens the record.
- Empty vs empty-filtered are different states (`EmptyState` with "Quitar filtros").

## 5. Dashboards

Recipe (Inerpy `hr/_components/analytics`):

| Zone | Kit |
| --- | --- |
| Header | `PageHeader`, period switch (`RangeLinks` / `LinkToggle`) as the actions |
| KPI strip | `KpiStrip` + `KpiTile`: ONE divided container (`bg-border gap-px rounded-xl border shadow-xs`), 4–8 tiles, label `text-[11px] uppercase tracking-wide`, value `text-xl font-semibold tabular-nums` with `tone`, `detail` line, optional 64×22 sparkline (`aria-hidden`), `hint` (what it measures) |
| Section | `SectionHeading` (icon tile `size-7 bg-muted rounded-md` + `h2 text-sm font-semibold` + `text-xs` subtitle); sections `gap-6`, cards `gap-4` |
| Grid | `grid gap-4 @4xl:grid-cols-3`, main chart `@4xl:col-span-2`; never leave a hole |
| Chart card | `Card` with `title`, `description`, `hint`, `index` (stagger) |
| Empty chart | `ChartEmpty`: `min-h-[220px] border-dashed`, keep the card |
| Error | `Notice tone="bad"` with a retry |

Charts stay on the existing recharts wrapper (`src/components/charts.tsx`, `src/components/ui/chart.tsx`) — Ágora has no visx/bklit; do not add a second chart library. Colors come from `--chart-*`.

## 6. Overlays and forms

Unchanged Ágora processes, Inerpy finish: drawers are floating sheets inset 8px, `rounded-xl`, sticky header and footer; confirmations through `SubmitButton confirm`; results as Sonner toasts; settings are `max-w-3xl` columns of `FormCard`s. Inputs `h-9`, focus `ring-ring/50 ring-[3px]`, invalid via `aria-invalid`.

## 7. Motion

- CSS only (Ágora has no `motion` package): `tw-animate-css` utilities and `@starting-style`.
- Route fade `shell-context-enter` 180ms; card/tile entrance `motion-safe:animate-in fade-in slide-in-from-bottom-1|2 fill-mode-both duration-300`, delay `index × 35ms` (tiles) / `× 45ms` (cards).
- `.pressable` → `scale(0.97)` on `:active`.
- Animate only `transform` / `opacity`; every effect honors `prefers-reduced-motion`. No counters, no chart re-animation on refetch.

## 8. Accessibility

- One `h1` per view (sr-only on table views); landmarks: `nav` (sidebar, breadcrumb), one `main` (the canvas).
- Every icon-only button has `aria-label` (+ tooltip); decorative icons `aria-hidden`.
- Focus is always visible (`ring-[3px] ring-ring/50`); touch targets ≥ 36px in chrome, rows 44px.
- Color never carries meaning alone: tones pair with a sign (`+12%`) or a label.
- Loading regions `aria-busy`; skeletons mirror the real layout.

## 9. Don'ts

- No hex in components (brand → `brand.config.ts`, series → `--chart-*`).
- No visible title, `Card` wrapper or filter row on a table view.
- No `rounded-full` primary CTAs (pills are for status badges).
- No `100vh` math inside the shell; no nested `<main>`.
- No new animation, chart or table library.
