import { useTracking } from '../../tracking/client';
import { livePopup } from '../../tracking/popup';
import { hasObservationCoverage } from '../../utils/telemetryInsights';
import { hintFacts } from '../../components/ui/hintContent';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Activity, Clock, BarChart2, Zap, ExternalLink } from 'lucide-react';
import type { Tab, View } from '../../types/popup';
import type { Platform } from '../../types/models';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { OverviewCard } from '../../components/ui/OverviewCard';
import { StateRegion } from '../../components/ui/StateRegion';
import { StatePreviewControls, useStatePreview } from '../../components/ui/StatePreview';
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
import { POPUP_AS_OF_HOUR } from '../../data/popupMock';
import { popupStateFixture } from '../../data/uiStateFixtures';
import './App.css';

export default function App() {
  const { preset, reset } = useStatePreview();
  const preview = Boolean(import.meta.env.DEV && (new URLSearchParams(location.search).get('data') === 'mock' || preset !== 'normal'));
  const now = new Date(); const start = new Date(now); start.setHours(0,0,0,0); start.setDate(start.getDate()-1);
  const end = new Date(now); end.setHours(24,0,0,0);
  const live = useTracking(start.getTime(), end.getTime(), !preview);
  const { mock: MOCK, platforms: PLATFORM_MOCK, distribution: POPUP_DISTRIBUTION, hourly, insights } = preview ? popupStateFixture(preset) : livePopup(live.events, now);
  const throughHour = preview ? POPUP_AS_OF_HOUR : now.getHours()+1;
  const cutoffLabel = preview ? POPUP_AS_OF_HOUR+':00' : now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  const comparisonAvailable = preview || hasObservationCoverage(live.coverage,start.getTime(),now.getTime());
  const [view, setView] = useState<View>({ kind: 'tabs', tab: 'today' });
  const [stackMode, setStackMode] = useState<'time' | 'count'>('time');
  const root = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<'detail' | Platform | null>(null);
  const tab = view.kind === 'tabs' ? view.tab : 'today';
  const msDelta = MOCK.totalMs - MOCK.yesterdayMs;
  const countDelta = MOCK.totalCount - MOCK.yesterdayCount;

  useLayoutEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    const selector = target === 'detail' ? '.detail-back' : `button.platform-row[data-platform="${target}"]`;
    root.current?.querySelector<HTMLButtonElement>(selector)?.focus();
    focusTarget.current = null;
  }, [view]);


  return (
    <div className="container popup-shell" ref={root}>
      <header className="header">
        <span className="brand">DOOMGAUGE</span>
        <span className="preview-pill">{preview ? 'Preview' : 'Recorded'} · {cutoffLabel}</span>
      </header>
      <StatePreviewControls />

      <StateRegion id="popup.live" className="popup-live" label="Recorded activity" shape="metrics" onRetry={live.retry} actual={preview ? undefined : live.status === 'success' && !live.events.length ? {status:'empty',reason:'unobserved'} : {status:live.status}}>
      {!preview && live.savingFailed && <p role="status">Saving interrupted. Keep tracking tabs open to retry.</p>}
      {view.kind === 'tabs' && (
        <StateRegion id="popup.metrics" label="Overview metrics" shape="metrics" skeletonCount={2}><div className="overview-cards">
          <OverviewCard
            label="Active time" icon={<Clock size={13} />}
            value={formatTime(MOCK.totalMs)}
            delta={comparisonAvailable ? { value: msDelta, trend: deltaTrend(msDelta), style: 'sign', formatter: formatTime } : undefined}
            baseline={<Hint label="About comparison" text={hintFacts([['Previous', 'Yesterday'], ['Cutoff', `Both through ${cutoffLabel}`]], comparisonAvailable ? 'Equal elapsed periods. Active viewing only.' : 'Comparison unavailable: incomplete tracking coverage.')} accent="blue" />} trend={comparisonAvailable ? deltaTrend(msDelta) : 'neutral'}
          />
          <OverviewCard
            label="Reels" icon={<Zap size={13} />} value={MOCK.totalCount}
            delta={comparisonAvailable ? { value: countDelta, trend: deltaTrend(countDelta), style: 'sign' } : undefined}
            baseline={<Hint label="About comparison" text={hintFacts([['Previous', 'Yesterday'], ['Cutoff', `Both through ${cutoffLabel}`]], comparisonAvailable ? 'Equal elapsed periods. Active viewing only.' : 'Comparison unavailable: incomplete tracking coverage.')} accent="blue" />} trend={comparisonAvailable ? deltaTrend(countDelta) : 'neutral'}
          />
        </div></StateRegion>
      )}

      <main className="popup-body" aria-label="Scrolling activity">

        {view.kind === 'platform' && (
          <PlatformDetail platform={view.platform} data={PLATFORM_MOCK[view.platform]} throughHour={throughHour}
            onBack={() => {
              focusTarget.current = view.platform;
              setView({ kind: 'tabs', tab: 'today' });
            }}
          />
        )}

        {view.kind === 'tabs' && (
          <Tabs value={tab} onValueChange={v => setView({ kind: 'tabs', tab: v as Tab })}>
            <TabsList>
              <TabsTrigger value="today" icon={<Clock size={13} />}>Today</TabsTrigger>
              <TabsTrigger value="signals" icon={<Activity size={13} />}>Signals</TabsTrigger>
              <TabsTrigger value="hourly" icon={<BarChart2 size={13} />}>Hourly</TabsTrigger>
            </TabsList>
            <TabsContent value="today">
              <StateRegion id="popup.today" label="Platform distribution" shape="donut" onClearFilters={reset} actual={preset === "filtered" ? { status: "empty", reason: "filters" } : undefined}><Donut items={MOCK.platforms.map(p => ({
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
              </Donut></StateRegion>
              <p className="popup-note">Select a platform to explore its viewing patterns.</p>
            </TabsContent>
            <TabsContent value="signals">
              <SignalsTab data={PLATFORM_MOCK} totalCount={MOCK.totalCount} totalSkips={MOCK.totalSkips} totalCompleted={MOCK.totalCompleted}
                quickSkipPct={MOCK.impatience} averageSeconds={avgFlickSec(MOCK.totalMs, MOCK.totalCount)} distribution={POPUP_DISTRIBUTION} />
            </TabsContent>
            <TabsContent value="hourly">
              <TrendsTab hourlyData={hourly} insights={insights} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      </StateRegion>
      <footer className="footer">
        <button type="button" className="btn-telemetry" onClick={() => {
          chrome.tabs.create({ url: chrome.runtime.getURL('/telemetry.html') });
        }}><ExternalLink size={14} /> Full telemetry command center</button>
      </footer>
    </div>
  );
}
