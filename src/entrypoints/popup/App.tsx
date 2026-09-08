import { hintFacts } from '../../components/ui/hintContent';
import { useLayoutEffect, useRef, useState } from 'react';
import { Activity, Clock, BarChart2, Zap, ExternalLink } from 'lucide-react';
import type { UIState, Tab, View } from '../../types/popup';
import type { Platform } from '../../types/models';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { OverviewCard } from '../../components/ui/OverviewCard';
import { EmptyState, ErrorState } from '../../components/ui/State';
import { PlatformRow } from '../../components/dashboard/PlatformRow';
import { PlatformDetail } from '../../components/dashboard/PlatformDetail';
import { SignalsTab } from '../../components/dashboard/SignalsTab';
import { TrendsTab } from '../../components/dashboard/TrendsTab';
import { Hint } from '../../components/ui/Hint';
import { Donut } from '../../components/charts/Donut';
import { platformMeta } from '../../components/platformMeta';
import { formatTime } from '../../utils/time';
import { avgFlickSec } from '../../utils/metrics';
import { deltaTrend } from '../../utils/popupActivity';
import { chartTokens } from '../../components/tokens';
import { MOCK, PLATFORM_MOCK, POPUP_AS_OF_HOUR, POPUP_DISTRIBUTION } from '../../data/popupMock';
import './App.css';

export default function App() {
  const [uiState, setUiState] = useState<UIState>('success');
  const [view, setView] = useState<View>({ kind: 'tabs', tab: 'today' });
  const [stackMode, setStackMode] = useState<'time' | 'count'>('time');
  const root = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<'detail' | Platform | null>(null);
  const tab = view.kind === 'tabs' ? view.tab : 'today';
  const msDelta = MOCK.totalMs - MOCK.yesterdayMs;
  const countDelta = MOCK.totalCount - MOCK.yesterdayCount;

  useLayoutEffect(() => {
    const target = focusTarget.current;
    if (!target || uiState !== 'success') return;
    const selector = target === 'detail' ? '.detail-back' : `button.platform-row[data-platform="${target}"]`;
    root.current?.querySelector<HTMLButtonElement>(selector)?.focus();
    focusTarget.current = null;
  }, [view, uiState]);

  function toggleState() {
    const states: UIState[] = ['success', 'empty', 'error'];
    setUiState(states[(states.indexOf(uiState) + 1) % states.length]!);
  }

  return (
    <div className="container popup-shell" ref={root}>
      <header className="header">
        <button type="button" className="brand" onClick={toggleState} aria-label="Cycle preview state (dev only)">DOOMGAUGE</button>
        <span className="preview-pill">Preview · as of {POPUP_AS_OF_HOUR}:00</span>
      </header>

      {uiState === 'success' && view.kind === 'tabs' && (
        <div className="overview-cards">
          <OverviewCard
            label="Active time" icon={<Clock size={13} />}
            value={formatTime(MOCK.totalMs)}
            delta={{ value: msDelta, trend: deltaTrend(msDelta), style: 'sign', formatter: formatTime }}
            baseline={<Hint label="About comparison" text={hintFacts([['Previous', 'Yesterday'], ['Cutoff', `Both through ${POPUP_AS_OF_HOUR}:00`]], 'Equal elapsed periods. Active viewing only.')} accent="blue" />} trend={deltaTrend(msDelta)}
          />
          <OverviewCard
            label="Reels" icon={<Zap size={13} />} value={MOCK.totalCount}
            delta={{ value: countDelta, trend: deltaTrend(countDelta), style: 'sign' }}
            baseline={<Hint label="About comparison" text={hintFacts([['Previous', 'Yesterday'], ['Cutoff', `Both through ${POPUP_AS_OF_HOUR}:00`]], 'Equal elapsed periods. Active viewing only.')} accent="blue" />} trend={deltaTrend(countDelta)}
          />
        </div>
      )}

      <main className="popup-body" aria-label="Scrolling activity">
        {uiState === 'empty' && <EmptyState />}
        {uiState === 'error' && <ErrorState title="Activity unavailable" hint="Close and reopen the popup. If this continues, reload DoomGauge from Chrome’s Extensions page." />}

        {uiState === 'success' && view.kind === 'platform' && (
          <PlatformDetail platform={view.platform} data={PLATFORM_MOCK[view.platform]} throughHour={POPUP_AS_OF_HOUR}
            onBack={() => {
              focusTarget.current = view.platform;
              setView({ kind: 'tabs', tab: 'today' });
            }}
          />
        )}

        {uiState === 'success' && view.kind === 'tabs' && (
          <Tabs value={tab} onValueChange={v => setView({ kind: 'tabs', tab: v as Tab })}>
            <TabsList>
              <TabsTrigger value="today" icon={<Clock size={13} />}>Today</TabsTrigger>
              <TabsTrigger value="signals" icon={<Activity size={13} />}>Signals</TabsTrigger>
              <TabsTrigger value="hourly" icon={<BarChart2 size={13} />}>Hourly</TabsTrigger>
            </TabsList>
            <TabsContent value="today">
              <Donut items={MOCK.platforms.map(p => ({
                platform: p.platform, label: platformMeta[p.platform].label,
                timeMs: p.timeMs, count: p.count, color: chartTokens.platform[p.platform],
              }))} mode={stackMode} onModeChange={setStackMode}>
                <div className="platform-list">
                  {MOCK.platforms.map(p => (
                    <PlatformRow key={p.platform} platform={p.platform} count={p.count} timeMs={p.timeMs}
                      mode={stackMode} totalTimeMs={MOCK.totalMs} totalCount={MOCK.totalCount}
                      onClick={() => {
                        focusTarget.current = 'detail';
                        setView({ kind: 'platform', platform: p.platform });
                      }}
                    />
                  ))}
                </div>
              </Donut>
              <p className="popup-note">Select a platform to explore its viewing patterns.</p>
            </TabsContent>
            <TabsContent value="signals">
              <SignalsTab data={PLATFORM_MOCK} totalCount={MOCK.totalCount} totalSkips={MOCK.totalSkips}
                quickSkipPct={MOCK.impatience} averageSeconds={avgFlickSec(MOCK.totalMs, MOCK.totalCount)} distribution={POPUP_DISTRIBUTION} />
            </TabsContent>
            <TabsContent value="hourly">
              <TrendsTab />
            </TabsContent>
          </Tabs>
        )}
      </main>

      <footer className="footer">
        <button type="button" className="btn-telemetry" onClick={() => {
          chrome.tabs.create({ url: chrome.runtime.getURL('/telemetry.html') });
        }}><ExternalLink size={14} /> Full telemetry command center</button>
      </footer>
    </div>
  );
}
