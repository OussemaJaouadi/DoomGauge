import { hintFacts } from '../../components/ui/hintContent';
import { useMemo, useState, type CSSProperties } from 'react';
import { Activity, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Settings } from 'lucide-react';
import { PLATFORMS } from '../../types/models';
import { DAYPARTS, type Daypart, type TimeRange } from '../../types/telemetry';
import type { PageSelection, TelemetryPage } from '../../types/telemetryPreview';
import { buildPreviewDataset } from '../../data/telemetryPreview';
import { clockMinute, minuteOfDay, observationRollups, observationSessions, periodBounds, RANGE_LENGTH, scopedSessions, selectObservations, shiftDate } from '../../utils/telemetryPreview';
import { localDateKey } from '../../utils/time';
import { platformMeta } from '../../components/platformMeta';
import { AnalysisWorkspace } from '../../components/telemetry/AnalysisWorkspace';
import { TelemetryFilters } from '../../components/telemetry/TelemetryFilters';
import { Clock } from '../../components/ui/Clock';
import { SettingsPage } from '../../components/settings/SettingsPage';
import './App.css';

const pages: TelemetryPage[] = ['overview', ...PLATFORMS];

export default function App() {
  const [now] = useState(() => new Date());
  const [page, setPage] = useState<TelemetryPage>('overview');
  const [destination, setDestination] = useState<'analysis' | 'settings'>('analysis');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selections, setSelections] = useState<Record<TelemetryPage, PageSelection>>(() => Object.fromEntries(pages.map(p => [p, { range: '7d', endDate: now, view: 'windows' }])) as Record<TelemetryPage, PageSelection>);
  const [daypart, setDaypart] = useState<Daypart[]>(() => DAYPARTS.map(option => option.id));
  const { range, endDate, view } = selections[page];
  const context = `${page}-${range}-${localDateKey(endDate)}-${daypart}-${view}`;
  const update = (patch: Partial<PageSelection>) => setSelections(value => ({ ...value, [page]: { ...value[page], ...patch } }));
  const bounds = periodBounds(endDate, range, now);
  const dateFormatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric',
    ...(bounds.start.getFullYear() !== now.getFullYear() || endDate.getFullYear() !== now.getFullYear() ? { year: 'numeric' as const } : {}) });
  const dateLabel = range === 'day' ? dateFormatter.format(endDate) : dateFormatter.formatRange(bounds.start, endDate);
  const historyStart = shiftDate(bounds.previousStart, -1).getTime();
  const historyEnd = bounds.cutoff.getTime();
  const dataset = useMemo(() => buildPreviewDataset(new Date(historyStart), new Date(historyEnd)), [historyStart, historyEnd]);
  const observations = dataset.events;
  const fullSessions = useMemo(() => observationSessions(observations), [observations]);
  const events = selectObservations(observations, bounds.start.getTime(), historyEnd, page, daypart);
  const previous = selectObservations(observations, bounds.previousStart.getTime(), bounds.previousCutoff.getTime(), page, daypart);
  const sessions = scopedSessions(fullSessions, events);
  const previousDates = bounds.dates.map((_, i) => localDateKey(shiftDate(bounds.previousStart, i)));
  const isToday = localDateKey(endDate) === localDateKey(now);
  const title = page === 'overview' ? 'Overview' : platformMeta[page].label;
  const exportJson = () => {
    const rollups = observationRollups(events, bounds.dates).filter(r => (page === 'overview' || r.platform === page) && r.reelCount > 0);
    const url = URL.createObjectURL(new Blob([JSON.stringify(rollups)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `doomgauge-export-${localDateKey(now)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <div className={`telemetry-app workspace-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
    <aside className="analysis-sidebar" id="telemetry-sidebar">
      <button type="button" className="analysis-sidebar-toggle" aria-controls="telemetry-sidebar" aria-expanded={!sidebarCollapsed}
        aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setSidebarCollapsed(value => !value)}>
        {sidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
      </button>
      <a href="#telemetry-content" className="telemetry-skip">Skip to content</a>
      <div className="analysis-brand" aria-label="DoomGauge"><Activity size={19} /><span>DOOMGAUGE</span></div>
      <nav aria-label="Telemetry pages">{pages.map(p => <button type="button" key={p} aria-label={p === 'overview' ? 'Overview' : platformMeta[p].label} title={p === 'overview' ? 'Overview' : platformMeta[p].label} aria-current={destination === 'analysis' && page === p ? 'page' : undefined} onClick={() => { setPage(p); setDestination('analysis'); }} style={p !== 'overview' ? { '--page-color': platformMeta[p].color } as CSSProperties : undefined}>
        {p === 'overview' ? <LayoutDashboard size={17} /> : platformMeta[p].icon}<span>{p === 'overview' ? 'Overview' : platformMeta[p].label}</span>
      </button>)}</nav>
      <nav className="analysis-sidebar-footer" aria-label="App preferences"><button type="button" aria-label="Settings" title="Settings" aria-current={destination === 'settings' ? 'page' : undefined} onClick={() => setDestination('settings')}><Settings size={17} /><span>Settings</span></button></nav>
    </aside>
    <main id="telemetry-content" className="analysis-main" tabIndex={-1}>
      <div className="analysis-content">
        {destination === 'settings' ? <SettingsPage /> : <>
        <div className="analysis-page-head"><div className="analysis-page-identity"><h1>{title}</h1><Clock /></div>
        <TelemetryFilters range={range} onRangeChange={(value: TimeRange) => update({ range: value })} dateLabel={dateLabel}
          onBack={() => update({ endDate: shiftDate(endDate, -RANGE_LENGTH[range]) })} onForward={() => { const next = shiftDate(endDate, RANGE_LENGTH[range]); update({ endDate: next > now ? now : next }); }} forwardDisabled={isToday}
          daypart={daypart} onDaypartChange={setDaypart} onExport={exportJson} comparisonLabel={hintFacts([['Selected', range === 'day' ? bounds.dates[0]! : `${bounds.dates[0]} → ${bounds.dates[bounds.dates.length - 1]}`], ['Previous', range === 'day' ? previousDates[0]! : `${previousDates[0]} → ${previousDates[previousDates.length - 1]}`], ['Cutoff', isToday ? `Both through ${clockMinute(minuteOfDay(now.getTime()))}` : 'Complete days']])} />
        </div>
        <AnalysisWorkspace key={context} context={context} view={view} onViewChange={value => update({ view: value })} events={events} previous={previous} sessions={sessions} fullSessions={fullSessions} coverage={dataset.coverage} dates={bounds.dates} previousDates={previousDates} completeDates={bounds.completeDates} page={page} throughHour={isToday ? now.getHours() : 23} />
        </>}
      </div>
    </main>
  </div>;
}
