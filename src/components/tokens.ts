// MIRROR DISCIPLINE: Recharts cannot read CSS vars, so these hexes duplicate
// src/styles/global.css + docs/DESIGN.md. Change all three together. Ever.
export const chartTokens = {
  bgRoot: '#090d13',
  bgSurface: '#0f141c',
  borderSubtle: '#1c2838',
  borderGrid: '#16222f',
  textPrimary: '#f0f6fc',
  textSecondary: '#8b949e',
  textMuted: '#545d68',
  platform: {
    youtube: '#ff6b4a',
    instagram: '#a855f7',
    facebook: '#00b4d8',
  },
  accentGreen: '#00ff88',
  accentAmber: '#ffd700',
  threatRed: '#ff2a3b',
  allPlatforms: '#4f80ff',
  freezeSlate: '#64748b',
  /** Surface B scoped supporting text / borders (docs/DESIGN.md telemetry refinement). */
  telemetryTextSecondary: '#c0cbd8',
  telemetryBorder: '#3b4d63',
  fontMono: 'JetBrains Mono, ui-monospace, SF Mono, Cascadia Code, Fira Code, monospace',
} as const;

/** Shared Recharts theme: oscilloscope grid, muted mono ticks, square data dots. */
export const chartTheme = {
  grid: { stroke: '#16222f', strokeDasharray: '3 3', strokeOpacity: 0.6 },
  tick: { fill: '#545d68', fontFamily: 'JetBrains Mono, ui-monospace, monospace', fontSize: 10 },
  axisLine: { stroke: '#1c2838' },
  cursor: { fill: 'rgba(255,255,255,0.03)' },
  dotRadius: 2,
} as const;
