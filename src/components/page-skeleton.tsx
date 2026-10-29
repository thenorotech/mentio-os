/**
 * What a page shows while its data loads: the real layout's shapes at fixed
 * sizes (Inerpy's skeletons mirror the view), so nothing jumps on arrival.
 */
import { Skeleton } from '@/components/ui/skeleton';

/** A dashboard while it loads: the header, the KPI strip and the chart grid at their real sizes. */
export function PageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="grid gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-8 w-56 rounded-lg" />
      </div>
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border bg-border @xl:grid-cols-3 @4xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="grid gap-2 bg-card px-3.5 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 @4xl:grid-cols-3">
        <Skeleton className="h-[340px] rounded-xl @4xl:col-span-2" />
        <Skeleton className="h-[340px] rounded-xl" />
      </div>
    </div>
  );
}

/** A table view while it loads (Inerpy's data-view): the toolbar, the full-bleed grid, the pager. */
export function ListSkeleton() {
  return (
    <div data-slot="data-view" aria-busy="true" aria-label="Cargando" className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 px-(--page-gutter) py-3">
        <div className="flex gap-2">
          <Skeleton className="h-8 w-64 max-w-[60vw]" />
          <Skeleton className="h-8 w-20" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex flex-1 flex-col border-t">
        <Skeleton className="h-9 rounded-none" />
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-4 border-b px-(--page-gutter)">
            <Skeleton className="size-5 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** A drawer's body while the record loads: the header, a block of text, a few detail rows. */
export function DrawerSkeleton() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="grid gap-5">
      <div className="flex items-center gap-3 border-b pb-4">
        <Skeleton className="size-9 rounded-full" />
        <div className="grid gap-1.5">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3.5 w-32" />
        </div>
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="grid grid-cols-[90px_1fr] items-center gap-3">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
}
