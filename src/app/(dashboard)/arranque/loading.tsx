import { Skeleton } from '@/components/ui/skeleton';

/** The wizard while it loads: the header, the step list, the step card with its fields and footer. */
export default function LoadingArranque() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="mx-auto grid max-w-3xl">
      <div className="mb-6 grid gap-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4">
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="grid gap-2">
              <Skeleton className="h-1 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton className="size-5 rounded-full" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
        <div className="overflow-hidden rounded-xl border bg-card shadow-xs">
          <div className="grid gap-2 border-b px-4 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-72 max-w-full" />
          </div>
          <div className="grid gap-5 px-4 py-5">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="grid gap-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9" />
              </div>
            ))}
          </div>
          <div className="flex justify-end border-t bg-muted/30 px-4 py-3">
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      </div>
    </div>
  );
}
