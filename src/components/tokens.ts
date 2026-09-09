// CSS roles resolve in SVG strokes/fills as well as DOM styles. Palette SSOT: theme/palette.ts.
export const chartTokens = {
  bgRoot: 'var(--bg-root)', bgSurface: 'var(--bg-surface)', borderSubtle: 'var(--border-subtle)', borderGrid: 'var(--border-grid)',
  textPrimary: 'var(--text-primary)', textSecondary: 'var(--text-secondary)', textMuted: 'var(--text-muted)',
  platform: { youtube: 'var(--platform-yt)', instagram: 'var(--platform-ig)', facebook: 'var(--platform-fb)' },
  accentGreen: 'var(--usage-decreased)', accentAmber: 'var(--usage-increased)', threatRed: 'var(--threat-red)',
  allPlatforms: 'var(--chart-overview)', freezeSlate: 'var(--freeze-slate)',
  telemetryTextSecondary: 'var(--text-secondary)', telemetryBorder: 'var(--border-subtle)',
  fontMono: 'var(--font-mono)',
} as const;
export const chartTheme = {
  grid: { stroke: 'var(--border-grid)', strokeDasharray: '3 3', strokeOpacity: 0.6 },
  tick: { fill: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 12 },
  axisLine: { stroke: 'var(--border-subtle)' }, cursor: { fill: 'var(--chart-hover)' }, dotRadius: 2,
} as const;
