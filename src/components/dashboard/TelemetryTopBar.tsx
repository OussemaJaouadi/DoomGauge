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
      {/* 1. Left: Cockpit System Callout */}
      <div className="telemetry-brand-block">
        <div className="telemetry-pulse-socket" title="System Live Telemetry">
          <span className="telemetry-pulse-dot" />
        </div>
        <div className="telemetry-brand-titles">
          <span className="telemetry-brand-title">DOOMGAUGE</span>
          <span className="telemetry-brand-sub">FLIGHT RECORDER</span>
        </div>
      </div>

      {/* 2. Center: Unified Flight Window Controller */}
      <div className="flight-controller">
        <div className="flight-horizon-group">
          <button
            type="button"
            className={`horizon-btn ${range === 'day' ? 'active' : ''}`}
            onClick={() => onRangeChange('day')}
            title="Single day observation"
          >
            DAY
          </button>
          <button
            type="button"
            className={`horizon-btn ${range === '7d' ? 'active' : ''}`}
            onClick={() => onRangeChange('7d')}
            title="7-day rolling window"
          >
            7D
          </button>
          <button
            type="button"
            className={`horizon-btn ${range === '30d' ? 'active' : ''}`}
            onClick={() => onRangeChange('30d')}
            title="30-day macro trend"
          >
            30D
          </button>
        </div>

        <div className="flight-divider" />

        <div className="flight-stepper">
          <button
            type="button"
            className="flight-step-btn"
            onClick={onBack}
            aria-label="Previous observation window"
            title="Step backward"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="flight-window-label" title="Active observation window">
            {sliceLabel}
          </span>
          <button
            type="button"
            className="flight-step-btn"
            onClick={onForward}
            disabled={isToday}
            aria-label="Next observation window"
            title={isToday ? 'Anchored to current day' : 'Step forward'}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* 3. Right: Telemetry Gauge & Fast Utility Triggers */}
      <div className="telemetry-payload-group">
        <div className="drained-capsule" title="Cumulative active scrolling time in this window">
          <span className="drained-label">DRAINED</span>
          <span className="drained-value">{totalDrained}</span>
        </div>

        <div className="telemetry-tool-actions">
          <button
            type="button"
            className="tool-btn export-tool-btn"
            onClick={onExport}
            aria-label="Export minified JSON"
            title="Export minified JSON telemetry (R8)"
          >
            <Download size={13} />
          </button>
          <button
            type="button"
            className="tool-btn close-tool-btn"
            onClick={onClose}
            aria-label="Close telemetry tab"
            title="Close telemetry command center"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </header>
  );
}
