import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Download, SlidersHorizontal, X } from 'lucide-react';
import { DAYPARTS, type Daypart, type TimeRange } from '../../types/telemetry';
import { ChoiceGroup } from './Primitives';
import { Hint } from '../ui/Hint';
import type { HintContent } from '../ui/hintContent';

interface TelemetryFiltersProps {
  range: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  dateLabel: string;
  onBack: () => void;
  onForward: () => void;
  forwardDisabled: boolean;
  daypart: Daypart[];
  onDaypartChange: (daypart: Daypart[]) => void;
  onExport: () => void;
  exportDisabled?: boolean;
  comparisonLabel: HintContent;
}

export function TelemetryFilters({ range, onRangeChange, dateLabel, onBack, onForward, forwardDisabled, daypart, onDaypartChange, onExport, exportDisabled = false, comparisonLabel }: TelemetryFiltersProps) {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  const allSelected = daypart.length === DAYPARTS.length;
  const selectedLabels = DAYPARTS.filter(option => daypart.includes(option.id)).map(option => option.label);
  const selectionLabel = allSelected ? 'All day' : selectedLabels.length === 0 ? 'None selected' : selectedLabels.length <= 2 ? selectedLabels.join(' + ') : `${selectedLabels.length} selected`;
  const close = () => { setOpen(false); trigger.current?.focus(); };
  useEffect(() => {
    if (!open) return;
    container.current?.querySelector<HTMLInputElement>('input')?.focus();
    const keydown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); setOpen(false); trigger.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', keydown);
    document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', keydown); document.removeEventListener('pointerdown', outside); };
  }, [open]);
  return <div className="analysis-filter-dock">
    <div className="analysis-filter-period">
      <ChoiceGroup label="Observation period" value={range} onChange={onRangeChange} choices={[{ value: 'day', label: 'Day' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }]} />
      <div className="analysis-date-navigation"><button type="button" aria-label="Previous period" onClick={onBack}><ArrowLeft size={16} /></button><div className="analysis-date-context"><span>{dateLabel}</span><Hint label="About selected dates and comparison" text={comparisonLabel} accent="blue" /></div><button type="button" aria-label="Next period" disabled={forwardDisabled} onClick={onForward}><ArrowRight size={16} /></button></div>
    </div>
    <div className="analysis-filter-navigation">
      <div className="daypart-control" ref={container}>
        <button type="button" className="daypart-trigger" ref={trigger} onClick={() => setOpen(value => !value)} aria-label={`Time of day: ${selectionLabel}`} aria-expanded={open} aria-haspopup="dialog" aria-controls={id}>
          <SlidersHorizontal size={16} /><span><b>{selectionLabel}</b></span><ChevronDown size={14} />
        </button>
        {!allSelected && <button type="button" className="daypart-reset" aria-label="Reset time of day" title="Reset time of day" onClick={() => onDaypartChange(DAYPARTS.map(option => option.id))}><X size={15} /></button>}
        {open && <div className="daypart-popover" id={id} role="dialog" aria-label="Time of day filter">
          <fieldset><legend>Include activity starting in</legend><label><input type="checkbox" checked={allSelected} ref={input => { if (input) input.indeterminate = daypart.length > 0 && !allSelected; }} onChange={() => onDaypartChange(allSelected ? [] : DAYPARTS.map(option => option.id))} /><span><b>All day</b><small>00:00–24:00</small></span></label>{DAYPARTS.map(option => <label key={option.id}>
            <input type="checkbox" name={id} value={option.id} checked={daypart.includes(option.id)} onChange={() => onDaypartChange(DAYPARTS.filter(item => item.id === option.id ? !daypart.includes(item.id) : daypart.includes(item.id)).map(item => item.id))} />
            <span><b>{option.label}</b><small>{option.range}</small></span>
          </label>)}</fieldset>
          <button type="button" className="daypart-done" onClick={close}>Done</button>
        </div>}
      </div>
      <button type="button" className="analysis-export" onClick={onExport} disabled={exportDisabled} aria-label="Export selected rollups" title={exportDisabled ? 'Load activity before exporting' : 'Export selected rollups'}><Download size={16} /></button>
    </div>

  </div>;
}
