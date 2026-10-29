/**
 * A record or "new" page opened as a full page while it loads: the page
 * header (back link, title, actions), an optional KPI strip and the body's
 * cards at their real sizes, so the list's skeleton never stands in for it.
 * In a drawer the intercepting route shows `DrawerSkeleton` instead.
 */
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type Layout = 'stack' | 'split' | 'form';

/** A card: its title and line, then a few rows of fields or text. */
function CardSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn('grid gap-4 rounded-xl border bg-card p-4 shadow-xs', className)}>
      <div className="grid gap-1.5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid gap-1.5">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-9 w-full rounded-md" />
        </div>
      ))}
    </div>
  );
}

/**
 * `layout`: `stack` is a column of cards, `split` the main column and a side
 * one (a mention, a person), `form` a narrow create form (max-w-3xl) with
 * Save in its footer. `stats` is the number of KPI tiles under the header;
 * `narrow` keeps a stack in the settings column.
 */
export function DetailSkeleton({ layout = 'stack', stats = 0, narrow = false }: { layout?: Layout; stats?: number; narrow?: boolean }) {
  return (
    <div aria-busy="true" aria-label="Cargando" className={cn('grid gap-6', (narrow || layout === 'form') && 'max-w-3xl')}>
      <div className="flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between @lg:gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        {layout === 'form' ? null : (
          <div className="flex gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        )}
      </div>

      {stats > 0 ? (
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border shadow-xs @xl:grid-cols-3 @4xl:grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))]">
          {Array.from({ length: stats }, (_, i) => (
            <div key={i} className="grid gap-2 bg-card px-3.5 py-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : null}

      {layout === 'split' ? (
        <div className="grid gap-6 @4xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="grid content-start gap-6">
            <Skeleton className="h-48 w-full rounded-xl" />
            <CardSkeleton rows={2} />
          </div>
          <div className="grid content-start gap-6">
            <CardSkeleton rows={2} />
            <CardSkeleton rows={3} />
          </div>
        </div>
      ) : layout === 'form' ? (
        <div className="grid gap-4 rounded-xl border bg-card p-4 shadow-xs">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="grid gap-1.5">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
          ))}
          <div className="flex justify-end border-t pt-4">
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        </div>
      ) : (
        <div className="grid gap-6">
          <CardSkeleton rows={3} />
          <CardSkeleton rows={1} />
        </div>
      )}
    </div>
  );
}
