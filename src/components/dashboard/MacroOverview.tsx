import React from 'react';
import { Layers, Clock, SkipForward } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import { formatTime } from '../../utils/time';

export interface MacroOverviewProps {
  data: {
    sessions: any[];
    events: any[];
  };
}

export function MacroOverview({ data }: MacroOverviewProps) {
  const totalMs = data.events.reduce((acc, e) => acc + e.durationMs, 0);
  const skips = data.events.filter(e => e.skipped).length;

  return (
    <div className="chart-panel full">
      <div className="panel-title">Doom Score vs Reality</div>
      <div className="dashboard-grid" style={{ marginTop: '16px', display: 'flex', gap: '16px' }}>
        <KpiCard
          icon={<Layers size={14} />}
          label="Binges"
          value={data.sessions.length}
          accent="magenta"
        />
        <KpiCard
          icon={<Clock size={14} />}
          label="Total Time Lost"
          value={formatTime(totalMs)}
          accent="green"
        />
        <KpiCard
          icon={<SkipForward size={14} />}
          label="Impulsive Skips"
          value={skips}
          accent="amber"
        />
      </div>
    </div>
  );
}
