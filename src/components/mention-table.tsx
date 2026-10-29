import type { Mention } from '@mentio-dev/sdk';
import Link from 'next/link';
import { CornerUpLeft, Send } from 'lucide-react';
import { MentionRowMenu } from '@/components/mention-row-menu';
import { MentionSelection, SelectAll, SelectRow } from '@/components/mention-selection';
import { MentionStatus } from '@/components/mention-status';
import { InfoTip } from '@/components/info-tip';
import { PlatformIcon } from '@/components/platform-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { platformName, timeAgo } from '@/lib/format';
import { cn } from '@/lib/utils';
import { GRID } from '@/components/ui';

const SENTIMENT_DOT: Record<string, string> = { positive: 'bg-emerald-500', neutral: 'bg-zinc-400', negative: 'bg-rose-500' };

/**
 * The mentions list, on shadcn's Table: one
 * row per mention, the post's own platform, its text (with what it replies
 * to), the keyword, the author, the verdict and the triage state. A row
 * opens the mention; the menu at its end triages it in place.
 */
export function MentionTable({ mentions }: { mentions: Mention[] }) {
  return (
    <MentionSelection ids={mentions.map((m) => m.id)}>
    <div data-slot="table-frame" className={cn('overflow-hidden rounded-xl border bg-card shadow-xs', GRID)}>
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10 pr-0">
              <SelectAll />
            </TableHead>
            <TableHead className="w-14"><span className="inline-flex items-center gap-1">Plataforma <InfoTip text="Canal donde se publicó esta mención." /></span></TableHead>
            <TableHead><span className="inline-flex items-center gap-1">Mención <InfoTip term="menciones" /></span></TableHead>
            <TableHead><span className="inline-flex items-center gap-1">Candidato o tema <InfoTip text="Término de campaña con el que coincidió esta publicación." /></span></TableHead>
            <TableHead><span className="inline-flex items-center gap-1">Autor <InfoTip term="autor" /></span></TableHead>
            <TableHead><span className="inline-flex items-center gap-1">Sentimiento <InfoTip term="sentimiento o tono" /></span></TableHead>
            <TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1">Prioridad <InfoTip text="Puntaje que ayuda a ordenar las menciones que conviene revisar primero." /></span></TableHead>
            <TableHead className="text-right"><span className="inline-flex items-center justify-end gap-1">Relevancia <InfoTip term="relevancia" /></span></TableHead>
            <TableHead><span className="inline-flex items-center gap-1">Estado <InfoTip text="Indica si el equipo aún debe revisar la mención o ya la atendió." /></span></TableHead>
            <TableHead><span className="inline-flex items-center gap-1">Fecha <InfoTip text="Momento en que se publicó la mención." /></span></TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {mentions.map((mention) => {
            const verdict = mention.classification;
            const author = mention.author;
            return (
              <TableRow key={mention.id} className="relative cursor-pointer">
                <TableCell className="w-10 pr-0">
                  <SelectRow id={mention.id} />
                </TableCell>
                <TableCell className="text-center">
                  <Tooltip>
                    <TooltipTrigger render={<span className="relative z-10 inline-flex" />}>
                      <PlatformIcon platform={mention.post.platform} className="size-4" />
                    </TooltipTrigger>
                    <TooltipContent>{platformName(mention.post.platform)}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="max-w-[26rem] whitespace-normal">
                  {/* The link covers the whole row (after:inset-0), so a click anywhere opens the mention. */}
                  <Link href={`/mentions/${mention.id}`} className="block after:absolute after:inset-0">
                    {mention.post.replyTo?.author ? (
                      <span className="mb-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                        <CornerUpLeft className="size-3" /> En respuesta a {mention.post.replyTo.author}
                      </span>
                    ) : null}
                    <span className="line-clamp-2 leading-snug">{mention.post.text}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className="rounded-md font-mono text-[11px] font-normal">{mention.keyword.term}</Badge>
                </TableCell>
                <TableCell>
                  <span className="flex max-w-40 items-center gap-1.5">
                    <Avatar className="size-5">
                      {author?.avatarUrl ? <AvatarImage src={author.avatarUrl} alt="" /> : null}
                      <AvatarFallback className="text-[10px] font-semibold">{(author?.name ?? '?').replace(/^@/, '').slice(0, 1).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="truncate text-muted-foreground">{author?.handle ?? author?.name ?? 'Desconocido'}</span>
                  </span>
                </TableCell>
                <TableCell>
                  {verdict?.sentiment ? (
                    <span className="flex items-center gap-1.5">
                      <span className={cn('size-1.5 rounded-full', SENTIMENT_DOT[verdict.sentiment])} />
                      {sentimentName(verdict.sentiment)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">Sin puntuación</span>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono">{Math.round(mention.priority * 10) / 10}</TableCell>
                <TableCell className={cn('text-right font-mono', !mention.relevant && 'text-muted-foreground')}>{verdict?.relevance ?? '-'}</TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <MentionStatus id={mention.id} status={mention.status} />
                    {mention.delivered ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Send /> Entregada
                      </Badge>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{timeAgo(mention.post.publishedAt)}</TableCell>
                <TableCell className="relative z-10 px-2">
                  <MentionRowMenu id={mention.id} status={mention.status} url={mention.post.url} platform={platformName(mention.post.platform)} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
    </MentionSelection>
  );
}

const sentimentName = (value: string) => ({ positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' })[value] ?? value;
