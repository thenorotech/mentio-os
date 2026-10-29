'use client';

/**
 * The feed's toolbar: the shared UrlFilters with the mention vocabulary, the
 * saved view as its base (a picker on the left) and "Save view", which opens
 * the server-rendered form in a drawer.
 */
import { Bookmark } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { UrlFilters, type FilterOption } from '@/components/url-filters';
import { DrawerButton } from '@/components/ui/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mentionFilterDefs } from './filter-defs';

const SORTS: FilterOption[] = [
  { value: 'newest', label: 'Más recientes primero' },
  { value: 'priority', label: 'Prioridad de atención' },
];

export function MentionFilters({
  keywords,
  groups,
  views,
  viewId,
  saveView,
}: {
  keywords: FilterOption[];
  groups: FilterOption[];
  views: Array<{ id: string; name: string }>;
  viewId?: string;
  /** The "Save as view" form, rendered by the server page, shown in a drawer. */
  saveView: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const filtered = [...params.keys()].some((key) => !['sort', 'viewId', 'cursor'].includes(key));

  const pickView = (value: string | null) => {
    const next = new URLSearchParams(params.toString());
    next.delete('cursor');
    if (value && value !== 'all') next.set('viewId', value);
    else next.delete('viewId');
    router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  return (
    <UrlFilters
        className="grid gap-2"
        filters={mentionFilterDefs(keywords, groups, { window: true, person: params.has('personId'), alert: params.has('alertId') })}
        search={{ placeholder: 'Buscar texto de la mención' }}
        sort={{ options: SORTS }}
        keep={['viewId']}
        leading={
          <Select items={{ all: 'Todas las menciones', ...Object.fromEntries(views.map((v) => [v.id, v.name])) }} value={viewId ?? 'all'} onValueChange={(value) => pickView(value ? String(value) : null)}>
            <SelectTrigger className="w-full bg-background font-medium @2xl:w-auto @2xl:max-w-60">
              <Bookmark className="size-3.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false} align="start">
              <SelectItem value="all">Todas las menciones</SelectItem>
              {views.map((v) => (
                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
        actions={
          filtered ? (
            <DrawerButton size="sm" label="Guardar vista" icon={<Bookmark />} title="Guardar como vista" description="Guarda estos filtros con un nombre. No guarda las fechas ni el orden.">
              {saveView}
            </DrawerButton>
          ) : null
        }
      />
  );
}
