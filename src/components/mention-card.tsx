import type { Mention } from '@mentio-dev/sdk';
import Link from 'next/link';
import { setMentionStatus } from '@/app/(dashboard)/mentions/actions';
import { ExternalLink } from 'lucide-react';
import { Badge, TONE_TEXT, sentimentTone, type Tone } from '@/components/ui';
import { ActionForm, SubmitButton } from '@/components/ui/client';
import { compact, platformName, tagName, timeAgo } from '@/lib/format';

export function Avatar({ name, url, size = 'size-7' }: { name: string | null | undefined; url: string | null | undefined; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-full bg-muted object-cover`} />
  ) : (
    <span className={`${size} flex shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground`}>
      {(name ?? '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

/** A keyword as people read it: the term, plus its group outside the default one. */
export const keywordLabel = (keyword: Mention['keyword']) => (keyword.group.isDefault ? keyword.term : `${keyword.term} (${keyword.group.name})`);

/** One mention in a list: who said what where, the verdict, and quick triage. */
export function MentionCard({ mention, actions = true }: { mention: Mention; actions?: boolean }) {
  const { post, author, classification: verdict } = mention;
  const views = post.engagement?.views;
  const href = `/mentions/${encodeURIComponent(mention.id)}`;
  const title = post.text || mention.review?.title || '(sin texto)';
  return (
    <article className="rounded-xl border bg-card p-4 shadow-xs transition-colors hover:bg-muted/30">
      <Link href={href} className="-m-1 block rounded-lg p-1 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
        <header className="flex items-center gap-2 text-sm">
          <Avatar name={author?.name} url={author?.avatarUrl} />
          <span className="min-w-0 truncate font-medium">{author?.name ?? author?.handle ?? 'Desconocido'}</span>
          {author?.followers ? <span className="hidden shrink-0 text-xs text-muted-foreground tabular-nums @lg:inline">{compact(author.followers)} seguidores</span> : null}
          <span className="ml-auto shrink-0 text-xs text-muted-foreground">
            {platformName(post.platform)} · {timeAgo(post.publishedAt)}
          </span>
        </header>

        {mention.review ? (
          <p className="mt-3 text-sm" role="img" aria-label={`${mention.review.rating} de ${mention.review.ratingMax} estrellas`}>
            <span aria-hidden className={TONE_TEXT.warning}>{'★'.repeat(Math.max(0, Math.min(mention.review.rating, mention.review.ratingMax)))}</span>
            <span aria-hidden className="text-muted-foreground/40">{'★'.repeat(Math.max(0, mention.review.ratingMax - mention.review.rating))}</span>
          </p>
        ) : null}
        <p className="mt-2 line-clamp-4 text-sm leading-relaxed whitespace-pre-line text-foreground">{title}</p>
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
        {verdict?.relevance !== undefined && verdict?.relevance !== null ? (
          <Badge tone={mention.relevant ? 'solid' : 'neutral'} className="tabular-nums"><span className="sr-only">Relevancia </span>{verdict.relevance}</Badge>
        ) : null}
        {verdict?.sentiment ? <Badge tone={sentimentTone(verdict.sentiment)}>{sentimentName(verdict.sentiment)}</Badge> : null}
        {(verdict?.intents ?? []).map((intent, intentIndex) => (
          <Badge key={`${intent}-${intentIndex}`} tone="accent">{tagName(intent)}</Badge>
        ))}
        {verdict?.uncertain ? <Badge tone="warn">Incierta</Badge> : null}
        <Badge tone="outline">{keywordLabel(mention.keyword)}</Badge>
        {views ? <span className="text-muted-foreground tabular-nums">{compact(views)} vistas</span> : null}
        {mention.status !== 'open' ? <Badge tone={STATUS_TONES[mention.status] ?? 'neutral'}>{statusName(mention.status)}</Badge> : null}
        {mention.triage.assignee ? (
          <span className="text-muted-foreground">
            <span aria-hidden>→ </span>
            <span className="sr-only">Responsable: </span>
            {mention.triage.assignee.name ?? mention.triage.assignee.email}
          </span>
        ) : null}
      </div>

      {verdict?.note ? <p className="mt-2 text-xs text-muted-foreground italic">{verdict.note}</p> : null}

      <footer className="mt-3 flex flex-wrap items-center gap-3 border-t pt-3 text-xs">
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          Ver en {platformName(post.platform)} <ExternalLink aria-hidden className="size-3" />
          <span className="sr-only">(se abre en otra pestaña)</span>
        </a>
        <Link href={href} className="rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">Detalles</Link>
        {actions ? (
          <ActionForm action={setMentionStatus} className="ml-auto flex flex-wrap items-center justify-end gap-1.5">
            <input type="hidden" name="id" value={mention.id} />
            {mention.status !== 'done' ? <SubmitButton variant="secondary" size="sm" name="status" value="done">Resolver</SubmitButton> : null}
            {mention.status !== 'ignored' ? <SubmitButton variant="secondary" size="sm" name="status" value="ignored">Ignorar</SubmitButton> : null}
            {mention.status !== 'open' ? <SubmitButton variant="secondary" size="sm" name="status" value="open">Reabrir</SubmitButton> : null}
          </ActionForm>
        ) : null}
      </footer>
    </article>
  );
}

const sentimentName = (value: string) => ({ positive: 'Positivo', neutral: 'Neutral', negative: 'Negativo' })[value] ?? value;
const STATUS_TONES: Record<string, Tone> = { new: 'accent', open: 'accent', done: 'good', snoozed: 'warn', ignored: 'neutral' };
const statusName = (value: string) => ({ new: 'Nuevo', open: 'Abierto', done: 'Resuelto', snoozed: 'Pospuesto', ignored: 'Ignorado' })[value] ?? value;
