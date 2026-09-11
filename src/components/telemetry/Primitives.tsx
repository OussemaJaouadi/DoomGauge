// React & 3rd-party
import type { ReactNode } from 'react';

// Types & Models
import type { HintContent } from '../ui/hintContent';

// UI Components
import { EmptyState } from '../ui/State';
import { Hint } from '../ui/Hint';
import { StateRegion } from '../ui/StateRegion';

// Utilities & Helpers
import { readyState } from '../../utils/uiState';

export function AnalysisPanel({ title, hint, controls, children }: { title: string; hint?: HintContent; controls?: ReactNode; children: ReactNode }) {
  return <section className="analysis-panel">
    <div className="analysis-panel-head"><h2>{title}</h2><div className="analysis-panel-actions">{controls}{hint && <Hint accent="blue" label={`About ${title.toLowerCase()}`} text={hint} />}</div></div>
    <StateRegion state={readyState} id={`panel.${title}`} label={title} shape="chart">{children}</StateRegion>
  </section>;
}
export function ChoiceGroup<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className="analysis-choices" role="group" aria-label={label}>{choices.map(choice =>
    <button type="button" key={choice.value} aria-pressed={value === choice.value} onClick={() => onChange(choice.value)}>{choice.label}</button>)}</div>;
}
export function NoObservations({ children }: { children?: ReactNode }) {
  return <EmptyState title={typeof children === "string" ? children : "No matching activity"} hint={children ? "" : "No completed reels in this selection."} />;
}
