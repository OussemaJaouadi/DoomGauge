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
  maxCount: number;
  onClick?: () => void;
}

export function PlatformRow({ platform, count, timeMs, maxCount, onClick }: PlatformRowProps) {
  const meta = platformMeta[platform];
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  const Component: any = onClick ? 'button' : 'div';
  return (
    <Component className="platform-row" data-platform={platform} onClick={onClick} aria-label={`View ${meta.label} details`} style={onClick?{cursor:'pointer', width:'100%', textAlign:'left'} as any: undefined}>
      <div className="platform-row-main">
        <span className="platform-row-icon" style={{ color: meta.color }}>{meta.icon}</span>
        <span className="platform-row-label">{meta.label}</span>
        <span className="platform-row-count">{count}</span>
        <span className="platform-row-time">{formatTime(timeMs)}</span>
      </div>
      <div className="platform-row-bar">
        <div className="platform-row-bar-fill" style={{ width: `${pct}%`, background: meta.color }} />
      </div>
      {onClick && <span className="platform-row-chevron">→</span>}
    </Component>
  );
}
