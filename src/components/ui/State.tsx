import React from 'react';
import { Activity, AlertTriangle } from 'lucide-react';
import './State.css';
type Action = { label: string; onClick: () => void };

export function EmptyState({ title = 'No activity recorded', hint = 'No completed reels in this period.', action }: { title?: string; hint?: string; action?: Action }) {
  return (
    <div className="ui-state" role="status">
      <Activity size={28} className="ui-state-icon" />
      <div className="ui-state-title">{title}</div>
      <div className="ui-state-hint">{hint}</div>
      {action && <button type="button" className="state-inline-action" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}

export function ErrorState({ title = 'Activity unavailable', hint = 'Try loading this section again.', action }: { title?: string; hint?: string; action?: Action }) {
  return (
    <div className="ui-state ui-state-error" role="alert">
      <AlertTriangle size={28} className="ui-state-icon" />
      <div className="ui-state-title">{title}</div>
      <div className="ui-state-hint">{hint}</div>
      {action && <button type="button" className="state-inline-action" onClick={action.onClick}>{action.label}</button>}
    </div>
  );
}
