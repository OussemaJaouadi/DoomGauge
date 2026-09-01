import React, { useState } from 'react';
import { Activity, Clock, Rocket, SkipForward, ArrowRight } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { KpiCard } from '../../components/ui/KpiCard';
import { EmptyState, ErrorState } from '../../components/ui/State';
import { PlatformRow } from '../../components/dashboard/PlatformRow';
import { Donut } from '../../components/charts/Donut';
import { SignalsImpatience } from '../../components/dashboard/SignalsImpatience';
import HourlyBars from '../../components/charts/HourlyBars';
import { PlatformDetail } from '../../components/dashboard/PlatformDetail';
import './App.css';

type UIState = 'loading' | 'success' | 'empty' | 'error';
type Tab = 'today' | 'signals' | 'trends';
type Platform = 'youtube'|'instagram'|'facebook';
type View = { kind:'tabs'; tab: Tab } | { kind:'platform'; platform: Platform };

// DEV mock — props-injected later, inline for now (no createClient yet)
const MOCK = {
  totalMs: 5020000, // 1h23m40s
  totalCount: 47,
  platforms: [
    { platform: 'youtube' as const, count: 23, timeMs: 1120000 },
    { platform: 'instagram' as const, count: 15, timeMs: 730000 },
    { platform: 'facebook' as const, count: 9, timeMs: 485000 },
  ],
  velocity: '3.2',
  impatience: 62,
  sparkline: {
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    total: [20, 30, 23, 43, 60, 48, 77],
    youtube: [10, 15, 12, 20, 30, 25, 40],
    instagram: [5, 10, 8, 15, 20, 18, 25],
    facebook: [2, 5, 3, 8, 10, 5, 12],
  },
};

export default function App() {
  const [uiState, setUiState] = useState<UIState>('success');
  const [view, setView] = useState<View>({ kind:'tabs', tab:'today' });
  const [stackMode, setStackMode] = useState<'time'|'count'>('time');
  const tab = view.kind==='tabs' ? view.tab : 'today';

  const toggleState = () => {
    const states: UIState[] = ['success', 'empty', 'error'];
    const nextIndex = (states.indexOf(uiState) + 1) % states.length;
    setUiState(states[nextIndex]);
  };

  const maxCount = Math.max(...MOCK.platforms.map((p) => p.count));

  return (
    <div className="container">
      <div className="header">
        <span className="brand" onClick={toggleState} style={{ cursor: 'pointer' }}>
          DOOMGAUGE
        </span>
        <Badge variant="destructive">
          <span style={{ marginRight: '6px', fontSize: '8px' }}>🔴</span> 18% LOST
        </Badge>
      </div>

      {uiState === 'empty' && <EmptyState />}
      {uiState === 'error' && <ErrorState />}

      {uiState === 'success' && view.kind==='platform' && (
        <PlatformDetail platform={view.platform} onBack={()=> setView({kind:'tabs', tab:'today'})} />
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
              items={MOCK.platforms.map(p=>({ platform:p.platform, label:p.platform==='youtube'?'YT':p.platform==='instagram'?'IG':'FB', timeMs:p.timeMs, count:p.count, color:p.platform==='youtube'?'#ff3344':p.platform==='instagram'?'#a855f7':'#00b4d8'}))}
              mode={stackMode}
              onModeChange={setStackMode}
            />
            <div className="platform-list">
              {MOCK.platforms.map((p) => (
                <PlatformRow key={p.platform} platform={p.platform} count={p.count} timeMs={p.timeMs} maxCount={maxCount} onClick={()=> setView({kind:'platform', platform: p.platform})} />
              ))}
            </div>
            <div className="hint">+6 reels vs yesterday · peak: Instagram</div>
          </TabsContent>

          <TabsContent value="signals">
            <div className="impact-grid">
              <KpiCard icon={<Rocket size={14} />} label="Velocity" value={MOCK.velocity} unit="reels / min" accent="magenta" sublabel="scroll speed" />
              <KpiCard icon={<SkipForward size={14} />} label="Impatience" value={`${MOCK.impatience}%`} unit="skipped <3s" accent="magenta" sublabel="not watching" />
            </div>
            <SignalsImpatience />
            <div className="hint">62% scanning — Instagram drives impatience (+9pp over avg)</div>
          </TabsContent>

          <TabsContent value="trends">
            <HourlyBars />
          </TabsContent>
        </Tabs>
      )}

      {uiState === 'success' && (
        <div className="footer">
          <a href="#" className="btn-telemetry">
            EXPLORE FULL TELEMETRY <ArrowRight size={14} style={{ marginLeft: 4 }} />
          </a>
        </div>
      )}
    </div>
  );
}
