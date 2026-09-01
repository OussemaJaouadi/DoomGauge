import React from 'react';
import './StackedBar.css';

type Mode = 'time' | 'count';
interface Item { platform: 'youtube'|'instagram'|'facebook'; label: string; timeMs: number; count: number; color: string; }

export function StackedBar({ items, mode, onModeChange }: { items: Item[]; mode: Mode; onModeChange: (m: Mode)=>void }) {
  const totalTime = items.reduce((s,i)=>s+i.timeMs,0);
  const totalCount = items.reduce((s,i)=>s+i.count,0);
  const total = mode==='time'? totalTime : totalCount;
  return (
    <div className="stacked-bar-wrap">
      <div className="stacked-bar-head">
        <span className="stacked-title">Share — {mode==='time'?'time':'count'}</span>
        <div className="stacked-toggle">
          <button className={mode==='time'?'active':''} onClick={()=>onModeChange('time')}>Time</button>
          <button className={mode==='count'?'active':''} onClick={()=>onModeChange('count')}>Count</button>
        </div>
      </div>
      <div className="stacked-track">
        {items.map(i=>{
          const v = mode==='time'? i.timeMs : i.count;
          const pct = total? (v/total)*100 : 0;
          return <div key={i.platform} className="stacked-seg" style={{ width: `${pct}%`, background: i.color }} title={`${i.label} ${pct.toFixed(1)}%`} />;
        })}
      </div>
      <div className="stacked-legend">
        {items.map(i=>{
          const v = mode==='time'? i.timeMs : i.count;
          const pct = total? Math.round((v/total)*100) : 0;
          return <span key={i.platform} className="stacked-legend-item"><span className="dot" style={{background:i.color}} />{i.label} {pct}%</span>;
        })}
      </div>
    </div>
  );
}
