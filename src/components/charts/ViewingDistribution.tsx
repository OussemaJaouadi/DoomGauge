import { measurementHints } from '../ui/hintContent';
import { useState } from 'react';
import type { ViewingDistribution as Distribution } from '../../utils/popupActivity';
import { formatTime } from '../../utils/time';
import { Hint } from '../ui/Hint';
import './ViewingDistribution.css';

const colors = [
  'var(--accent-amber)',
  'var(--duration-short)',
  'var(--duration-medium)',
  'var(--accent-blue)',
  'var(--duration-long)',
];

const share = (value: number, available: boolean) => available ? `${value.toFixed(1)}%` : '—';

export function ViewingDistribution({ data }: { data: Distribution }) {
  const [selected, setSelected] = useState(0);
  const bucket = data.buckets[selected]!;
  const details = (item: Distribution['buckets'][number]) =>
    `${item.label}: ${item.count} reels (${share(item.countPct, data.totalCount > 0)}), ${formatTime(item.activeMs)} active (${share(item.timePct, data.totalMs > 0)})`;

  return (
    <section className="popup-signal viewing-distribution" aria-labelledby="distribution-heading">
      <div className="popup-signal-heading">
        <h2 id="distribution-heading">Where reels & time go</h2>
        <Hint accent="blue" label="How viewing duration is grouped"
          text={measurementHints.popupDistribution} />
      </div>
      <div className="distribution-bars">
        {(['count', 'time'] as const).map(metric => (
          <div className="distribution-row" key={metric}>
            <span>{metric === 'count' ? 'Reels' : 'Active time'}</span>
            <div className="distribution-track" role="img"
              aria-label={`${metric === 'count' ? 'Reel shares' : 'Active time shares'}: ${data.buckets.map(item => `${item.label} ${share(metric === 'count' ? item.countPct : item.timePct, metric === 'count' ? data.totalCount > 0 : data.totalMs > 0)}`).join(', ')}`}>
              {data.buckets.map((item, index) => (
                <span key={item.label} className={`distribution-segment ${selected === index ? 'selected' : ''}`}
                  style={{ width: `${metric === 'count' ? item.countPct : item.timePct}%`, background: colors[index] }}
                  onMouseEnter={() => setSelected(index)} title={details(item)} />
              ))}
            </div>
            <span className="distribution-total">{(metric === 'count' ? data.totalCount : data.totalMs) > 0 ? '100%' : '—'}</span>
          </div>
        ))}
      </div>
      <div className="distribution-legend" role="group" aria-label="Inspect viewing duration">
        {data.buckets.map((item, index) => (
          <button type="button" key={item.label} aria-pressed={selected === index}
            aria-label={details(item)} onMouseEnter={() => setSelected(index)}
            onFocus={() => setSelected(index)} onClick={() => setSelected(index)}>
            <span style={{ background: colors[index] }} aria-hidden="true" />{item.label}
          </button>
        ))}
      </div>
      <p className="distribution-detail">
        <strong>{bucket.label}</strong>
        <span>{bucket.count} reels <b>{share(bucket.countPct, data.totalCount > 0)}</b></span>
        <span>{formatTime(bucket.activeMs)} active <b>{share(bucket.timePct, data.totalMs > 0)}</b></span>
      </p>
    </section>
  );
}
