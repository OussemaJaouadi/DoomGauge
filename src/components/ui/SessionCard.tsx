import React from 'react';
import { Zap } from 'lucide-react';
import { formatTime } from '../../utils/time';
import './SessionCard.css';

export interface SessionCardProps {
  label?: string;
  icon?: React.ReactNode;
  timeRange?: string | null;
  elapsedMs: number;
  activeMs: number;
  reelCount: number;
  concentrationPct?: number;
  activeConcentrationPct?: number;
  className?: string;
}

export function SessionCard({
  label = 'Worst Vortex',
  icon = <Zap size={13} />,
  timeRange,
  elapsedMs,
  activeMs,
  reelCount,
  concentrationPct,
  activeConcentrationPct,
  className = '',
}: SessionCardProps) {
  if (reelCount <= 0 || elapsedMs <= 0) {
    return (
      <div className={`ui-session-card empty ${className}`}>
        <div className="session-card-head">
          <span className="session-card-label">
            {icon && <span className="session-card-icon">{icon}</span>}
            {label}
          </span>
          <span className="session-card-badge">Clean</span>
        </div>
        <div className="session-card-empty-note">No continuous doom-scrolling detected today</div>
      </div>
    );
  }

  const dwellMs = Math.max(0, elapsedMs - activeMs);
  const activePct = Math.min(100, Math.max(0, Math.round((activeMs / elapsedMs) * 100)));
  const dwellPct = 100 - activePct;

  return (
    <div className={`ui-session-card ${className}`}>
      <div className="session-card-head">
        <span className="session-card-label">
          {icon && <span className="session-card-icon">{icon}</span>}
          {label}
        </span>
        {timeRange && <span className="session-card-time">{timeRange}</span>}
      </div>

      <div className="session-card-hero">
        <div className="session-card-duration">
          <span className="session-card-val">{formatTime(elapsedMs)}</span>
          <span className="session-card-unit">session span</span>
        </div>
        <div className="session-card-volume">
          <span className="session-card-reels">{reelCount} reels</span>
        </div>
      </div>

      <div className="session-card-shares">
        {concentrationPct !== undefined && <span className="session-card-pill">{concentrationPct}% of today’s reels</span>}
        {activeConcentrationPct !== undefined && <span className="session-card-pill">{activeConcentrationPct}% of today’s active time</span>}
      </div>

      <div className="session-card-bar" role="progressbar" aria-valuenow={activePct} aria-valuemin={0} aria-valuemax={100} aria-label="Session watch vs pauses and gaps">
        <span className="session-bar-active" style={{ width: `${activePct}%` }} title={`Active watch: ${formatTime(activeMs)} (${activePct}%)`} />
        <span className="session-bar-dwell" style={{ width: `${dwellPct}%` }} title={`Pauses & gaps: ${formatTime(dwellMs)} (${dwellPct}%)`} />
      </div>

      <div className="session-card-foot">
        <span className="session-foot-item session-foot-active">
          <span className="dot dot-active" />
          {formatTime(activeMs)} video ({activePct}%)
        </span>
        <span className="session-foot-item session-foot-dwell">
          <span className="dot dot-dwell" />
          {formatTime(dwellMs)} pauses & gaps
        </span>
      </div>
    </div>
  );
}
