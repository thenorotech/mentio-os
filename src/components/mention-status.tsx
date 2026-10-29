'use client';

/**
 * A mention's status in the table, updated the moment it is triaged (Dub and
 * Midday update optimistically): the row menu and the bulk bar announce the
 * change, every badge for that mention follows at once, and the server's
 * refresh confirms it a moment later.
 */
import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';

const EVENT = 'agora:mention-status';

const STATUS_LABELS: Record<string, string> = { new: 'Nuevo', open: 'Abierto', done: 'Resuelto', snoozed: 'Pospuesto', ignored: 'Ignorado' };
/** The kit's badge tones (components/ui `Badge`), repeated here because this is a client module: open in the brand, resolved green, snoozed amber, ignored grey. */
const STATUS_CLASSES: Record<string, string> = {
  new: 'bg-brand-soft text-primary',
  open: 'bg-brand-soft text-primary',
  done: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  snoozed: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400',
  ignored: 'bg-secondary text-muted-foreground',
};

/** `null` puts the badges back to what the server last said (a failed save). */
export function announceStatus(ids: string[], status: string | null) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { ids, status } }));
}

export function MentionStatus({ id, status }: { id: string; status: string }) {
  const [shown, setShown] = useState(status);
  useEffect(() => setShown(status), [status]);
  useEffect(() => {
    const on = (e: Event) => {
      const { ids, status: next } = (e as CustomEvent<{ ids: string[]; status: string | null }>).detail;
      if (ids.includes(id)) setShown(next ?? status);
    };
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, [id, status]);
  return (
    <Badge variant="secondary" className={STATUS_CLASSES[shown] ?? STATUS_CLASSES.ignored}>
      {STATUS_LABELS[shown] ?? shown}
    </Badge>
  );
}
