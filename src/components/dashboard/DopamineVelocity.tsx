import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { chartTokens } from '../tokens';

export interface DopamineVelocityProps {
  data: {
    events: any[];
  };
}

export function DopamineVelocity({ data }: DopamineVelocityProps) {
  return (
    <div className="chart-panel full" style={{ height: '400px' }}>
      <div className="panel-title">Dopamine Velocity (Skip Rate)</div>
      <div style={{ flexGrow: 1, width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.events} margin={{ top: 20, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={chartTokens.borderGrid} strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="ts" 
              domain={['dataMin', 'dataMax']}
              type="number"
              tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString([], {hour: '2-digit'})}
              tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 11 }}
              axisLine={{ stroke: chartTokens.borderSubtle }}
              tickLine={false}
            />
            <YAxis 
              dataKey="durationMs" 
              tickFormatter={(ms) => `${(ms / 1000).toFixed(1)}s`}
              tick={{ fill: chartTokens.textMuted, fontFamily: chartTokens.fontMono, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{ background: 'var(--bg-surface-raised)', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontFamily: 'var(--font-mono)' }}
              formatter={(val: any) => [`${(val / 1000).toFixed(1)}s watch time`, 'Flick']}
              labelFormatter={(label: any) => new Date(label).toLocaleTimeString()}
            />
            <Line type="step" dataKey="durationMs" stroke="var(--accent-magenta)" strokeWidth={1} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
