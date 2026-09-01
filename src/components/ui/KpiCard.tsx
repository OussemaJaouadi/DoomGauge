import React from 'react';
import './KpiCard.css';

type Accent = 'yt' | 'ig' | 'fb' | 'green' | 'magenta' | 'default';

export interface KpiCardProps {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  unit?: string;
  sublabel?: string;
  accent?: Accent;
  className?: string;
}

const accentVar: Record<Accent, string> = {
  yt: 'var(--platform-yt)',
  ig: 'var(--platform-ig)',
  fb: 'var(--platform-fb)',
  green: 'var(--accent-green)',
  magenta: 'var(--accent-magenta)',
  default: 'var(--text-muted)',
};

export function KpiCard({ icon, label, value, unit, sublabel, accent = 'default', className = '' }: KpiCardProps) {
  return (
    <div className={`ui-kpi-card ui-kpi-accent-${accent} ${className}`}>
      <div className="ui-kpi-label">
        {icon && <span className="ui-kpi-icon" style={{ color: accentVar[accent] }}>{icon}</span>}
        {label}
      </div>
      <div className="ui-kpi-value">
        {value}
        {unit && <span className="ui-kpi-unit">{unit}</span>}
      </div>
      {sublabel && <div className="ui-kpi-sublabel">{sublabel}</div>}
    </div>
  );
}
