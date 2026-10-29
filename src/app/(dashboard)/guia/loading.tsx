import { Skeleton } from '@/components/ui/skeleton';

/** The guide while it loads: header, progress bar and the step rail. */
export default function LoadingGuia() {
  return (
    <div aria-busy="true" aria-label="Cargando" className="mx-auto grid max-w-3xl">
      <div className="mb-6 grid gap-2">
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-5">
        <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 shadow-xs">
          <Skeleton className="size-11 rounded-full" />
          <div className="grid flex-1 gap-1.5">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-64 max-w-full" />
          </div>
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-4">
              <Skeleton className="size-7 rounded-full" />
              <div className={i ? 'grid gap-1.5 px-4 py-3' : 'grid gap-3 rounded-xl border px-4 py-4'}>
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-56" />
                {i ? null : <Skeleton className="h-16" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
