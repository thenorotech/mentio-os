import { ArrowUpRight, Heart, Megaphone, MessageCircle, UserRound, Users } from 'lucide-react';
import type { AnalyticsBreakdown, Person } from '@mentio-dev/sdk';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge, Card, ChartEmpty, EmptyState, KpiStrip, LinkButton, PageHeader, SectionHeading, Stat } from '@/components/ui';
import { LinkToggle } from '@/components/ui/client';
import { compact, platformName } from '@/lib/format';
import { groupCandidates } from '@/lib/insights';
import { mentio, unwrap } from '@/lib/mentio';
import type { SearchParams } from '@/lib/params';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Voceros y detractores' };

type PersonBreakdownRow = AnalyticsBreakdown['data'][number];
type VoiceCardRow = PersonBreakdownRow & { person: NonNullable<PersonBreakdownRow['person']> & { id: string } };

function chunks<T>(values: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < values.length; index += size) result.push(values.slice(index, index + size));
  return result;
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => Array.from(part)[0]?.toLocaleUpperCase('es-MX') ?? '')
    .join('') || '•';
}

function personRows(rows: PersonBreakdownRow[]): VoiceCardRow[] {
  return rows.filter((row): row is VoiceCardRow => Boolean(row.person?.id));
}

function orderBySentiment(rows: VoiceCardRow[], sentiment: 'positive' | 'negative') {
  return [...rows].sort((a, b) => b.sentiment[sentiment] - a.sentiment[sentiment] || b.matched - a.matched);
}

