import React, { useState } from 'react';
import { getTelemetryFixture } from '../../data/mock';
import type { Daypart, Lens, TimeRange } from '../../types/telemetry';
import { LENSES } from '../../types/telemetry';
import type { Platform } from '../../types/models';
import { PLATFORMS } from '../../types/models';
import { formatTime, localDateKey } from '../../utils/time';
import { binDayparts, daypartOfHour, hourlyMatrix } from '../../utils/telemetry';
import './App.css';

// Control plane + lenses
import { TelemetrySidebar } from '../../components/dashboard/TelemetrySidebar';
import { TelemetryTopBar } from '../../components/dashboard/TelemetryTopBar';
import { MacroTrajectory } from '../../components/dashboard/MacroTrajectory';
import { CircadianClock } from '../../components/dashboard/CircadianClock';
import { SurvivalCurves } from '../../components/dashboard/SurvivalCurves';
import { SessionGravity } from '../../components/dashboard/SessionGravity';
import { NeuroMap } from '../../components/dashboard/NeuroMap';

const LENS_DESC: Record<Lens, string> = {
  trajectory: 'VOL · 3CH · DEBT',
  circadian: '24H INTENSITY · 4 DAYPARTS',
  survival: 'S(t) · CLIFF · LOCK-IN',
  gravity: 'FANO · RUNAWAYS · SESSIONS',
  neuro: 'FORAGE/FREEZE · CI · ROI',
};

const RANGE_DAYS: Record<TimeRange, number> = { day: 1, '7d': 7, '30d': 30 };

export default function App() {
  const [lens, setLens] = useState<Lens>('trajectory');
  const [range, setRange] = useState<TimeRange>('7d');
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [platforms, setPlatforms] = useState<Record<Platform, boolean>>({
    youtube: true,
    instagram: true,
    facebook: true,
  });
  const [dayparts, setDayparts] = useState<Record<Daypart, boolean>>({
    MORNING: true,
    AFTERNOON: true,
    PRIME: true,
    GRAVEYARD: true,
  });

  const fixture = getTelemetryFixture(endDate, range);
  const activePlatforms = PLATFORMS.filter((p) => platforms[p]);
  const visibleRollups = fixture.rollups.filter((r) => platforms[r.platform]);
  const visibleEvents = fixture.events.filter(
    (e) => platforms[e.platform] && dayparts[daypartOfHour(new Date(e.ts).getHours())],
  );

  const step = RANGE_DAYS[range];
  const goBack = () => setEndDate((d) => new Date(d.getTime() - step * 86400000));
  const goForward = () => setEndDate((d) => {
    const next = new Date(d.getTime() + step * 86400000);
    const today = new Date();
    return next > today ? today : next;
  });

  const dates = [...new Set(visibleRollups.map((r) => r.date))].sort();
  const sliceLabel =
    range === 'day' || dates.length <= 1
      ? localDateKey(endDate)
      : `${dates[0]} → ${dates[dates.length - 1]}`;
  const totalDrained = formatTime(visibleRollups.reduce((s, r) => s + r.totalActiveMs, 0));

  const exportJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      range,
      slice: sliceLabel,
      rollups: visibleRollups,
    };
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doomgauge-export-${localDateKey(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lensMeta = LENSES.find((l) => l.id === lens)!;

  return (
    <div className="app-shell">
      <TelemetrySidebar
        lens={lens}
        onLensChange={setLens}
        platforms={platforms}
        onTogglePlatform={(p) => setPlatforms((v) => ({ ...v, [p]: !v[p] }))}
        dayparts={dayparts}
        onToggleDaypart={(d) => setDayparts((v) => ({ ...v, [d]: !v[d] }))}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => {
          setIsCollapsed((c) => !c);
          setTimeout(() => window.dispatchEvent(new Event('resize')), 220);
        }}
      />

      <main className="main-content">
        <TelemetryTopBar
          range={range}
          onRangeChange={setRange}
          endDate={endDate}
          onBack={goBack}
          onForward={goForward}
          sliceLabel={sliceLabel}
          totalDrained={totalDrained}
          onExport={exportJson}
          onClose={() => window.close()}
        />

        <div className="view-container">
          <div className="view-header">
            <h1 className="view-title">
              {lensMeta.index} // {lensMeta.label.toUpperCase()}
            </h1>
            <p className="view-desc">
              {LENS_DESC[lens]} · {activePlatforms.length}CH
            </p>
          </div>

          <div className="dashboard-grid" key={`${isCollapsed ? 'col' : 'exp'}-${lens}-${range}`}>
            {lens === 'trajectory' && <MacroTrajectory rollups={visibleRollups} visible={platforms} />}
            {lens === 'circadian' && (
              <CircadianClock
                matrix={hourlyMatrix(visibleEvents, RANGE_DAYS[range], endDate)}
                bins={binDayparts(visibleEvents)}
              />
            )}
            {lens === 'survival' && <SurvivalCurves events={visibleEvents} />}
            {lens === 'gravity' && <SessionGravity events={visibleEvents} />}
            {lens === 'neuro' && <NeuroMap events={visibleEvents} daysOfHistory={RANGE_DAYS[range]} />}
          </div>
        </div>
      </main>
    </div>
  );
}
