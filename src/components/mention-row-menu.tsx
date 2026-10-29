'use client';

/** The "⋯" at the end of a mention row: shadcn's DropdownMenu to open it or triage it in place. */
import { Check, CircleSlash, ExternalLink, MoreHorizontal, RotateCcw, SquareArrowOutUpRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { toast } from 'sonner';
import { announceStatus } from '@/components/mention-status';
import { setMentionStatus } from '@/app/(dashboard)/mentions/actions';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export function MentionRowMenu({ id, status, url, platform }: { id: string; status: string; url: string; platform: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const setStatus = (next: 'open' | 'done' | 'ignored') =>
    startTransition(async () => {
      announceStatus([id], next);
      const form = new FormData();
      form.set('id', id);
      form.set('status', next);
      const result = await setMentionStatus(null, form);
      if (result?.error) {
        announceStatus([id], null);
        toast.error(result.error);
      } else toast.success(next === 'open' ? 'Se reabrió la mención.' : next === 'done' ? 'La mención se marcó como resuelta.' : 'La mención se ignoró.');
      router.refresh();
    });
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones de la mención" aria-busy={pending || undefined} disabled={pending} />}>
        <MoreHorizontal aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem render={<Link href={`/mentions/${id}`} />}>
          <SquareArrowOutUpRight aria-hidden /> Abrir mención
        </DropdownMenuItem>
        <DropdownMenuItem render={<a href={url} target="_blank" rel="noopener noreferrer" />}>
          <ExternalLink aria-hidden /> Ver en {platform}
          <span className="sr-only">(se abre en otra pestaña)</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status !== 'done' ? (
          <DropdownMenuItem onClick={() => setStatus('done')}>
            <Check aria-hidden /> Marcar como resuelta
          </DropdownMenuItem>
        ) : null}
        {status !== 'ignored' ? (
          <DropdownMenuItem onClick={() => setStatus('ignored')}>
            <CircleSlash aria-hidden /> Ignorar
          </DropdownMenuItem>
        ) : null}
        {status !== 'open' ? (
          <DropdownMenuItem onClick={() => setStatus('open')}>
            <RotateCcw aria-hidden /> Reabrir
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
