import React from 'react';
import type { Daypart } from '../../types/telemetry';
import { DAYPARTS } from '../../types/telemetry';
import type { DaypartBin } from '../../utils/telemetry';
import { formatTime } from '../../utils/time';

interface CircadianClockProps {
  /** 7 (or 30) rows × 24 hour columns of reel counts */
  matrix: number[][];
  bins: Record<Daypart, DaypartBin>;
}

const DAYPART_HOURS: Record<Daypart, number[]> = {
  MORNING: Array.from({ length: 6 }, (_, i) => i + 6),
  AFTERNOON: Array.from({ length: 6 }, (_, i) => i + 12),
  PRIME: Array.from({ length: 5 }, (_, i) => i + 18),
  GRAVEYARD: [23, 0, 1, 2, 3, 4, 5],
};

function hourDaypart(h: number): Daypart {
  if (h >= 6 && h < 12) return 'MORNING';
  if (h >= 12 && h < 18) return 'AFTERNOON';
  if (h >= 18 && h < 23) return 'PRIME';
  return 'GRAVEYARD';
}

export function CircadianClock({ matrix, bins }: CircadianClockProps) {
  const max = Math.max(1, ...matrix.flat());
  const graveyard = bins.GRAVEYARD;

  return (
    <div className="lens-panel">
      <div className="lens-title">CIRCADIAN INTENSITY — 24h distribution</div>
      <div className="heatmap" role="img" aria-label="Hourly intensity heatmap">
        {matrix.map((row, d) => (
          <div key={d} className="heatmap-row">
            <span className="heatmap-day">D-{matrix.length - d}</span>
            {row.map((v, h) => {
              const hot = v / max;
              return (
                <span
                  key={h}
                  className="heatmap-cell"
                  title={`${String(h).padStart(2, '0')}:00 — ${v} reels`}
                  style={{
                    background:
                      v === 0
                        ? 'transparent'
                        : `rgba(79, 128, 255, ${0.12 + hot * 0.88})`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="lens-grid4">
        {DAYPARTS.map((d) => (
          <div key={d.id} className="daypart-chip">
            <div className="daypart-name">{d.label} <span>{d.range}</span></div>
            <div className="daypart-value">{DAYPART_HOURS[d.id].length}h · {bins[d.id].reels} reels</div>
            <div className="daypart-sub">{formatTime(bins[d.id].activeMs)}</div>
          </div>
        ))}
      </div>
      <div className="lens-note">
        GRAVEYARD WINDOW: {formatTime(graveyard.activeMs)} active (23:00–06:00 · {graveyard.reels} reels).
      </div>
    </div>
  );
}
