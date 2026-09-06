// React & 3rd-party
import React, { useState } from 'react';
import { Activity, Clock, BarChart2, Zap } from 'lucide-react';

// Types
import type { UIState, Tab, View } from '../../types/popup';

// UI Components
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { OverviewCard } from '../../components/ui/OverviewCard';
import { EmptyState, ErrorState } from '../../components/ui/State';

// Dashboard Components
import { PlatformRow } from '../../components/dashboard/PlatformRow';
import { PlatformDetail } from '../../components/dashboard/PlatformDetail';
import { SignalsTab } from '../../components/dashboard/SignalsTab';
import { TrendsTab } from '../../components/dashboard/TrendsTab';

// Chart Components
import { Donut } from '../../components/charts/Donut';

// Utils & Data
import { formatTime } from '../../utils/time';
import { avgFlickSec } from '../../utils/metrics';
import { chartTokens } from '../../components/tokens';
import { MOCK, PLATFORM_MOCK, POPUP_AS_OF_HOUR } from '../../data/popupMock';

// Styles
import './App.css';

export default function App() {
  const [uiState, setUiState] = useState<UIState>('success');
  const [view, setView] = useState<View>({ kind: 'tabs', tab: 'today' });
  const [stackMode, setStackMode] = useState<'time' | 'count'>('time');
  const tab = view.kind === 'tabs' ? view.tab : 'today';

  const toggleState = () => {
    const states: UIState[] = ['success', 'empty', 'error'];
    const nextIndex = (states.indexOf(uiState) + 1) % states.length;
    setUiState(states[nextIndex]!);
  };

  const totalSkips = MOCK.platforms.reduce((sum, p) => sum + p.skip, 0);
  const globalFlick = avgFlickSec(MOCK.totalMs, MOCK.totalCount);
  const msDelta = MOCK.totalMs - MOCK.yesterdayMs;
  const countDelta = MOCK.totalCount - MOCK.yesterdayCount;
  const isTimeWorse = msDelta > 0;
  const isTimeBetter = msDelta < 0;
  const isCountWorse = countDelta > 0;
  const isCountBetter = countDelta < 0;

  return (
    <div className="container">
      <div className="header">
        <button type="button" className="brand" onClick={toggleState} aria-label="Cycle preview state (dev only)">
          DOOMGAUGE
        </button>
        <span className="preview-pill">as of {POPUP_AS_OF_HOUR}:00</span>
      </div>

      {uiState === 'success' && view.kind === 'tabs' && (
        <div className="overview-cards">
          <OverviewCard
            label="ACTIVE DRAIN"
            icon={<Clock size={13} style={{ color: isTimeWorse ? 'var(--threat-red)' : 'var(--accent-green)' }} />}
            value={formatTime(MOCK.totalMs)}
            sub={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Badge variant={isTimeWorse ? 'destructive' : 'success'}>
                  {isTimeWorse ? '▲ +' : '▼ -'}{formatTime(Math.abs(msDelta))}
                </Badge>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.62rem' }}>vs yday ({POPUP_AS_OF_HOUR}:00)</span>
              </div>
            }
            trend={isTimeWorse ? 'negative' : 'neutral'}
          />
          <OverviewCard
            label="REELS CONSUMED"
            icon={<Zap size={13} style={{ color: isCountWorse ? 'var(--threat-red)' : 'var(--accent-amber)' }} />}
            value={
              <>
                <span>{MOCK.totalCount}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>reels</span>
              </>
            }
            sub={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <Badge variant={isCountWorse ? 'destructive' : 'success'}>
                  {isCountWorse ? '▲ +' : '▼ -'}{Math.abs(countDelta)}
                </Badge>
                <Badge variant="warning">
                  {totalSkips} rapid ({MOCK.impatience}%)
                </Badge>
              </div>
            }
            trend={isCountWorse ? 'negative' : 'neutral'}
          />
        </div>
      )}

      <div className="popup-body">
        {uiState === 'empty' && <EmptyState />}
        {uiState === 'error' && <ErrorState />}

        {uiState === 'success' && view.kind === 'platform' && (
          <PlatformDetail
            platform={view.platform}
            data={PLATFORM_MOCK[view.platform]}
            onBack={() => setView({ kind: 'tabs', tab: 'today' })}
          />
        )}

        {uiState === 'success' && view.kind === 'tabs' && (
          <Tabs value={tab} onValueChange={(v) => setView({ kind: 'tabs', tab: v as Tab })}>
            <TabsList>
              <TabsTrigger value="today" icon={<Clock size={12} />}>Today</TabsTrigger>
              <TabsTrigger value="signals" icon={<Activity size={12} />}>Signals</TabsTrigger>
              <TabsTrigger value="hourly" icon={<BarChart2 size={12} />}>Hourly</TabsTrigger>
            </TabsList>

            <TabsContent value="today">
              <Donut
                items={MOCK.platforms.map((p) => ({
                  platform: p.platform,
                  label: p.platform === 'youtube' ? 'YouTube' : p.platform === 'instagram' ? 'Instagram' : 'Facebook',
                  timeMs: p.timeMs,
                  count: p.count,
                  color: chartTokens.platform[p.platform],
                }))}
                mode={stackMode}
                onModeChange={setStackMode}
              />
              <div className="platform-scale-hint">Share of total {stackMode}</div>
              <div className="platform-list">
                {MOCK.platforms.map((p) => (
                  <PlatformRow
                    key={p.platform}
                    platform={p.platform}
                    count={p.count}
                    timeMs={p.timeMs}
                    mode={stackMode}
                    totalTimeMs={MOCK.totalMs}
                    totalCount={MOCK.totalCount}
                    onClick={() => setView({ kind: 'platform', platform: p.platform })}
                  />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="signals">
              <SignalsTab
                data={PLATFORM_MOCK}
                totalCount={MOCK.totalCount}
                totalSkips={totalSkips}
                impatiencePct={MOCK.impatience}
                avgFlickSec={globalFlick}
              />
            </TabsContent>

            <TabsContent value="hourly">
              <TrendsTab />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {uiState === 'success' && view.kind === 'tabs' && (
        <div className="footer">
          <button
            type="button"
            className="btn-telemetry"
            onClick={() => {
              chrome.tabs.create({ url: chrome.runtime.getURL('/telemetry.html') });
            }}
          >
            ⤢ FULL TELEMETRY COMMAND CENTER
          </button>
        </div>
      )}
    </div>
  );
}
