import React from 'react';
import { Info } from 'lucide-react';
import './SignalsImpatience.css';

const rows = [
  { key: 'IG', label: 'Instagram', pct: 71, count: 151, skip: 107, color: '#a855f7', badge: 'twitchiest' },
  { key: 'YT', label: 'YouTube', pct: 58, count: 153, skip: 89, color: '#ff3344', badge: '' },
  { key: 'FB', label: 'Facebook', pct: 44, count: 70, skip: 31, color: '#00b4d8', badge: 'your calmest' },
];

export function SignalsImpatience() {
  return (
    <div className="impatience">
      <div className="imp-head">
        <div className="imp-head-title">Bailed in 3 seconds <span className="imp-info" title="Flick = bail <3s — before hook registers. Counted via ReelTimer durationMs <3000"><Info size={12} /></span></div>
        <div className="imp-head-sub">reels you flicked before watching</div>
      </div>

      {rows.map(r=>{
        const of10 = Math.round(r.pct/10);
        return (
          <div key={r.key} className="imp-row">
            <div className="imp-row-top">
              <span className="imp-platform" style={{color:r.color}}>{r.label}</span>
              <span className="imp-of10">{of10} of 10 flicked</span>
              <span className="imp-pct">{r.pct}%</span>
              {r.badge && <span className={`imp-badge ${r.badge==='twitchiest'?'badge-hot':''}`}>{r.badge}</span>}
            </div>
            <div className="filmstrip" aria-label={`${r.skip} of ${r.count} flicked before 3 seconds`}>
              {Array.from({length:10},(_,i)=> (
                <span key={i} className="film-cell" style={{ background: i<of10? r.color : 'transparent', borderColor: i<of10? r.color : 'var(--border-subtle)', opacity: i<of10?1:0.5 }} />
              ))}
              <span className="film-label">{of10}/10</span>
            </div>
            <div className="imp-meta">{r.skip} of {r.count} · ~1.2s avg flick</div>
          </div>
        );
      })}

      <div className="imp-avg-pill">Your avg: 6 of 10 · 62%</div>
    </div>
  );
}
