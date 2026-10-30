/**
 * "Redes y web" on the home page: the latest Apify runs in one card. The
 * page starts `loadSocialPulse()` alongside its own reads and renders the card
 * in a Suspense boundary, so a slow or failing Apify never holds the page.
 */
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ArrowRight, ArrowUpRight, Globe2 } from 'lucide-react';
import { loadLatest } from '@/app/(dashboard)/redes/data';
import { PlatformIcon } from '@/components/platform-icon';
import { EmptyState, LinkButton } from '@/components/ui';
import { Card as ShadcnCard, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { compact, timeAgo } from '@/lib/format';
import { platformLabel, rateLabel } from '@/lib/scraping/highlights';
import type { ScrapeMetrics } from '@/lib/scraping/metrics';
import { SOURCE_KEYS, interactions } from '@/lib/scraping/sources';

export type SocialPulse = { metrics: ScrapeMetrics; runs: number; updatedAt: string | null } | null;

/** The latest finished run of every source; null when Apify could not be read. Never rejects. */
export async function loadSocialPulse(): Promise<SocialPulse> {
  try {
    const { runs, metrics } = await loadLatest(SOURCE_KEYS, 1);
    return { metrics, runs: runs.length, updatedAt: runs[0]?.finishedAt ?? runs[0]?.startedAt ?? null };
  } catch (error) {
    console.error('No se pudieron leer las recolecciones para el inicio', error);
    return null;
  }
}

function Shell({ updatedAt, children }: { updatedAt?: string | null; children: ReactNode }) {
  return (
    <ShadcnCard className="min-w-0">
      <CardHeader className="border-b border-border/60 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold"><Globe2 aria-hidden className="size-4 text-primary" />Redes y web</CardTitle>
        <CardDescription className="text-xs">Últimas recolecciones{updatedAt ? ` · actualizado ${timeAgo(updatedAt)}` : ''}.</CardDescription>
        <CardAction>
          <Link href="/redes" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
            Ver detalle <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-1">{children}</CardContent>
    </ShadcnCard>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-xl font-semibold tracking-tight tabular-nums">{value}</dd>
    </div>
  );
}

export async function SocialPulseCard({ pulse }: { pulse: Promise<SocialPulse> }) {
  const data = await pulse;
  if (!data) {
    return (
      <Shell>
        <p className="py-2 text-xs text-muted-foreground">No pudimos leer las recolecciones en este momento. El resto del inicio no se ve afectado.</p>
      </Shell>
    );
  }
  if (!data.runs) {
    return (
      <Shell>
        <EmptyState compact icon={Globe2} title="Aún no hay recolecciones terminadas" action={<LinkButton href="/redes" variant="secondary" size="sm">Abrir Redes y web</LinkButton>}>
          Recolecta cuentas, hashtags o búsquedas para ver aquí publicaciones, interacción y la publicación destacada.
        </EmptyState>
      </Shell>
    );
  }

  const { totals: t, platforms, hashtags, topPosts } = data.metrics;
  const lead = platforms[0];
  const tag = hashtags[0];
  const best = topPosts[0];

  return (
    <Shell updatedAt={data.updatedAt}>
      <div className="grid gap-5 pt-3 @3xl/home:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @3xl/home:gap-8">
        <div className="min-w-0 space-y-4">
          <dl className="grid grid-cols-3 gap-3">
            <Figure label="Publicaciones" value={compact(t.posts)} />
            <Figure label="Interacciones" value={compact(t.interactions)} />
            <Figure label="Tasa de interacción" value={rateLabel(t.engagementRate)} />
          </dl>
          <ul className="space-y-2 border-t border-border/60 pt-3">
            <li className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Red con más interacción</span>
              {lead ? (
                <span className="flex min-w-0 items-center gap-1.5 font-medium"><PlatformIcon platform={lead.platform} /><span className="truncate">{platformLabel(lead.platform)}</span><span className="shrink-0 tabular-nums text-muted-foreground">{compact(lead.interactions)}</span></span>
              ) : <span className="text-muted-foreground">Sin datos</span>}
            </li>
            <li className="flex items-center justify-between gap-2 text-xs">
              <span className="text-muted-foreground">Hashtag principal</span>
              {tag ? (
                <span className="flex min-w-0 items-center gap-1.5 font-medium"><span className="truncate">{tag.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{compact(tag.value)} usos</span></span>
              ) : <span className="text-muted-foreground">Sin hashtags</span>}
            </li>
          </ul>
        </div>

        <div className="min-w-0 rounded-xl border border-border/70 bg-background/75 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">Publicación destacada</p>
          {best ? (
            <>
              <div className="mt-2 flex min-w-0 items-center gap-1.5">
                <PlatformIcon platform={best.platform} />
                <p className="truncate text-xs font-semibold">{best.author ?? platformLabel(best.platform)}</p>
              </div>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-foreground/85">{best.title || best.text || 'Sin texto'}</p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                <span className="tabular-nums">{compact(interactions(best))} interacciones</span>
                {best.views ? <span className="tabular-nums">{compact(best.views)} vistas</span> : null}
                {best.url ? (
                  <a href={best.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-medium text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                    Ver publicación <ArrowUpRight aria-hidden className="size-3" />
                  </a>
                ) : null}
              </div>
            </>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">Las últimas recolecciones no trajeron publicaciones de redes.</p>
          )}
        </div>
      </div>
    </Shell>
  );
}

/** The card's shape while Apify answers. */
export function SocialPulseSkeleton() {
  return (
    <Shell>
      <div aria-busy="true" aria-label="Cargando redes y web" className="grid gap-5 pt-3 @3xl/home:grid-cols-2 @3xl/home:gap-8">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }, (_, i) => <div key={i} className="grid gap-1.5"><Skeleton className="h-3 w-20" /><Skeleton className="h-6 w-14" /></div>)}
          </div>
          <div className="space-y-2 border-t border-border/60 pt-3"><Skeleton className="h-4" /><Skeleton className="h-4" /></div>
        </div>
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </Shell>
  );
}
