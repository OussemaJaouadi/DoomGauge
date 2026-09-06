// React & 3rd-party
import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from 'recharts';

// Utils
import { formatTime } from '../../utils/time';

// Types
import type { ChartMode, ChartItem } from '../../types/models';

// Styles
import { ChartTooltip } from '../ui/ChartTooltip';
import './Donut.css';

function DonutCard({ active, payload, mode }: any) {
  if (!active || !payload?.[0]) return null;
  const d = payload[0].payload as ChartItem & { value: number; pct: number };
  return (
    <ChartTooltip head={<><span className="dot" style={{ background: d.color }} />{d.label} · {d.pct}%</>}>
      {mode === 'time' ? <span>{formatTime(d.timeMs)}</span> : <span>{d.count} reels</span>}
    </ChartTooltip>
  );
}

const renderActive = (props: any) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return <Sector cx={cx} cy={cy} innerRadius={innerRadius} outerRadius={outerRadius + 6} startAngle={startAngle} endAngle={endAngle} fill={fill} stroke="var(--bg-root)" strokeWidth={1} />;
};

export function Donut({ items, mode, onModeChange }: { items: ChartItem[]; mode: ChartMode; onModeChange: (m:ChartMode)=>void }) {
  const [active, setActive] = useState<number | undefined>(undefined);
  const total = mode==='time' ? items.reduce((s,i)=>s+i.timeMs,0) : items.reduce((s,i)=>s+i.count,0);
  const data = items.map(i=> {
    const v = mode==='time'? i.timeMs : i.count;
    return { ...i, value: v, pct: total? Math.round((v/total)*100) : 0 };
  });
  const totalTimeMs = items.reduce((s,i)=>s+i.timeMs,0);
  const totalCount = items.reduce((s,i)=>s+i.count,0);

  return (
    <div className="donut-wrap">
      <div className="donut-head">
        <span className="donut-title">Share of total {mode==='time'?'time':'reels'}</span>
        <div className="donut-toggle">
          <button type="button" aria-pressed={mode === 'time'} className={mode==='time'?'active':''} onClick={()=>onModeChange('time')}>Time</button>
          <button type="button" aria-pressed={mode === 'count'} className={mode==='count'?'active':''} onClick={()=>onModeChange('count')}>Count</button>
        </div>
      </div>

      <div className="donut-main">
        <div className="donut-chart">
          <ResponsiveContainer width={132} height={132}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                cx="50%" cy="50%"
                innerRadius={41}
                outerRadius={62}
                paddingAngle={2}
                stroke="var(--bg-root)"
                strokeWidth={1}
                isAnimationActive={false}
                // @ts-expect-error recharts types currently omit activeIndex
                activeIndex={active}
                activeShape={renderActive}
                onMouseEnter={(_, idx)=>setActive(idx)}
                onMouseLeave={()=>setActive(undefined)}
              >
                {data.map((e)=> <Cell key={e.platform} fill={e.color} stroke="var(--bg-root)" strokeWidth={1} />)}
              </Pie>
              <Tooltip content={<DonutCard mode={mode} />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center">
            {mode==='time' ? (
              <>
                <div className="donut-center-value">{formatTime(totalTimeMs)}</div>
                <div className="donut-center-sub">{totalCount} reels</div>
              </>
            ) : (
              <>
                <div className="donut-center-value">{totalCount}</div>
                <div className="donut-center-sub">{formatTime(totalTimeMs)}</div>
              </>
            )}
          </div>
        </div>

        <div className="donut-legend">
          {data.map(i=> <span key={i.platform} className="donut-legend-item"><span className="dot" style={{background:i.color}} />{i.label} {i.pct}%</span>)}
        </div>
      </div>
    </div>
  );
}
