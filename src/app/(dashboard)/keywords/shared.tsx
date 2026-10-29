/** Small pieces the keyword pages share: vocabulary, status badges, labels. */
import type { Keyword, ReviewSource } from '@mentio-dev/sdk';
import { PlatformIcon } from '@/components/platform-icon';
import { Badge, type Tone } from '@/components/ui';
import { platformName } from '@/lib/format';

export const KINDS = ['brand', 'competitor', 'topic'] as const;
export const KIND_LABELS: Record<(typeof KINDS)[number], string> = { brand: 'Candidato', competitor: 'Adversario', topic: 'Tema' };
/** One tone per kind, the same on every keyword screen: your campaign in the brand, adversaries in amber. */
export const KIND_TONES: Record<(typeof KINDS)[number], Tone> = { brand: 'accent', competitor: 'warn', topic: 'neutral' };

/** A keyword's kind as a badge. */
export function KindBadge({ kind }: { kind: (typeof KINDS)[number] }) {
  return <Badge tone={KIND_TONES[kind]}>{KIND_LABELS[kind]}</Badge>;
}

/** The primary term named by the campaign's explicit variant context convention. */
export function variantOf(context?: string | null) {
  const prefix = 'Variante de: ';
  if (!context?.startsWith(prefix)) return null;
  return context.slice(prefix.length).trim() || null;
}

export const STATUSES = [
  ['active', 'Activo'],
  ['muted', 'En pausa por ti'],
  ['paused', 'En pausa automáticamente'],
  ['noisy', 'En pausa: demasiado ruido'],
  ['capped', 'Al límite'],
] as const;

export const SORTS = [
  ['newest', 'Más recientes'],
  ['oldest', 'Más antiguos'],
  ['term', 'A a la Z'],
  ['mentions', 'Más menciones'],
  ['relevant', 'Más relevantes'],
  ['recent', 'Más en los últimos 7 días'],
  ['lastMention', 'Última mención'],
] as const;

type ReviewPlatform = ReviewSource['platform'];

/** App stores read one storefront per country; Trustpilot and Google Maps have one page. */
export const takesCountries = (platform: ReviewPlatform) => platform === 'appstore' || platform === 'googleplay';
/** Google Play answers one review language at a time. */
export const takesLanguage = (platform: ReviewPlatform) => platform === 'googleplay';

/** A stable form-field prefix for one connected review page. */
export const sourceKey = (src: Pick<ReviewSource, 'platform' | 'id'>) => `rs:${src.platform}:${src.id}`;

export function platformsLabel(keyword: Pick<Keyword, 'platforms' | 'reviewSources'>) {
  const search = keyword.platforms === null ? 'Todas las plataformas' : keyword.platforms.length === 0 ? 'Solo reseñas' : keyword.platforms.map(platformName).join(', ');
  const n = keyword.reviewSources.length;
  return n ? `${search} + ${n} ${n === 1 ? 'página de reseñas' : 'páginas de reseñas'}` : search;
}

/** Every state a keyword can be in, as badges. */
export function KeywordBadges({ keyword }: { keyword: Keyword }) {
  const badges = [];
  if (keyword.pausedForBalance) badges.push(<Badge key="balance" tone="warn">En pausa</Badge>);
  if (keyword.pausedForNoise) badges.push(<Badge key="noise" tone="warn">En pausa: demasiado ruido</Badge>);
  if (keyword.muted && !keyword.pausedForBalance && !keyword.pausedForNoise) badges.push(<Badge key="muted" tone="neutral">En pausa</Badge>);
  if (keyword.pausedForCap) badges.push(<Badge key="cap" tone="warn">Al límite</Badge>);
  if (badges.length === 0) badges.push(<Badge key="active" tone="good">Activo</Badge>);
  if (keyword.stats.noise.noisy) badges.push(<Badge key="noisy" tone="bad">Mucho ruido</Badge>);
  return <span className="inline-flex flex-wrap items-center gap-1">{badges}</span>;
}

/** The platforms a keyword listens on, as logos: every platform, review pages only, or the ones it names. */
export function PlatformIcons({ keyword }: { keyword: Pick<Keyword, 'platforms' | 'reviewSources'> }) {
  const reviews = keyword.reviewSources ?? [];
  const reviewPlatforms = [...new Set(reviews.map((r) => r.platform))];
  if (keyword.platforms === null) {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        Todas las plataformas
        {reviewPlatforms.map((p, pIndex) => <PlatformIcon key={`${p}-${pIndex}`} platform={p} />)}
      </span>
    );
  }
  const shown = [...keyword.platforms, ...reviewPlatforms];
  if (shown.length === 0) return <span className="text-xs text-muted-foreground">Ninguna</span>;
  return (
    <span className="flex flex-wrap items-center gap-1" title={platformsLabel(keyword)}>
      {shown.map((p, pIndex) => <PlatformIcon key={`${p}-${pIndex}`} platform={p} />)}
      <span className="sr-only">{platformsLabel(keyword)}</span>
    </span>
  );
}