function PersonCard({
  row,
  sentiment,
  detail,
}: {
  row: VoiceCardRow;
  sentiment: 'positive' | 'negative' | 'reach';
  detail: Person | null;
}) {
  const name = detail?.name ?? row.person.name ?? row.label;
  const handle = detail?.handle;
  const platform = platformName(detail?.platform ?? row.person.platform);
  const followers = detail?.reach.followers ?? row.person.followers;
  const avatar = detail?.avatarUrl ?? null;
  const Icon = sentiment === 'positive' ? Heart : sentiment === 'negative' ? MessageCircle : Users;
  const count = sentiment === 'positive' ? row.sentiment.positive : sentiment === 'negative' ? row.sentiment.negative : row.matched;
  const countLabel = sentiment === 'positive' ? 'menciones positivas' : sentiment === 'negative' ? 'menciones negativas' : 'menciones';

  return (
    <article className="rounded-lg border bg-card p-3 transition-colors hover:bg-muted/40">
      <div className="flex items-start gap-3">
        <Avatar size="lg" aria-hidden="true">
          {avatar ? <AvatarImage src={avatar} alt="" /> : null}
          <AvatarFallback>{initials(name)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold" title={name}>{name}</h3>
          {handle ? <p className="truncate text-xs text-muted-foreground">{handle}</p> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone="neutral">{platform}</Badge>
            <Badge tone={sentiment === 'positive' ? 'good' : sentiment === 'negative' ? 'bad' : 'accent'} className="tabular-nums">
              <Icon className="mr-1 size-3" aria-hidden="true" />
              {compact(count)} {countLabel}
            </Badge>
            <Badge tone="neutral" className="tabular-nums">{followers !== null && followers !== undefined ? `${compact(followers)} seguidores` : 'Seguidores sin dato'}</Badge>
          </div>
        </div>
      </div>
      <LinkButton href={`/people/${row.person.id}`} size="sm" className="pressable mt-3 w-full justify-center" aria-label={`Seguir de cerca a ${name}`}>
        Seguir de cerca <ArrowUpRight className="size-3.5" aria-hidden="true" />
      </LinkButton>
    </article>
  );
}

function VoiceColumn({
  title,
  description,
  hint,
  index,
  rows,
  sentiment,
  details,
}: {
  title: string;
  description: string;
  hint: string;
  index: number;
  rows: VoiceCardRow[];
  sentiment: 'positive' | 'negative' | 'reach';
  details: Map<string, Person | null>;
}) {
  return (
    <Card title={title} description={description} hint={hint} index={index}>
      {rows.length ? (
        <div className="flex flex-col gap-2.5">
          {rows.map((row) => (
            <PersonCard key={row.person.id} row={row} sentiment={sentiment} detail={details.get(row.person.id) ?? null} />
          ))}
        </div>
      ) : (
        <ChartEmpty>Aún no hay personas en esta columna. Aparecerán aquí cuando lleguen más menciones.</ChartEmpty>
      )}
    </Card>
  );
}

export default async function VocerosPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const keywords = unwrap(await mentio().listKeywords({
    query: { status: ['active'], sort: 'term', limit: 500 },
  })).data;
  const candidates = groupCandidates(keywords).filter((candidate) => candidate.kind === 'brand');

  if (!candidates.length) {
    return (
      <div>
        <PageHeader title="Voceros y detractores" description="Conoce quién habla bien de tu candidato, quién lo critica y quién alcanza a más personas." />
        <EmptyState icon={UserRound} title="Aún no registras tu candidato." action={<LinkButton href="/arranque" variant="primary">Ir al asistente</LinkButton>}>
          Agrega el nombre del candidato y sus variantes para identificar las voces que mueven la conversación.
        </EmptyState>
      </div>
    );
  }

  const requestedCandidate = typeof params.candidate === 'string' ? params.candidate : undefined;
  const candidate = candidates.find((item) => item.mainId === requestedCandidate) ?? candidates[0];
  const api = mentio();
  const breakdowns = await Promise.all(chunks(candidate.keywordIds, 50).map((keywordIds) =>
    api.getAnalyticsBreakdown({ query: { by: 'person', range: '30d', keywordIds } }).then(unwrap),
  ));
  const byPerson = new Map<string, PersonBreakdownRow>();
  for (const row of breakdowns.flatMap((breakdown) => breakdown.data)) {
    const id = row.person?.id;
    if (!id) continue;
    const previous = byPerson.get(id);
    byPerson.set(id, previous ? {
      ...previous,
      matched: previous.matched + row.matched,
      relevant: previous.relevant + row.relevant,
      sentiment: {
        positive: previous.sentiment.positive + row.sentiment.positive,
        neutral: previous.sentiment.neutral + row.sentiment.neutral,
        negative: previous.sentiment.negative + row.sentiment.negative,
        unclassified: previous.sentiment.unclassified + row.sentiment.unclassified,
      },
    } : row);
  }
  const allPeople = personRows([...byPerson.values()]);
  const defenders = orderBySentiment(allPeople, 'positive')
    .filter((row) => row.sentiment.positive > row.sentiment.negative)
    .slice(0, 3);
  const critics = orderBySentiment(allPeople, 'negative')
    .filter((row) => row.sentiment.negative > row.sentiment.positive)
    .slice(0, 3);
  const peopleWithClearSentiment = new Set(allPeople
    .filter((row) => row.sentiment.positive !== row.sentiment.negative)
    .map((row) => row.person.id));
  const influencers = [...allPeople]
    .filter((row) => !peopleWithClearSentiment.has(row.person.id))
    .sort((a, b) => (b.person.followers ?? -1) - (a.person.followers ?? -1) || b.matched - a.matched)
    .slice(0, 3);
  const visiblePeople = [...new Set([...defenders, ...critics, ...influencers].map((row) => row.person.id))];
  const details = new Map<string, Person | null>(await Promise.all(
    visiblePeople.map(async (id) => {
      try {
        return [id, unwrap(await api.getPerson({ path: { id } }))] as const;
      } catch {
        return [id, null] as const;
      }
    }),
  ));
  const candidateHref = (id: string) => `/voceros?candidate=${encodeURIComponent(id)}`;
  const favorable = allPeople.filter((row) => row.sentiment.positive > row.sentiment.negative).length;
  const against = allPeople.filter((row) => row.sentiment.negative > row.sentiment.positive).length;
  const topReach = allPeople.reduce<number | null>((max, row) => {
    const followers = row.person.followers;
    return followers === null || followers === undefined ? max : Math.max(max ?? 0, followers);
  }, null);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voceros y detractores"
        description={`Quién habla bien de ${candidate.name}, quién lo critica y quién alcanza a más personas. Últimos 30 días.`}
        actions={candidates.length > 1 ? (
          <LinkToggle
            current={candidate.mainId}
            items={candidates.map((item) => ({ value: item.mainId, label: item.name, href: candidateHref(item.mainId) }))}
          />
        ) : null}
      />

      <KpiStrip label={`Voces sobre ${candidate.name}`}>
        <Stat label="Personas identificadas" value={compact(allPeople.length)} hint="Mencionaron al candidato" />
        <Stat label="A favor" value={compact(favorable)} tone={favorable ? 'positive' : 'default'} hint="Más menciones positivas que negativas" />
        <Stat label="En contra" value={compact(against)} tone={against ? 'negative' : 'default'} hint="Más menciones negativas que positivas" />
        <Stat label="Mayor alcance" value={topReach === null ? '—' : compact(topReach)} hint="Seguidores de la voz más grande" />
      </KpiStrip>

      <section className="space-y-4" aria-labelledby="voceros-voces">
        <SectionHeading
          id="voceros-voces"
          icon={Megaphone}
          title={`Las voces que mueven a ${candidate.name}`}
          description="Las tres personas más destacadas de cada grupo, con las variantes del candidato sumadas."
          aside="Últimos 30 días"
        />
        <div className="grid gap-4 @4xl:grid-cols-3">
          <VoiceColumn
            title="Te defienden"
            description="Más menciones positivas sobre tu candidato."
            hint="Personas identificadas por la API con más menciones positivas que negativas, ordenadas por menciones positivas."
            index={0}
            rows={defenders}
            sentiment="positive"
            details={details}
          />
          <VoiceColumn
            title="Te atacan"
            description="Más menciones negativas sobre tu candidato."
            hint="Personas identificadas por la API con más menciones negativas que positivas, ordenadas por menciones negativas."
            index={1}
            rows={critics}
            sentiment="negative"
            details={details}
          />
          <VoiceColumn
            title="Mueven la conversación"
            description="Más seguidores entre quienes lo mencionan sin inclinarse."
            hint="Personas con el mismo número de menciones positivas y negativas, ordenadas por seguidores."
            index={2}
            rows={influencers}
            sentiment="reach"
            details={details}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Solo aparecen personas identificadas por la API; las menciones anónimas no cuentan en estas columnas.
        </p>
      </section>
    </div>
  );
}
