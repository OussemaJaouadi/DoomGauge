import React from 'react';
import './OverviewCard.css';

export interface OverviewDeltaConfig {
  value: number;
  trend: 'worse' | 'better' | 'neutral';
  style: 'arrow' | 'sign';
  formatter?: (absVal: number) => string;
}

export interface OverviewCardProps {
  label: string;
  icon?: React.ReactNode;
  value: React.ReactNode;
  delta?: OverviewDeltaConfig | React.ReactNode;
  baseline?: React.ReactNode;
  sub?: React.ReactNode;
  accent?: 'blue' | 'amber' | 'teal' | 'neutral';
  trend?: 'worse' | 'better' | 'neutral';
  className?: string;
}

export function OverviewCard({
  label,
  icon,
  value,
  delta,
  baseline,
  sub,
  accent,
  trend = 'neutral',
  className = '',
}: OverviewCardProps) {
  const resolvedAccent = accent ?? (trend === 'worse' ? 'amber' : trend === 'better' ? 'teal' : 'neutral');
  const renderDelta = () => {
    if (!delta) return null;
    if (React.isValidElement(delta)) return delta;
    if (typeof delta === 'object' && 'value' in delta && 'trend' in delta) {
      const config = delta as OverviewDeltaConfig;
      const abs = Math.abs(config.value);
      const formattedNum = config.formatter ? config.formatter(abs) : String(abs);

      let glyph = '';
      if (config.value !== 0) {
        if (config.style === 'arrow') {
          glyph = config.value > 0 ? '▲ ' : '▼ ';
        } else {
          glyph = config.value > 0 ? '+' : '-';
        }
      } else {
        glyph = config.style === 'arrow' ? '— ' : '';
      }

      return (
        <span className={`overview-gain overview-gain-${config.trend}`}>
          {glyph}{formattedNum}
        </span>
      );
    }
    return null;
  };

  return (
    <div className={`overview-card overview-card-${trend} overview-card-accent-${resolvedAccent} ${className}`}>
      <div className="overview-card-header">
        <span className="overview-card-label">{label}</span>
        {icon && <span className="overview-card-icon">{icon}</span>}
      </div>
      <div className="overview-card-value">{value}</div>
      <div className="overview-card-footer">
        {renderDelta()}
        {baseline && (
          <>
            <span className="overview-footer-sep">·</span>
            <span className="overview-footer-baseline">{baseline}</span>
          </>
        )}
        {sub}
      </div>
    </div>
  );
}

