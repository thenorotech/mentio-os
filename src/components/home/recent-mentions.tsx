import { ArrowUpRight, Heart, MessageCircleWarning } from 'lucide-react';
import type { Mention } from '@mentio-dev/sdk';
import { Card, EmptyState, LinkButton, TONE_TEXT } from '@/components/ui';
import { compact, platformName } from '@/lib/format';

const dateTime = new Intl.DateTimeFormat('es-MX', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chihuahua' });

export function RecentMentions({ title, mentions, tone }: { title: string; mentions: Mention[]; tone: 'positive' | 'negative' }) {
  const Icon = tone === 'positive' ? Heart : MessageCircleWarning;

  return (
    <Card
      title={
        <span className="inline-flex items-center gap-2">
          <Icon aria-hidden className={`size-4 shrink-0 ${TONE_TEXT[tone]}`} />
          {title}
        </span>
      }
      description={`Cinco publicaciones ${tone === 'positive' ? 'favorables' : 'críticas'} recientes sobre tu candidato.`}
    >
      {mentions.length ? (
        <ul className="-my-1 divide-y">
          {mentions.slice(0, 5).map((mention) => {
            const author = mention.author?.name ?? mention.author?.handle ?? 'Autor sin identificar';
            const followers = mention.author?.followers;
            const published = new Date(mention.post.publishedAt);
            const valid = !Number.isNaN(published.getTime());
            return (
              <li key={mention.id} className="py-3 first:pt-1 last:pb-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium" title={author}>{author}</p>
                    {mention.author?.handle && mention.author.name ? <p className="truncate text-xs text-muted-foreground">{mention.author.handle}</p> : null}
                  </div>
                  {valid ? <time dateTime={published.toISOString()} className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{dateTime.format(published)}</time> : null}
                </div>
                <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-pretty text-foreground/85">{mention.post.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                  <span>{platformName(mention.post.platform)}</span>
                  <span className="tabular-nums">Alcance {followers === null || followers === undefined ? 'sin dato' : `${compact(followers)} seguidores`}</span>
                  <a
                    href={mention.post.url}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`Ver publicación de ${author} (se abre en otra pestaña)`}
                    className="inline-flex items-center gap-1 rounded-sm font-medium text-primary hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                  >
                    Ver publicación <ArrowUpRight aria-hidden className="size-3" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState compact icon={Icon} title={tone === 'positive' ? 'Aún no hay menciones favorables' : 'No hay críticas recientes'} action={<LinkButton href="/keywords/new" variant="secondary" size="sm">Revisar monitoreo</LinkButton>}>
          Cuando aparezcan publicaciones sobre tu candidato, aquí podrás abrirlas y revisar quién las compartió.
        </EmptyState>
      )}
    </Card>
  );
}
