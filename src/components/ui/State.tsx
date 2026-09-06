import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import './State.css';

export function EmptyState({ title = 'NO SIGNAL RECORDED TODAY', hint = 'No short-form video activity detected for this day.' }: { title?: string; hint?: string }) {
  return (
    <div className="ui-state">
      <Activity size={28} className="ui-state-icon" />
      <div className="ui-state-title">{title}</div>
      <div className="ui-state-hint">{hint}</div>
    </div>
  );
}

export function ErrorState({ title = 'TELEMETRY OFFLINE', hint = 'Check extension background worker or reload the extension.' }: { title?: string; hint?: string }) {
  return (
    <div className="ui-state ui-state-error">
      <AlertTriangle size={28} className="ui-state-icon" />
      <div className="ui-state-title">{title}</div>
      <div className="ui-state-hint">{hint}</div>
    </div>
  );
}
