import React from 'react';
import { PLATFORMS } from '../../types/models';
import { chartTokens } from '../tokens';
import { formatTime } from '../../utils/time';

export interface PlatformAttributionProps {
  data: {
    events: any[];
  };
}

export function PlatformAttribution({ data }: PlatformAttributionProps) {
  return (
    <div className="chart-panel full">
      <div className="panel-title">Attribution</div>
      <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
        {PLATFORMS.map(p => {
          const pEvents = data.events.filter(e => e.platform === p);
          const pTime = pEvents.reduce((acc, e) => acc + e.durationMs, 0);
          const color = chartTokens.platform[p];
          return (
            <div key={p} style={{ flex: 1, background: 'var(--bg-root)', padding: '24px', borderRadius: '12px', border: `1px solid var(--border-subtle)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                {p}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 900, margin: '16px 0', color }}>
                {formatTime(pTime)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>{pEvents.length} Reels</span>
                <span>{pEvents.filter(e => e.skipped).length} Skips</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
