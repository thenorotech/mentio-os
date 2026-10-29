/**
 * Reading Apify dataset items, whose shape is each actor's own: every helper
 * takes `unknown`, narrows it and falls back, so a field an actor renames
 * empties a metric instead of breaking a page.
 */

type Obj = { readonly [key: string]: unknown };

export const isObj = (value: unknown): value is Obj => typeof value === 'object' && value !== null && !Array.isArray(value);

/** A nested value: `at(item, 'author', 'followers')`. */
export const at = (value: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((current, key) => (isObj(current) ? current[key] : undefined), value);

export const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** The first non-empty string. */
export function text(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return null;
}

/** The first non-negative number (numeric strings too, "1,234" included); 0 when none. */
export function count(...values: unknown[]): number {
  for (const value of values) {
    const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(/[,\s]/g, '')) : NaN;
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return 0;
}

/** Like `count`, but null when no value is a number (a follower count nobody reported). */
export function maybeCount(...values: unknown[]): number | null {
  const known = values.filter((v) => (typeof v === 'number' && Number.isFinite(v)) || (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v.replace(/[,\s]/g, '')))));
  return known.length ? count(...known) : null;
}

/** An ISO date from an ISO string, a parseable date string, or a Unix time in seconds or milliseconds. */
export function when(...values: unknown[]): string | null {
  for (const value of values) {
    let ms = NaN;
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) ms = value < 1e12 ? value * 1000 : value;
    else if (typeof value === 'string' && value.trim()) ms = /^\d+$/.test(value) ? Number(value) * (value.length <= 10 ? 1000 : 1) : Date.parse(value);
    // Past ±8.64e15 ms a Date is invalid and toISOString throws.
    if (Number.isFinite(ms) && Math.abs(ms) <= 8.64e15) return new Date(ms).toISOString();
  }
  return null;
}

/** Hashtags from a list (strings or { name | text } objects) and from the text itself, lowercased, once each. */
export function hashtags(body: string | null, ...lists: unknown[]): string[] {
  const tags = new Set<string>();
  for (const value of lists.flatMap(list)) {
    const tag = text(value, at(value, 'name'), at(value, 'text'), at(value, 'tag'));
    if (tag) tags.add(tag.replace(/^#/, '').toLowerCase());
  }
  for (const match of (body ?? '').matchAll(/#([\p{L}\p{N}_]+)/gu)) tags.add(match[1].toLowerCase());
  return [...tags];
}

/** A URL's host without "www.", or null. */
export function host(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
