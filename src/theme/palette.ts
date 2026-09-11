import type { ThemePreference, ResolvedTheme } from '../types/theme';
export function isThemePreference(value: unknown): value is ThemePreference { return value === 'system' || value === 'light' || value === 'dark'; }
export function resolveTheme(preference: ThemePreference, systemDark: boolean): ResolvedTheme { return preference === 'system' ? systemDark ? 'dark' : 'light' : preference; }

const dark = {
  'duration-short': '#7193ba', 'duration-medium': '#87a5c9', 'duration-long': '#c1d6ef',
  'bg-root': '#10151c', 'bg-surface': '#202a36', 'bg-surface-raised': '#2d3a4a',
  'border-subtle': '#445367', 'border-grid': '#354354', 'border-control': '#8293a8',
  'text-primary': '#edf1f7', 'text-secondary': '#b7c2cf', 'text-muted': '#a5b2c2',
  'accent-blue': '#89b4ff', 'chart-overview': '#89b4ff',
  'platform-yt': '#ff9478', 'platform-ig': '#c99aff', 'platform-fb': '#60d7ed',
  'chart-youtube': '#ff9478', 'chart-instagram': '#c99aff', 'chart-facebook': '#60d7ed',
  'usage-increased': '#f4b860', 'usage-decreased': '#2dd4bf', 'chart-previous': '#e9c46a', 'threat-red': '#ff7b86',
  'overlay-scrim': 'rgb(0 0 0 / 60%)', 'shadow-overlay': '0 12px 32px rgb(0 0 0 / 35%)',
};
const light: typeof dark = {
  'duration-short': '#657f9e', 'duration-medium': '#466b95', 'duration-long': '#163d70',
  'bg-root': '#edf1f5', 'bg-surface': '#ffffff', 'bg-surface-raised': '#e2e8f0',
  'border-subtle': '#c3ccd7', 'border-grid': '#d6dde6', 'border-control': '#778494',
  'text-primary': '#17212d', 'text-secondary': '#46556a', 'text-muted': '#526277',
  'accent-blue': '#2458a6', 'chart-overview': '#2458a6',
  'platform-yt': '#b74025', 'platform-ig': '#7732b4', 'platform-fb': '#006e86',
  'chart-youtube': '#b74025', 'chart-instagram': '#7732b4', 'chart-facebook': '#006e86',
  'usage-increased': '#8a5700', 'usage-decreased': '#087064', 'chart-previous': '#805e00', 'threat-red': '#b42338',
  'overlay-scrim': 'rgb(23 33 45 / 30%)', 'shadow-overlay': '0 12px 32px rgb(23 33 45 / 16%)',
};
export const themePalettes = { dark, light };
