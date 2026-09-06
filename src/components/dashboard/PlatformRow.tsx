// React & 3rd-party
import React from 'react';
import { MonitorPlay, Camera, MessageCircle } from 'lucide-react';

// Utils
import { formatTime } from '../../utils/time';

// Types
import type { Platform } from '../../types/models';

// Styles
import './PlatformRow.css';

const platformMeta: Record<Platform, { label: string; icon: React.ReactNode; color: string }> = {
  youtube: { label: 'YouTube', icon: <MonitorPlay size={14} />, color: 'var(--platform-yt)' },
  instagram: { label: 'Instagram', icon: <Camera size={14} />, color: 'var(--platform-ig)' },
  facebook: { label: 'Facebook', icon: <MessageCircle size={14} />, color: 'var(--platform-fb)' },
};

export interface PlatformRowProps {
  platform: Platform;
  count: number;
  timeMs: number;
  maxCount?: number;
  mode?: 'time' | 'count';
  totalTimeMs?: number;
  totalCount?: number;
  onClick?: () => void;
}

export function PlatformRow({ platform, count, timeMs, maxCount, mode = 'time', totalTimeMs, totalCount, onClick }: PlatformRowProps) {
  const meta = platformMeta[platform];
  let pct = 0;
  if (mode === 'time' && totalTimeMs && totalTimeMs > 0) {
    pct = Math.round((timeMs / totalTimeMs) * 100);
  } else if (mode === 'count' && totalCount && totalCount > 0) {
    pct = Math.round((count / totalCount) * 100);
  } else if (maxCount && maxCount > 0) {
    pct = Math.round((count / maxCount) * 100);
  }
  const Component: any = onClick ? 'button' : 'div';
  return (
    <Component
      className="platform-row"
      data-platform={platform}
      onClick={onClick}
      aria-label={`View ${meta.label} details: ${formatTime(timeMs)}, ${count} reels (${pct}% of total ${mode})`}
      style={onClick ? { cursor: 'pointer', width: '100%', textAlign: 'left' } as any : undefined}
    >
      <div className="platform-row-main">
        <span className="platform-row-icon" style={{ color: meta.color }}>{meta.icon}</span>
        <span className="platform-row-label">{meta.label}</span>
        <span className="platform-row-count" style={{ color: mode === 'count' ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {count} <span style={{ fontSize: '0.65rem', fontWeight: 500, color: 'var(--text-muted)' }}>reels</span>
        </span>
        <span className="platform-row-time" style={{ color: mode === 'time' ? 'var(--text-primary)' : 'var(--text-muted)' }}>
          {formatTime(timeMs)}
        </span>
        <span style={{ fontSize: '0.68rem', fontWeight: 700, color: meta.color, minWidth: '32px', textAlign: 'right' }}>
          {pct}%
        </span>
      </div>
      <div className="platform-row-bar">
        <div className="platform-row-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
      </div>
      {onClick && <span className="platform-row-chevron">→</span>}
    </Component>
  );
}
