// React & 3rd-party
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Activity, BarChart2, Clock, ExternalLink, Zap } from 'lucide-react';

// Types & Models
import type { Platform } from '../../types/models';
import type { Tab, View } from '../../types/popup';

// UI Components
import { ActivityReadNotice, ActivityReadProvider } from '../../components/ui/ActivityReadState';
import { Donut } from '../../components/charts/Donut';
import { Hint } from '../../components/ui/Hint';
import { OverviewCard } from '../../components/ui/OverviewCard';
import { PlatformDetail } from '../../components/dashboard/PlatformDetail';
import { PlatformRow } from '../../components/dashboard/PlatformRow';
import { SignalsTab } from '../../components/dashboard/SignalsTab';
import { StatePreviewControls, useStatePreview } from '../../components/ui/StatePreview';
import { StateRegion } from '../../components/ui/StateRegion';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/Tabs';
import { TrendsTab } from '../../components/dashboard/TrendsTab';

// Tokens & Meta
import { chartTokens } from '../../components/tokens';
import { hintFacts } from '../../components/ui/hintContent';
import { platformMeta } from '../../components/platformMeta';

// Utilities & Helpers
import { avgFlickSec } from '../../utils/metrics';
import { contentState, readyState } from '../../utils/uiState';
import { deltaTrend } from '../../utils/popupActivity';
import { formatTime } from '../../utils/time';
import { hasObservationCoverage } from '../../utils/telemetryInsights';
import { livePopup } from '../../utils/livePopup';

// Services & Fixtures
import { DEV_DATA } from '../../config/dataMode';
import { POPUP_AS_OF_HOUR } from '../../data/popupMock';
import { popupStateFixture } from '../../data/uiStateFixtures';
import { useTracking } from '../../tracking/client';

// Styles
import './App.css';

export default function App() {
  const { preset, reset } = useStatePreview();
  const preview = DEV_DATA;
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

  useEffect(() => {
    const timer = setInterval(() => {
      setClock(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - 1);

  const end = new Date(now);
  end.setHours(24, 0, 0, 0);

  const live = useTracking(start.getTime(), end.getTime(), !preview);
  const popupData = preview ? popupStateFixture(preset) : livePopup(live.events, now);
  const { summary, platforms, hourly } = popupData;
  const readDistribution = () => ('readDistribution' in popupData ? popupData.readDistribution() : popupData.distribution);
  const readInsights = () => ('readInsights' in popupData ? popupData.readInsights() : popupData.insights);
  const throughHour = preview ? POPUP_AS_OF_HOUR : now.getHours() + 1;
  const comparisonAvailable = preview || hasObservationCoverage(live.coverage, start.getTime(), now.getTime());
  const [view, setView] = useState<View>({ kind: 'tabs', tab: 'today' });
  const [stackMode, setStackMode] = useState<'time' | 'count'>('time');
  const root = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<'detail' | Platform | null>(null);
  const tab = view.kind === 'tabs' ? view.tab : 'today';
  const msDelta = summary.totalMs - summary.yesterdayMs;
  const countDelta = summary.totalCount - summary.yesterdayCount;

  useLayoutEffect(() => {
    const target = focusTarget.current;
    if (!target) {
      return;
    }
    const selector = target === 'detail' ? '.detail-back' : `button.platform-row[data-platform="${target}"]`;
    root.current?.querySelector<HTMLButtonElement>(selector)?.focus();
    focusTarget.current = null;
  }, [view]);


  return (
    <div className="container popup-shell" ref={root}>
      <header className="header">
        <span className="brand">DOOMGAUGE</span>
        <div className="header-telemetry">
          <span className="preview-pill">{preview ? 'Preview' : 'Recorded'} · {clock}</span>
          <Hint
            label="About comparison"
            text={hintFacts(
              [['Previous', 'Yesterday'], ['Cutoff', `Both through ${clock}`]],
              comparisonAvailable ? 'Equal elapsed periods. Active viewing only.' : 'Comparison unavailable: incomplete tracking coverage.'
            )}
            accent="blue"
          />
        </div>
      </header>
      <StatePreviewControls />

      <ActivityReadProvider value={preview ? undefined : live}>
      <div className="popup-live">
      <ActivityReadNotice />
      {!preview && live.savingFailed && <p role="status">Saving interrupted. Keep tracking tabs open to retry.</p>}
      {view.kind === 'tabs' && (
        <StateRegion state={readyState} id="popup.metrics" label="Overview metrics" shape="metrics" skeletonCount={2}><div className="overview-cards">
          <OverviewCard
            label="Active time"
            icon={<Clock size={13} />}
            value={formatTime(summary.totalMs)}
            delta={comparisonAvailable ? { value: msDelta, trend: deltaTrend(msDelta), style: 'sign', formatter: formatTime } : undefined}
            trend={comparisonAvailable ? deltaTrend(msDelta) : 'neutral'}
          />
          <OverviewCard
            label="Reels"
            icon={<Zap size={13} />}
            value={summary.totalCount}
            delta={comparisonAvailable ? { value: countDelta, trend: deltaTrend(countDelta), style: 'sign' } : undefined}
            trend={comparisonAvailable ? deltaTrend(countDelta) : 'neutral'}
          />
        </div></StateRegion>
      )}

      <main className="popup-body" aria-label="Scrolling activity">

        {view.kind === 'platform' && (
          <PlatformDetail platform={view.platform} data={platforms[view.platform]} throughHour={throughHour}
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
              <StateRegion state={contentState(summary.totalCount || summary.totalMs, preset === "filtered")} id="popup.today" label="Platform distribution" shape="donut" onClearFilters={reset}><Donut items={summary.platforms.map(p => ({
                platform: p.platform, label: platformMeta[p.platform].label,
                timeMs: p.timeMs, count: p.count, color: chartTokens.platform[p.platform],
              }))} mode={stackMode} onModeChange={setStackMode}>
                <div className="platform-list">
                  {summary.platforms.map(p => (
                    <PlatformRow key={p.platform} platform={p.platform} count={p.count} timeMs={p.timeMs}
                      mode={stackMode} totalTimeMs={summary.totalMs} totalCount={summary.totalCount}
                      onClick={() => {
                        focusTarget.current = 'detail';
                        setView({ kind: 'platform', platform: p.platform });
                      }}
                    />
                  ))}
                </div>
              </Donut></StateRegion>
            </TabsContent>
            <TabsContent value="signals">
              <SignalsTab data={platforms} totalCount={summary.totalCount} totalSkips={summary.totalSkips} totalCompleted={summary.totalCompleted}
                quickSkipPct={summary.impatience} averageSeconds={avgFlickSec(summary.totalMs, summary.totalCount)} distribution={readDistribution} />
            </TabsContent>
            <TabsContent value="hourly">
              <TrendsTab hourlyData={hourly} insights={readInsights} />
            </TabsContent>
          </Tabs>
        )}
      </main>

      </div></ActivityReadProvider>
      <footer className="footer">
        <button type="button" className="btn-telemetry" onClick={() => {
          chrome.tabs.create({ url: chrome.runtime.getURL('/telemetry.html') });
        }}><ExternalLink size={14} /> Full telemetry command center</button>
      </footer>
    </div>
  );
}
