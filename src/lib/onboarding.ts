/**
 * The setup guide's rules, pure: which signals each step reads, when a step
 * is done, and which one comes next. The guide page and the home strip both
 * read `setupProgress`; the loader in `app/(dashboard)/guia/data.ts` fills
 * the signals from Mentio and Apify.
 */

export type SetupSignals = {
  /** Mentio answered (the API key works). */
  mentio: boolean;
  /** `APIFY_TOKEN` is set. */
  apify: boolean;
  brands: number;
  competitors: number;
  topics: number;
  /** Distinct @accounts and profile URLs in recent Apify runs. */
  profiles: number;
  /** Distinct #hashtags and searches in recent Apify runs. */
  events: number;
  channels: number;
  alerts: number;
};

export const SETUP_STEP_KEYS = ['conexiones', 'candidatura', 'contraste', 'perfiles', 'eventos', 'avisos'] as const;
export type SetupStepKey = (typeof SETUP_STEP_KEYS)[number];
export type SetupStatus = 'done' | 'current' | 'todo' | 'blocked';

export type SetupStep = {
  key: SetupStepKey;
  status: SetupStatus;
  /** What is already configured, as short facts ("2 adversarios"). */
  facts: string[];
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function isDone(key: SetupStepKey, s: SetupSignals): boolean {
  switch (key) {
    case 'conexiones': return s.mentio && s.apify;
    case 'candidatura': return s.brands > 0;
    case 'contraste': return s.competitors > 0 && s.topics > 0;
    case 'perfiles': return s.profiles > 0;
    case 'eventos': return s.events > 0;
    case 'avisos': return s.channels > 0 && s.alerts > 0;
  }
}

/** Scraping steps wait for the Apify token; everything waits for Mentio. */
function isBlocked(key: SetupStepKey, s: SetupSignals): boolean {
  if (key === 'conexiones') return false;
  if (!s.mentio) return true;
  return (key === 'perfiles' || key === 'eventos') && !s.apify;
}

function factsOf(key: SetupStepKey, s: SetupSignals): string[] {
  switch (key) {
    case 'conexiones': return [s.mentio ? 'Mentio conectado' : 'Mentio sin conexión', s.apify ? 'Apify conectado' : 'Apify sin token'];
    case 'candidatura': return s.brands ? [plural(s.brands, 'frase del candidato', 'frases del candidato')] : [];
    case 'contraste': return [plural(s.competitors, 'frase de adversario', 'frases de adversarios'), plural(s.topics, 'tema', 'temas')].filter((_, i) => (i ? s.topics : s.competitors) > 0);
    case 'perfiles': return s.profiles ? [plural(s.profiles, 'perfil recolectado', 'perfiles recolectados')] : [];
    case 'eventos': return s.events ? [plural(s.events, 'evento o búsqueda', 'eventos y búsquedas')] : [];
    case 'avisos': return [plural(s.channels, 'canal', 'canales'), plural(s.alerts, 'alerta', 'alertas')].filter((_, i) => (i ? s.alerts : s.channels) > 0);
  }
}

/** Every step with its status: the first open, unblocked step is `current`. */
export function setupProgress(signals: SetupSignals) {
  let current = false;
  const steps: SetupStep[] = SETUP_STEP_KEYS.map((key) => {
    const facts = factsOf(key, signals);
    if (isDone(key, signals)) return { key, status: 'done', facts };
    if (isBlocked(key, signals)) return { key, status: 'blocked', facts };
    if (current) return { key, status: 'todo', facts };
    current = true;
    return { key, status: 'current', facts };
  });
  const done = steps.filter((s) => s.status === 'done').length;
  return { steps, done, total: steps.length, complete: done === steps.length, next: steps.find((s) => s.status === 'current') ?? null };
}

/**
 * A run's targets split the way the guide counts them: accounts and profile
 * URLs are profiles; hashtags, searches and other URLs are events.
 */
export function classifyTargets(targets: readonly string[]) {
  const profiles = new Set<string>();
  const events = new Set<string>();
  for (const raw of targets) {
    const target = raw.trim().toLocaleLowerCase('es-MX');
    if (!target) continue;
    if (target.startsWith('@') || isProfileUrl(target)) profiles.add(target);
    else events.add(target);
  }
  return { profiles: [...profiles], events: [...events] };
}

const PROFILE_HOSTS = ['instagram.com', 'facebook.com', 'fb.com', 'x.com', 'twitter.com', 'tiktok.com', 'youtube.com'];

/** A social URL that names an account (one path segment, or `/@name`), not a post or a search. */
function isProfileUrl(target: string): boolean {
  if (!/^https?:\/\//.test(target)) return false;
  try {
    const url = new URL(target);
    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (!PROFILE_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return false;
    const parts = url.pathname.split('/').filter(Boolean);
    return parts.length === 1 || (parts.length === 2 && parts[0].startsWith('@'));
  } catch {
    return false;
  }
}
