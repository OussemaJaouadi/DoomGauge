import { StateRegion } from '../ui/StateRegion';
import { useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { Platform } from '../../types/models';
import type { PreviewObservation } from '../../types/telemetryPreview';
import { filterReelRecords, recordPage, type RecordFilters, type RecordSort } from '../../utils/reelRecords';
import { formatTime, localDateKey } from '../../utils/time';
import { platformMeta } from '../platformMeta';
import { Hint } from '../ui/Hint';
import { hintFacts } from '../ui/hintContent';
import './ReelRecords.css';

const platforms: Platform[] = ['youtube', 'instagram', 'facebook'];
const defaults: RecordFilters = { platforms, quickSkips: false, from: '', to: '' };
const dateFormat = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

export function ReelRecords({ events }: { events: readonly PreviewObservation[] }) {
  const [filters, setFilters] = useState(defaults);
  const [sort, setSort] = useState<RecordSort>('started');
  const [descending, setDescending] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(10);
  const viewport = useRef<HTMLDivElement>(null);
  const available = useMemo(() => platforms.filter(platform => events.some(event => event.platform === platform)), [events]);
  const dates = useMemo(() => [...new Set(events.map(event => localDateKey(new Date(event.ts))))].sort(), [events]);
  const filtered = useMemo(() => filterReelRecords(events, filters, sort, descending), [events, filters, sort, descending]);
  const result = recordPage(filtered, page, size);
  const changePage = (next: number) => { setPage(next); viewport.current?.scrollTo({ top: 0 }); };
  const changeFilters = (next: RecordFilters) => { setFilters(next); changePage(0); };
  const changeSort = (next: RecordSort) => { setDescending(next === sort ? !descending : false); setSort(next); changePage(0); };
  const hasFilters = filters.quickSkips || !!filters.from || !!filters.to || available.some(platform => !filters.platforms.includes(platform));
  const sortHeader = (key: RecordSort, label: string) => <th scope="col" className={key === 'started' ? '' : 'record-number'} aria-sort={sort === key ? descending ? 'descending' : 'ascending' : 'none'}><button type="button" onClick={() => changeSort(key)}>{label}{sort === key ? descending ? <ArrowDown size={14} /> : <ArrowUp size={14} /> : <ArrowUpDown size={14} />}</button></th>;

  return <section className="records-panel" aria-label="Reel records">
    <div className="records-heading"><h3>Reel records</h3><span>{events.length.toLocaleString()} in session</span><Hint label="About reel records" text={hintFacts([['Active', 'Viewing time without pauses'], ['Elapsed', 'Start to end, including pauses'], ['Scope', 'Full session; local start dates']])} /></div>
    {events.length > 0 && <div className="records-filters">
      {available.length > 1 && <div className="analysis-choices" role="group" aria-label="Filter record platforms">{available.map(platform => <button type="button" key={platform} aria-pressed={filters.platforms.includes(platform)} onClick={() => changeFilters({ ...filters, platforms: filters.platforms.includes(platform) ? filters.platforms.filter(item => item !== platform) : [...filters.platforms, platform] })}><i style={{ background: platformMeta[platform].color }} />{platformMeta[platform].label}</button>)}</div>}
      <div className="analysis-choices"><button type="button" aria-pressed={filters.quickSkips} onClick={() => changeFilters({ ...filters, quickSkips: !filters.quickSkips })}>Quick skips &lt;3s</button></div>
      {dates.length > 1 && <div className="records-dates"><label>From<input type="date" value={filters.from} min={dates[0]} max={filters.to || dates.at(-1)} onChange={event => changeFilters({ ...filters, from: event.target.value })} /></label><label>To<input type="date" value={filters.to} min={filters.from || dates[0]} max={dates.at(-1)} onChange={event => changeFilters({ ...filters, to: event.target.value })} /></label></div>}
      {hasFilters && <button type="button" className="workspace-text-button" onClick={() => changeFilters(defaults)}>Clear filters</button>}
    </div>}
    <div className="records-pagination"><span role="status">{result.start}–{result.end} of {result.total.toLocaleString()}{hasFilters ? ' matching reels' : ' reels'}</span>
      <div className="records-page-size"><span>Rows</span><div className="analysis-choices" role="group" aria-label="Rows per page">{[10, 25, 50].map(count => <button type="button" key={count} aria-pressed={size === count} onClick={() => { setSize(count); changePage(0); }}>{count}</button>)}</div></div>
      <nav aria-label="Reel record pages"><button type="button" aria-label="First page" disabled={result.page === 0} onClick={() => changePage(0)}><ChevronsLeft size={18} /></button><button type="button" aria-label="Previous page" disabled={result.page === 0} onClick={() => changePage(result.page - 1)}><ChevronLeft size={18} /></button><span>{result.page + 1} / {result.pageCount}</span><button type="button" aria-label="Next page" disabled={result.page + 1 === result.pageCount} onClick={() => changePage(result.page + 1)}><ChevronRight size={18} /></button><button type="button" aria-label="Last page" disabled={result.page + 1 === result.pageCount} onClick={() => changePage(result.pageCount - 1)}><ChevronsRight size={18} /></button></nav>
    </div>
    <StateRegion id="evidence.records" label="Reel records" shape="table" skeletonCount={size} reasons={["activity", "filters", "session"]} onClearFilters={() => changeFilters(defaults)}><div className="records-viewport" ref={viewport} tabIndex={0} role="region" aria-label="Reel records table">
      <table><caption className="records-sr-only">Reel records from the full session. Times are local.</caption><thead><tr>{sortHeader('started', 'Started')}<th scope="col">Platform</th>{sortHeader('active', 'Active')}{sortHeader('elapsed', 'Elapsed')}<th scope="col">Status</th></tr></thead>
        <tbody>{result.rows.map(event => <tr key={event.id}><td><time dateTime={new Date(event.ts).toISOString()}><b>{timeFormat.format(event.ts)}</b><span>{dateFormat.format(event.ts)}</span></time></td><td><span className="record-platform"><i style={{ background: platformMeta[event.platform].color }} />{platformMeta[event.platform].label}</span></td><td className="record-number">{formatTime(event.durationMs)}</td><td className="record-number">{formatTime(event.endedTs - event.ts)}</td><td>{event.status === 'open' ? 'In progress' : event.status === 'interrupted' ? 'Interrupted' : 'Completed'}</td></tr>)}
          {!result.total && <tr><td colSpan={5} className="records-empty">{events.length ? 'No reels match these filters.' : 'No reel records in this session.'}</td></tr>}
        </tbody></table>
    </div></StateRegion>
  </section>;
}
