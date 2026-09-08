import React from 'react';
import { Download, X, ChevronLeft, ChevronRight } from 'lucide-react';
import type { TimeRange } from '../../types/telemetry';
import './TelemetryTopBar.css';

interface TelemetryTopBarProps {
  range: TimeRange;
  onRangeChange: (r: TimeRange) => void;
  endDate: Date;
  onBack: () => void;
  onForward: () => void;
  sliceLabel: string;
  totalDrained: string;
  onExport: () => void;
  onClose: () => void;
}

export function TelemetryTopBar({
  range, onRangeChange, endDate, onBack, onForward,
  sliceLabel, totalDrained, onExport, onClose,
}: TelemetryTopBarProps) {
  const isToday = endDate.toDateString() === new Date().toDateString();

  return (
    <header className="telemetry-topbar">
      <div className="telemetry-brand-block">
        <span className="telemetry-brand-title">DOOMGAUGE</span>
        <span className="telemetry-brand-sub">TELEMETRY</span>
      </div>

      <div className="flight-controller">
        <div className="flight-horizon-group" role="group" aria-label="Time horizon">
          <button
            type="button"
            className={`horizon-btn ${range === 'day' ? 'active' : ''}`}
            onClick={() => onRangeChange('day')}
            aria-pressed={range === 'day'}
          >
            Day
          </button>
          <button
            type="button"
            className={`horizon-btn ${range === '7d' ? 'active' : ''}`}
            onClick={() => onRangeChange('7d')}
            aria-pressed={range === '7d'}
          >
            7d
          </button>
          <button
            type="button"
            className={`horizon-btn ${range === '30d' ? 'active' : ''}`}
            onClick={() => onRangeChange('30d')}
            aria-pressed={range === '30d'}
          >
            30d
          </button>
        </div>

        <div className="flight-divider" />

        <div className="flight-stepper">
          <button
            type="button"
            className="flight-step-btn"
            onClick={onBack}
            aria-label="Previous observation window"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="flight-window-label">
            {sliceLabel}
          </span>
          <button
            type="button"
            className="flight-step-btn"
            onClick={onForward}
            disabled={isToday}
            aria-label="Next observation window"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <div className="telemetry-payload-group">
        <div className="drained-capsule" title="Cumulative active scrolling time in this window">
          <span className="drained-label">Active Time</span>
          <span className="drained-value">{totalDrained}</span>
        </div>

        <div className="telemetry-tool-actions">
          <button
            type="button"
            className="tool-btn export-tool-btn"
            onClick={onExport}
            aria-label="Export minified JSON"
            title="Export minified JSON"
          >
            <Download size={14} />
          </button>
          <button
            type="button"
            className="tool-btn close-tool-btn"
            onClick={onClose}
            aria-label="Close telemetry tab"
            title="Close tab"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </header>
  );
}
