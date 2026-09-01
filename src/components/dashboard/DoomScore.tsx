import React from 'react';
import { Clock, Hash } from 'lucide-react';
import { KpiCard } from '../ui/KpiCard';
import './DoomScore.css';

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export interface DoomScoreProps {
  totalMs: number;
  totalCount: number;
}

export function DoomScore({ totalMs, totalCount }: DoomScoreProps) {
  return (
    <div className="doom-score">
      <KpiCard
        icon={<Clock size={14} />}
        label="Active Time"
        value={formatTime(totalMs)}
        accent="green"
        sublabel="today"
      />
      <KpiCard
        icon={<Hash size={14} />}
        label="Reel Count"
        value={totalCount}
        unit="reels"
        accent="green"
        sublabel="today"
      />
    </div>
  );
}
