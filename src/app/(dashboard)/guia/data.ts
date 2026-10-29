/** The setup guide's signals, read from Mentio and Apify; a source that fails counts as not set up, never as an error page. */
import { apifyConfigured, listAllRuns } from '@/lib/apify';
import { groupCandidates } from '@/lib/insights';
import { mentio, unwrap } from '@/lib/mentio';
import { classifyTargets, type SetupSignals } from '@/lib/onboarding';
import { runTargets } from '../redes/data';

/** Recent runs per source the guide reads targets from. */
const RUNS_PER_SOURCE = 3;

async function scrapeTargets() {
  if (!apifyConfigured()) return { profiles: 0, events: 0 };
  const { runs } = await listAllRuns(undefined, { limit: RUNS_PER_SOURCE });
  const settled = await Promise.allSettled(runs.map(runTargets));
  const { profiles, events } = classifyTargets(settled.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])));
  return { profiles: profiles.length, events: events.length };
}

export async function loadSetupSignals(): Promise<SetupSignals> {
  const api = mentio();
  const [keywords, alerts, channels, scraped] = await Promise.allSettled([
    api.listKeywords({ query: { limit: 500, sort: 'term' } }).then(unwrap),
    api.listAlerts().then(unwrap),
    api.listChannels().then(unwrap),
    scrapeTargets(),
  ]);
  const groups = keywords.status === 'fulfilled' ? groupCandidates(keywords.value.data) : [];
  const kinds = (kind: string) => groups.filter((g) => g.kind === kind).length;
  return {
    mentio: keywords.status === 'fulfilled',
    apify: apifyConfigured(),
    brands: kinds('brand'),
    competitors: kinds('competitor'),
    topics: kinds('topic'),
    profiles: scraped.status === 'fulfilled' ? scraped.value.profiles : 0,
    events: scraped.status === 'fulfilled' ? scraped.value.events : 0,
    alerts: alerts.status === 'fulfilled' ? alerts.value.data.length : 0,
    channels: channels.status === 'fulfilled' ? channels.value.data.length : 0,
  };
}
