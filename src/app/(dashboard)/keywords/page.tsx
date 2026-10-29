import type { ListKeywordsData } from '@mentio-dev/sdk';
import { Tag, Plus } from 'lucide-react';
import Link from 'next/link';
import { Badge, DataView, EmptyState, LinkButton, OffsetPager, Table, td, TableCell, TableRow, rowLink } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { UrlFilters } from '@/components/url-filters';
import { isOneOf } from '@/lib/form';
import { compact, PLATFORM_NAMES, platformName, REVIEW_PLATFORMS, SEARCH_PLATFORMS, timeAgo } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { many, one, withParams, type SearchParams } from '@/lib/params';
import { KeywordActions } from './keyword-actions';
import { KeywordBadges, KIND_LABELS, KINDS, PlatformIcons, SORTS, STATUSES, variantOf } from './shared';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Candidatos y temas' };

type Query = NonNullable<ListKeywordsData['query']>;
const LIMIT = 25;
const ALL_PLATFORMS = [...SEARCH_PLATFORMS, ...REVIEW_PLATFORMS];
const STATUS_IDS = STATUSES.map(([id]) => id);
const SORT_IDS = SORTS.map(([id]) => id);

/** Candidates and topics tracked in the campaign, with recent activity. */
export default async function Keywords({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const offset = Math.max(0, Number(one(params, 'offset')) || 0);
  const q = one(params, 'q');
  const groupIds = many(params, 'groupId');
  const kinds = many(params, 'kind').filter((k) => isOneOf(KINDS, k));
  const statuses = many(params, 'status').filter((v) => isOneOf(STATUS_IDS, v));
  const platforms = many(params, 'platform').filter((v) => isOneOf(ALL_PLATFORMS, v));
  const sort = one(params, 'sort');

  const query: Query = {
    limit: LIMIT,
    offset,
    ...(q ? { q } : {}),
    ...(groupIds.length ? { groupId: groupIds } : {}),
    ...(kinds.length ? { kind: kinds as Query['kind'] } : {}),
    ...(statuses.length ? { status: statuses as Query['status'] } : {}),
    ...(platforms.length ? { platform: platforms as Query['platform'] } : {}),
    ...(isOneOf(SORT_IDS, sort) ? { sort } : {}),
  };
  const [page, groups] = await Promise.all([mentio().listKeywords({ query }).then(unwrap), mentio().listGroups().then(unwrap)]);
  const showGroups = groups.data.length > 1;
  const filtered = Boolean(q || groupIds.length || kinds.length || statuses.length || platforms.length);

  return (
    <DataView
      title="Candidatos y temas"
      actions={<LinkButton href="/keywords/new" variant="primary" create><Plus /> Agregar candidato o tema</LinkButton>}
      notice={<span>Candidatos, adversarios y temas de agenda que sigue la campaña. Cada término nuevo recupera 30 días de conversación.</span>}
      toolbar={<UrlFilters
        className="grid gap-2"
        search={{ placeholder: 'Buscar candidato, tema o contexto' }}
        sort={{ options: SORTS.map(([value, label]) => ({ value, label })) }}
        filters={[
          ...(showGroups ? [{ param: 'groupId', label: 'Campaña', icon: 'folder', kind: 'multi', options: groups.data.map((g) => ({ value: g.id, label: g.name })) } as const] : []),
          { param: 'kind', label: 'Tipo', icon: 'tag', kind: 'multi', options: KINDS.map((k) => ({ value: k, label: KIND_LABELS[k] })) },
          { param: 'status', label: 'Estado', icon: 'status', kind: 'multi', options: STATUSES.map(([value, label]) => ({ value, label })) },
          { param: 'platform', label: 'Plataforma', icon: 'platform', kind: 'multi', options: Object.entries(PLATFORM_NAMES).map(([value, label]) => ({ value, label, platform: value })) },
        ]}
      />}
    >

      {page.data.length === 0 ? (
        <EmptyState
          icon={Tag}
          title={filtered ? 'Ningún término coincide con estos filtros.' : 'Aún no hay términos monitoreados.'}
          example="Una campaña puede seguir a “María López” como candidata, “José Pérez” como adversario y “seguridad” como tema."
          action={filtered ? <LinkButton href="/keywords" variant="primary">Quitar filtros</LinkButton> : <LinkButton href="/keywords/new" variant="primary">Agregar candidato o tema</LinkButton>}
        >
          {filtered ? 'Quita filtros o prueba con otro término para encontrar resultados.' : 'Al agregarlos, la conversación de campaña aparecerá aquí.'}
        </EmptyState>
      ) : (
        <Table head={[
          <span className="inline-flex items-center gap-1">Término monitoreado <InfoTip text="Candidato, adversario o tema que la campaña decidió seguir." /></span>,
          <span className="inline-flex items-center gap-1">Plataformas <InfoTip text="Canales donde se buscan las publicaciones que mencionan este término." /></span>,
          <span className="inline-flex items-center gap-1">Últimos 7 días <InfoTip text="Menciones encontradas durante los siete días más recientes." /></span>,
          <span className="inline-flex items-center gap-1">Este mes <InfoTip term="menciones" /></span>,
          <span className="inline-flex items-center gap-1">Relevantes <InfoTip term="relevancia" /></span>,
          '',
        ]}>
          {page.data.map((keyword) => (
            <TableRow key={keyword.id} className={keyword.muted ? 'text-muted-foreground' : ''}>
              <TableCell className={td}>
                <Link href={`/keywords/${keyword.id}`} data-row-link className={`font-medium text-foreground hover:underline ${rowLink}`}>{keyword.term}</Link>
                <Badge className="ml-2" tone={keyword.kind === 'brand' ? 'accent' : keyword.kind === 'competitor' ? 'warn' : 'neutral'}>{KIND_LABELS[keyword.kind]}</Badge>
                {variantOf(keyword.context) ? <Badge className="ml-1" tone="outline">Variante de {variantOf(keyword.context)}</Badge> : null}
                {showGroups && !keyword.group.isDefault ? <span className="ml-2 text-xs text-muted-foreground">en {keyword.group.name}</span> : null}
                <div className="mt-1"><KeywordBadges keyword={keyword} /></div>
                {keyword.stats.noise.noisy ? (
                  <p className="mt-1 max-w-xs text-xs text-rose-600 dark:text-rose-400">
                    Pocas menciones recientes parecen hablar de este término: {keyword.stats.noise.relevant} de {keyword.stats.noise.scored}. <InfoTip term="relevancia" /> Ajusta los términos requeridos o excluidos.
                  </p>
                ) : null}
              </TableCell>
              <TableCell className={`${td} max-w-48`}>
                <PlatformIcons keyword={keyword} />
              </TableCell>
              <TableCell className={`${td} tabular-nums`}>
                {compact(keyword.stats.last7d)}
                <div className="text-xs text-muted-foreground">{keyword.stats.lastMentionAt ? `última ${timeAgo(keyword.stats.lastMentionAt)}` : 'sin menciones'}</div>
              </TableCell>
              <TableCell className={`${td} tabular-nums`}>
                {compact(keyword.stats.thisMonth)}
                {keyword.cap ? <span className="text-xs text-muted-foreground"> / {compact(keyword.cap.mentions)}</span> : null}
              </TableCell>
              <TableCell className={`${td} tabular-nums`}>{compact(keyword.stats.relevant)}</TableCell>
              <TableCell className={td}><KeywordActions keyword={keyword} /></TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      <OffsetPager total={page.total} limit={LIMIT} offset={offset} href={(o) => withParams('/keywords', params, { offset: o ? String(o) : undefined })} />
    </DataView>
  );
}
