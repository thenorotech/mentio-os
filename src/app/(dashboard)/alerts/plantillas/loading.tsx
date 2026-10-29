import { Skeleton } from '@/components/ui/skeleton';

/** The template gallery while it loads: the header with its back link and action, three template cards. */
export default function LoadingAlertTemplates() {
  return (
    <div aria-busy="true" aria-label="Cargando">
      <div className="mb-6 flex flex-col gap-3 @lg:flex-row @lg:items-start @lg:justify-between">
        <div className="grid gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-7 w-52" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-4 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-xs">
            <div className="grid gap-3 px-4 pt-4">
              <div className="flex items-start justify-between gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <div className="grid gap-1.5">
                <Skeleton className="h-4 w-44" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </div>
            <div className="flex-1 px-4 pt-3 pb-4">
              <Skeleton className="h-14 rounded-lg" />
            </div>
            <div className="grid gap-3 border-t bg-muted/30 px-4 py-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-9" />
              <Skeleton className="h-8 w-36 justify-self-end" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
