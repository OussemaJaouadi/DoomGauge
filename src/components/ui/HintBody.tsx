import type { HintContent } from './hintContent';

export function HintBody({ content }: { content: HintContent }) {
  if (typeof content === 'string') return <span>{content}</span>;
  return <><dl className="hint-facts">{content.rows.map((row, index) => <div key={`${row.label}-${index}`}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>{content.note && <p className="hint-note">{content.note}</p>}</>;
}
