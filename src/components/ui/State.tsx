import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import './State.css';

export function EmptyState({ title = 'NO SIGNAL FOR TODAY', hint = 'Start scrolling to record data' }: { title?: string; hint?: string }) {
  return (
    <div className="ui-state">
      <Activity size={28} className="ui-state-icon" />
      <div className="ui-state-title">{title}</div>
      <div className="ui-state-hint">{hint}</div>
    </div>
  );
}

export function ErrorState({ title = 'DATA ERROR', hint = 'Failed to load telemetry' }: { title?: string; hint?: string }) {
  return (
    <div className="ui-state ui-state-error">
      <AlertTriangle size={28} className="ui-state-icon" />
      <div className="ui-state-title">{title}</div>
      <div className="ui-state-hint">{hint}</div>
    </div>
  );
}
