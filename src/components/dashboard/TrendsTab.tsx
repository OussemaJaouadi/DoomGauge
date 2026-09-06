import React from 'react';
import HourlyBars from '../charts/HourlyBars';
import { HOURLY_MOCK } from '../../data/popupMock';

export function TrendsTab() {
  const busiestHour = [...HOURLY_MOCK].sort((a, b) => b.total - a.total)[0];

  return (
    <div className="trends-tab">
      {busiestHour && (
        <div className="hourly-peak-annotation">
          <div>
            <div className="hourly-peak-label">Peak Vulnerability Hour</div>
            <div className="hourly-peak-time">
              {busiestHour.label}:00 – {String(busiestHour.hour + 1).padStart(2, '0')}:00
            </div>
          </div>
          <div className="hourly-peak-count">
            <span style={{ fontWeight: 800, color: 'var(--threat-red)', fontSize: '1.1rem' }}>{busiestHour.total}</span> reels
          </div>
        </div>
      )}
      <HourlyBars data={HOURLY_MOCK} />
    </div>
  );
}
