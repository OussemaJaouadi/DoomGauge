// React & 3rd-party
import React from 'react';

// Types
import { PLATFORMS } from '../../types/models';
import type { Platform, PlatformStats } from '../../types/models';

// Styles & Tokens
import { chartTokens } from '../tokens';
import './SignalsImpatience.css';

export function SignalsImpatience({ data }: { data: Record<Platform, PlatformStats> }) {
  const rows = PLATFORMS.map(p => {
    const d = data[p];
    const count = d?.count || 0;
    const skip = d?.skip || 0;
    const pct = count > 0 ? Math.round((skip / count) * 100) : 0;
    return {
      key: p,
      label: p.charAt(0).toUpperCase() + p.slice(1),
      pct,
      count,
      skip,
      color: chartTokens.platform[p]
    };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="impatience">
      <div className="imp-head">
        <div className="imp-head-title">BAILED IN 3s</div>
      </div>

      {rows.map(r=>{
        const of10 = Math.round(r.pct/10);
        return (
          <div key={r.key} className="imp-row">
            <div className="imp-row-header">
              <span className="imp-platform" style={{color:r.color}}>{r.label}</span>
              <span className="imp-pct">{r.pct}%</span>
              <span className="imp-count">{r.skip}/{r.count}</span>
            </div>
            <div className="filmstrip-full">
              {Array.from({length:10},(_,i)=> (
                <span key={i} className="film-cell" style={{ background: i<of10? r.color : 'transparent', borderColor: i<of10? r.color : 'var(--border-subtle)', opacity: i<of10?1:0.5 }} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
