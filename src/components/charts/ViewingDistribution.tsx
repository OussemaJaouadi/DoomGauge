// React & 3rd-party
import React, { useState, type CSSProperties } from 'react';

// Types
import type { ViewingDistribution as Distribution } from '../../types/popup';

// UI Components
import { Hint } from '../ui/Hint';

// Utilities & Helpers
import { formatTime } from '../../utils/time';
import { measurementHints } from '../ui/hintContent';

// Styles
import './ViewingDistribution.css';

const colors = [
  'var(--threat-red)',
  'var(--accent-amber)',
  'var(--duration-short)',
  'var(--accent-blue)',
  'var(--platform-ig)',
];

const share = (value: number, available: boolean) => available ? `${value.toFixed(1)}%` : '—';

export function ViewingDistribution({ data }: { data: Distribution }) {
  const [hovered, setHovered] = useState<{
    index: number;
    left: number;
    top: number;
    width: number;
  } | null>(null);

  const handleEnter = (e: React.MouseEvent<HTMLElement> | React.FocusEvent<HTMLElement>, index: number) => {
    const section = e.currentTarget.closest('.viewing-distribution');
    if (!section) return;
    const sRect = section.getBoundingClientRect();
    const tRect = e.currentTarget.getBoundingClientRect();
    setHovered({
      index,
      left: tRect.left - sRect.left,
      top: tRect.top - sRect.top,
      width: tRect.width,
    });
  };

  const getTooltipStyle = (): CSSProperties => {
    if (!hovered) return { display: 'none' };
    const { left, top, width } = hovered;

    // Anchor exactly 6px above the hovered element
    const yPos = `${top - 6}px`;

    // Near left edge (< 70px): anchor from left edge so it NEVER clips past left window border
    if (left < 70) {
      return {
        left: `${Math.max(0, left)}px`,
        top: yPos,
        transform: 'translateY(-100%)',
      };
    }

    // Near right edge (> 380px): anchor from right edge so it NEVER clips past right window border
    if (left + width > 380) {
      return {
        left: `${left + width}px`,
        top: yPos,
        transform: 'translate(-100%, -100%)',
      };
    }

    // Middle elements: center snugly over the element
    return {
      left: `${left + width / 2}px`,
      top: yPos,
      transform: 'translate(-50%, -100%)',
    };
  };

  const activeBucket = hovered ? data.buckets[hovered.index] : null;

  return (
    <section className="popup-signal viewing-distribution" aria-labelledby="distribution-heading">
      <div className="popup-signal-heading">
        <h2 id="distribution-heading">Attention Depth <span>(Reels vs Time)</span></h2>
        <Hint accent="blue" label="How viewing duration is grouped"
          text={measurementHints.popupDistribution} />
      </div>

      <div className="distribution-bars">
        {(['count', 'time'] as const).map(metric => (
          <div className="distribution-row" key={metric}>
            <span className="distribution-label">{metric === 'count' ? 'Reels' : 'Active time'}</span>
            <div
              className="distribution-track"
              role="img"
              aria-label={`${metric === 'count' ? 'Reel shares' : 'Active time shares'}: ${data.buckets.map(item => `${item.label} ${share(metric === 'count' ? item.countPct : item.timePct, metric === 'count' ? data.totalCount > 0 : data.totalMs > 0)}`).join(', ')}`}
            >
              {data.buckets.map((item, index) => (
                <span
                  key={item.label}
                  className={`distribution-segment ${hovered?.index === index ? 'selected' : ''}`}
                  style={{ width: `${metric === 'count' ? item.countPct : item.timePct}%`, background: colors[index] }}
                  onMouseEnter={(e) => handleEnter(e, index)}
                  onMouseLeave={() => setHovered(null)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="distribution-legend" role="group" aria-label="Inspect viewing duration">
        {data.buckets.map((item, index) => (
          <button
            type="button"
            key={item.label}
            className={`distribution-legend-btn ${hovered?.index === index ? 'selected' : ''}`}
            aria-pressed={hovered?.index === index}
            onMouseEnter={(e) => handleEnter(e, index)}
            onMouseLeave={() => setHovered(null)}
            onFocus={(e) => handleEnter(e, index)}
            onBlur={() => setHovered(null)}
          >
            <span style={{ background: colors[index] }} aria-hidden="true" />
            {item.label}
          </button>
        ))}
      </div>

      {activeBucket && hovered && (
        <div
          className="distribution-tooltip"
          style={getTooltipStyle()}
          role="tooltip"
        >
          <div className="distribution-tooltip-head">
            <span className="distribution-tooltip-dot" style={{ background: colors[hovered.index] }} />
            <strong>{activeBucket.label}</strong>
          </div>
          <div className="distribution-tooltip-body">
            <span>{activeBucket.count} reels <b>({share(activeBucket.countPct, data.totalCount > 0)})</b></span>
            <span className="distribution-tooltip-sep">·</span>
            <span>{formatTime(activeBucket.activeMs)} active <b>({share(activeBucket.timePct, data.totalMs > 0)})</b></span>
          </div>
        </div>
      )}
    </section>
  );
}
