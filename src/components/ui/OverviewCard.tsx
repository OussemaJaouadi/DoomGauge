import React from 'react';
import './OverviewCard.css';

interface OverviewCardProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: string;
  trend?: 'positive' | 'negative' | 'neutral';
  border?: string;
  className?: string;
}

export function OverviewCard({ label, value, sub, icon, accent, trend = 'neutral', border, className = '' }: OverviewCardProps) {
  return (
    <div 
      className={`ui-overview-card ui-overview-${trend} ${className}`}
      style={{
        '--accent': accent,
        '--border': border,
      } as React.CSSProperties}
    >
      {icon && <div className="ui-overview-icon">{icon}</div>}
      <div className="ui-overview-label">{label}</div>
      <div className="ui-overview-value">{value}</div>
      {sub && <div className="ui-overview-sub">{sub}</div>}
    </div>
  );
}
