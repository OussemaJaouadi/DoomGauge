import type { ReactNode } from 'react';
import { Hint } from '../ui/Hint';
import type { HintContent } from '../ui/hintContent';

export function AnalysisPanel({ title, hint, controls, children }: { title: string; hint?: HintContent; controls?: ReactNode; children: ReactNode }) {
  return <section className="analysis-panel">
    <div className="analysis-panel-head"><h2>{title}</h2><div className="analysis-panel-actions">{controls}{hint && <Hint accent="blue" label={`About ${title.toLowerCase()}`} text={hint} />}</div></div>
    {children}
  </section>;
}
export function ChoiceGroup<T extends string>({ label, value, choices, onChange }: { label: string; value: T; choices: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return <div className="analysis-choices" role="group" aria-label={label}>{choices.map(choice =>
    <button type="button" key={choice.value} aria-pressed={value === choice.value} onClick={() => onChange(choice.value)}>{choice.label}</button>)}</div>;
}
export function NoObservations({ children = 'No completed views in this selection.' }: { children?: ReactNode }) {
  return <p className="analysis-empty">{children}</p>;
}
