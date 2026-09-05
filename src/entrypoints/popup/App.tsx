// React & 3rd-party
import React, { useState } from 'react';
import { Activity, Clock, Rocket, SkipForward, Camera, MonitorPlay, MessageCircle, ArrowUp, ArrowDown } from 'lucide-react';

// Types
import type { UIState, Tab, View } from '../../types/popup';

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { KpiCard } from '../../components/ui/KpiCard';
import { OverviewCard } from '../../components/ui/OverviewCard';
import { EmptyState, ErrorState } from '../../components/ui/State';

// Dashboard Components
import { PlatformRow } from '../../components/dashboard/PlatformRow';
import { PlatformDetail } from '../../components/dashboard/PlatformDetail';
import { SignalsImpatience } from '../../components/dashboard/SignalsImpatience';
import { TrendsTab } from '../../components/dashboard/TrendsTab';

// Chart Components
import { Donut } from '../../components/charts/Donut';

// Utils & Data
import { formatTime } from '../../utils/time';
import { formatBurnSub, avgFlickSec } from '../../utils/metrics';
import { chartTokens } from '../../components/tokens';
import { MOCK, PLATFORM_MOCK } from '../../data/mock';

// Styles
import './App.css';

export default function App() {
  const [uiState, setUiState] = useState<UIState>('success');
  const [view, setView] = useState<View>({ kind:'tabs', tab:'today' });
  const [stackMode, setStackMode] = useState<'time'|'count'>('time');
  const tab = view.kind==='tabs' ? view.tab : 'today';

  const toggleState = () => {
    const states: UIState[] = ['success', 'empty', 'error'];
    const nextIndex = (states.indexOf(uiState) + 1) % states.length;
    setUiState(states[nextIndex]!);
  };

  const maxCount = Math.max(...MOCK.platforms.map((p) => p.count));
  const globalFlick = avgFlickSec(MOCK.totalMs, MOCK.totalCount);
  const msDelta = MOCK.totalMs - MOCK.yesterdayMs;
  const countDelta = MOCK.totalCount - MOCK.yesterdayCount;
  const isTimeWorse = msDelta > 0;
  const isTimeBetter = msDelta < 0;
  const isCountWorse = countDelta > 0;
  const isCountBetter = countDelta < 0;

  const peakPlatform = MOCK.platforms.reduce((prev, current) => (current.timeMs > prev.timeMs) ? current : prev);
  const peakName = peakPlatform.platform.charAt(0).toUpperCase() + peakPlatform.platform.slice(1);
  const peakColor = chartTokens.platform[peakPlatform.platform];

  return (
    <div className="container">
      <div className="header">
        <button type="button" className="brand" onClick={toggleState} aria-label="Cycle preview state (dev only)">
          DOOMGAUGE
        </button>
      </div>
      {view.kind==='tabs' && (
      <div className="overview-cards">
        <OverviewCard
          label="DRAINED"
          value={formatTime(MOCK.totalMs)}
          sub={<span style={{ color: 'var(--threat-red)', fontWeight: 600 }}>{formatBurnSub(MOCK.totalMs, new Date())}</span>}
          trend="neutral"
        />
        <OverviewCard
          label="VS YDAY"
          trend="neutral"
          value={
            <span
              style={{
                color: isTimeWorse ? 'var(--threat-red)' : isTimeBetter ? 'var(--accent-green)' : 'var(--text-primary)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              {isTimeWorse && <ArrowUp size={16} />}
              {isTimeBetter && <ArrowDown size={16} />}
              <span>{msDelta === 0 ? '0s' : formatTime(Math.abs(msDelta))}</span>
            </span>
          }
          sub={
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <span
                style={{
                  color: isCountWorse ? 'var(--threat-red)' : isCountBetter ? 'var(--accent-green)' : 'var(--text-muted)',
                  fontWeight: 600,
                }}
              >
                {countDelta === 0 ? '±0 reels' : `${isCountWorse ? '+' : '-'}${Math.abs(countDelta)} reels`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>· DELTA</span>
            </span>
          }
        />
        <OverviewCard
          label="PEAK CHANNEL"
          value={
            <span style={{ color: peakColor }}>
              {formatTime(peakPlatform.timeMs)}
            </span>
          }
          sub={`${peakName} · ${peakPlatform.pct}% share`}
          icon={peakPlatform.platform === 'youtube' ? <MonitorPlay size={14} /> : peakPlatform.platform === 'instagram' ? <Camera size={14} /> : <MessageCircle size={14} />}
          accent={peakColor}
          border={peakColor}
          trend="neutral"
        />
      </div>
      )}

      {uiState === 'empty' && <EmptyState />}
      {uiState === 'error' && <ErrorState />}

      {uiState === 'success' && view.kind==='platform' && (
        <PlatformDetail platform={view.platform} data={PLATFORM_MOCK[view.platform]} onBack={()=> setView({kind:'tabs', tab:'today'})} />
      )}

      {uiState === 'success' && view.kind==='tabs' && (
        <Tabs value={tab} onValueChange={(v) => setView({kind:'tabs', tab: v as Tab})}>
          <TabsList>
            <TabsTrigger value="today" icon={<Clock size={12} />}>Today</TabsTrigger>
            <TabsTrigger value="signals" icon={<Activity size={12} />}>Signals</TabsTrigger>
            <TabsTrigger value="trends" icon={<Rocket size={12} />}>Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="today">
            <Donut
              items={MOCK.platforms.map(p=>({ platform:p.platform, label:p.platform==='youtube'?'YouTube':p.platform==='instagram'?'Instagram':'Facebook', timeMs:p.timeMs, count:p.count, color: chartTokens.platform[p.platform] }))}
              mode={stackMode}
              onModeChange={setStackMode}
            />
            <div className="platform-list">
              {MOCK.platforms.map((p) => (
                <PlatformRow key={p.platform} platform={p.platform} count={p.count} timeMs={p.timeMs} maxCount={maxCount} onClick={()=> setView({kind:'platform', platform: p.platform})} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="signals">
            <div className="impact-grid">
              <KpiCard icon={<Rocket size={14} />} label="Velocity" value={MOCK.velocity} unit="reels/min" accent="magenta" />
              <KpiCard icon={<SkipForward size={14} />} label="Impatience" value={`${MOCK.impatience}%`} unit="skipped <3s" accent="magenta" />
              <KpiCard icon={<Clock size={14} />} label="Avg Flick" value={`${globalFlick}s`} unit="per reel" accent="magenta" />
            </div>
            <SignalsImpatience data={PLATFORM_MOCK} />
          </TabsContent>

          <TabsContent value="trends">
            <TrendsTab />
          </TabsContent>
        </Tabs>
      )}

      {uiState === 'success' && view.kind==='tabs' && (
        <div className="footer">
          <button type="button" className="btn-telemetry" onClick={()=>{ chrome.tabs.create({ url: chrome.runtime.getURL('/telemetry.html') }); }}>
            ⤢ FULL TELEMETRY COMMAND CENTER
          </button>
        </div>
      )}
    </div>
  );
}
