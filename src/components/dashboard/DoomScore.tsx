// React & 3rd-party
import React from 'react';
import { Clock, Hash } from 'lucide-react';

// Components
import { KpiCard } from '../ui/KpiCard';

// Utils
import { formatTime } from '../../utils/time';

// Styles
import './DoomScore.css';

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
