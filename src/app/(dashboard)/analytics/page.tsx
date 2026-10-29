import { PageHeader, RangeLinks } from '@/components/ui';
import { InfoTip } from '@/components/info-tip';
import { UrlFilters } from '@/components/url-filters';
import { PLATFORM_NAMES, day } from '@/lib/format';
import { mentio, unwrap } from '@/lib/mentio';
import { withParams, type SearchParams } from '@/lib/params';
import { Breakdowns } from './breakdowns';
import { ParamTabs } from './charts';
import { Overview } from './overview';
import { Reviews } from './reviews';
import { ShareOfVoice } from './voice';
import { RANGES, keywordName, readWindow } from './window';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Análisis' };

/** One window, four reports: overview, breakdowns, share of voice and reviews (Inerpy's dashboard recipe). */
export default async function Analytics({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const { query, tab: asked, range } = readWindow(params);
  const api = mentio();
  const [summary, reviews, keywords] = await Promise.all([
    api.getAnalyticsSummary({ query: { ...query, compare: true } }).then(unwrap),
    api.getReviewsReport({ query: { ...query, compare: true } }).then(unwrap),
    api.listKeywords({ query: { sort: 'term' } }).then(unwrap),
  ]);
  const hasReviews = reviews.totals.reviews > 0;
  const tab = asked === 'reviews' && !hasReviews ? 'overview' : asked;
  const tabHref = (value: string) => withParams('/analytics', params, { tab: value === 'overview' ? undefined : value });
  const tabs = [
    { value: 'overview', label: 'Resumen', href: tabHref('overview') },
    { value: 'breakdowns', label: 'Desgloses', href: tabHref('breakdowns') },
    { value: 'voice', label: <span className="inline-flex items-center gap-1">Participación de voz <InfoTip term="participación de voz" /></span>, href: tabHref('voice') },
    ...(hasReviews ? [{ value: 'reviews', label: 'Reseñas', href: tabHref('reviews') }] : []),
  ];

  return (
    <div>
      <PageHeader
        title="Análisis"
        description={`Del ${day(summary.window.from)} al ${day(summary.window.to)} · ${summary.window.days} días, comparados con los ${summary.window.days} días anteriores.`}
        actions={
          <div role="group" aria-label="Periodo">
            <RangeLinks current={range} options={RANGES} href={(value) => withParams('/analytics', params, { range: value, from: undefined, to: undefined })} />
          </div>
        }
      />

      <UrlFilters
        keep={['tab', 'range']}
        reset={[]}
        filters={[
          { param: 'keywordIds', label: 'Término monitoreado', icon: 'tag', kind: 'multi', options: keywords.data.map((k) => ({ value: k.id, label: `${keywordName(k)} (${({ brand: 'candidato', competitor: 'adversario', topic: 'tema' } as Record<string, string>)[k.kind] ?? k.kind})` })) },
          { param: 'platforms', label: 'Canal', icon: 'platform', kind: 'multi', options: Object.entries(PLATFORM_NAMES).map(([value, label]) => ({ value, label, platform: value })) },
          { param: 'from', label: 'Fechas', icon: 'calendar', kind: 'dates', untilParam: 'to' },
        ]}
      />

      <ParamTabs current={tab} items={tabs} />

      {tab === 'overview' ? <Overview query={query} summary={summary} /> : null}
      {tab === 'breakdowns' ? <Breakdowns query={query} window={summary.window} /> : null}
      {tab === 'voice' ? <ShareOfVoice query={query} /> : null}
      {tab === 'reviews' ? <Reviews report={reviews} query={query} /> : null}
    </div>
  );
}
