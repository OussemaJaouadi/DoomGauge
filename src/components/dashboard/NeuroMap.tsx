import React from 'react';
import { KpiCard } from '../ui/KpiCard';
import { Badge } from '../ui/Badge';
import { attentionROI, calibrationBadge, compulsionIndex, quantile, sessionStats, splitSessions } from '../../utils/telemetry';
import { localDateKey } from '../../utils/time';
import type { TelemetryEvent } from '../../types/telemetry';

interface NeuroMapProps {
  events: TelemetryEvent[];
  daysOfHistory: number;
}

export function NeuroMap({ events, daysOfHistory }: NeuroMapProps) {
  const sessions = splitSessions(events);
  const stats = sessions.map(sessionStats);

  // Baseline = per-day velocities over the slice; "today" = most recent day.
  const byDay = new Map<string, TelemetryEvent[]>();
  for (const e of events) {
    const key = localDateKey(new Date(e.ts));
    const arr = byDay.get(key) ?? [];
    arr.push(e);
    byDay.set(key, arr);
  }
  const dayKeys = [...byDay.keys()].sort();
  const dayVelocities = dayKeys.map((k) => {
    const evts = byDay.get(k)!;
    const spanMin = Math.max((evts[evts.length - 1]!.ts - evts[0]!.ts) / 60000, 1);
    return evts.length / spanMin;
  });
  const baseline = quantile(dayVelocities, 0.5);
  const todayEvts = byDay.get(dayKeys[dayKeys.length - 1]!) ?? [];
  const todaySkip = todayEvts.length > 0 ? todayEvts.filter((e) => e.skipped).length / todayEvts.length : 0;
  const todaySpanMin = Math.max(
    todayEvts.length > 1 ? (todayEvts[todayEvts.length - 1]!.ts - todayEvts[0]!.ts) / 60000 : 0,
    1,
  );
  const todayVelocity = todayEvts.length / todaySpanMin;
  const compulsion = compulsionIndex(todaySkip, todayVelocity, baseline);
  const roi = attentionROI(events);
  const badge = calibrationBadge(daysOfHistory);

  const calibrated = daysOfHistory >= 7;
  const vP80 = quantile(stats.map((s) => s.velocity), 0.8) ?? Infinity;
  const sP75 = quantile(stats.map((s) => s.skipRate), 0.75) ?? Infinity;
  const vP20 = quantile(stats.map((s) => s.velocity), 0.2) ?? -Infinity;
  const dP80 = quantile(stats.map((s) => s.dwellSec), 0.8) ?? Infinity;
  // v0 seed heuristics pre-baseline (disclosed via badge); personal quantiles after.
  const foraging = stats.filter((s) =>
    calibrated ? s.velocity > vP80 && s.skipRate > sP75 : s.velocity > 4.5 && s.skipRate > 0.7,
  ).length;
  const freeze = stats.filter((s) =>
    calibrated ? s.velocity < vP20 && s.dwellSec > dP80 : s.velocity < 1.2 && s.dwellSec > 45,
  ).length;
  const classified = Math.max(1, foraging + freeze);

  return (
    <div className="lens-panel">
      <div className="lens-title">
        DUAL-STATE NEURO MAP — foraging vs freeze{' '}
        <Badge variant={badge.state === 'calibrated' ? 'success' : 'warning'}>{badge.label}</Badge>
      </div>
      <div className="neuro-split">
        <div className="neuro-bar">
          <span className="neuro-foraging" style={{ width: `${Math.round((foraging / classified) * 100)}%` }} />
          <span className="neuro-freeze" style={{ width: `${Math.round((freeze / classified) * 100)}%` }} />
        </div>
        <div className="neuro-labels">
          <span>FORAGING {foraging} — stim hunger · frantic flick</span>
          <span>FREEZE {freeze} — dissociated · tab-close paralysis</span>
        </div>
      </div>
      <div className="lens-grid3">
        <KpiCard
          label="Compulsion"
          value={compulsion !== null ? `${compulsion.toFixed(2)}×` : '—'}
          sublabel={compulsion !== null && compulsion > 2 ? 'acute agitation' : 'near baseline'}
          accent={compulsion !== null && compulsion > 2 ? 'threat' : 'green'}
        />
        <KpiCard
          label="Attention ROI"
          value={roi !== null ? `${roi.toFixed(1)}%` : '—'}
          sublabel="time on completed"
          accent="green"
        />
        <KpiCard label="Sessions" value={sessions.length} sublabel={`${daysOfHistory}d history`} accent="default" />
      </div>
    </div>
  );
}
