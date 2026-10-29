import { brand } from '@/brand.config';

/**
 * Concrete SVG-safe chart colors in rank order (the busiest first), the same
 * series as `--chart-1…6` in globals.css: the brand, then Inerpy's palette.
 * A plain module so server pages can read them.
 */
export const CHART_COLORS: readonly string[] = [brand.accent, '#0d9488', '#f59e0b', '#8b5cf6', '#0ea5e9', '#db2777'];
/** The fold-in slot ("Other"). */
export const OTHER_COLOR = '#a1a1aa';
/** Sentiment, the same everywhere a chart or a dot shows it (emerald / zinc / rose). */
export const SENTIMENT_COLORS = { positive: '#10b981', neutral: '#a1a1aa', negative: '#f43f5e' } as const;
