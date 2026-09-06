import React from 'react';
import { Camera, MonitorPlay, MessageCircle } from 'lucide-react';
import type { Lens, Daypart } from '../../types/telemetry';
import { LENSES, DAYPARTS } from '../../types/telemetry';
import type { Platform } from '../../types/models';
import { PLATFORMS } from '../../types/models';
import { Sidebar, SidebarList, SidebarItem, SidebarSpacer } from '../ui/Sidebar';
import { platformMeta } from '../platformMeta';

export interface TelemetrySidebarProps {
  lens: Lens;
  onLensChange: (l: Lens) => void;
  platforms: Record<Platform, boolean>;
  onTogglePlatform: (p: Platform) => void;
  dayparts: Record<Daypart, boolean>;
  onToggleDaypart: (d: Daypart) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const lensIcon: Record<Lens, React.ReactNode> = {
  trajectory: <span>1.</span>,
  circadian: <span>2.</span>,
  survival: <span>3.</span>,
  gravity: <span>4.</span>,
  neuro: <span>5.</span>,
};

export function TelemetrySidebar({
  lens, onLensChange, platforms, onTogglePlatform,
  dayparts, onToggleDaypart, isCollapsed, onToggleCollapse,
}: TelemetrySidebarProps) {
  return (
    <Sidebar brandText="DOOMGAUGE TELEMETRY" isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse}>
      <div className="rack-section">ANALYTICAL LENSES</div>
      <SidebarList>
        {LENSES.map((l) => (
          <SidebarItem
            key={l.id}
            icon={lensIcon[l.id]}
            label={l.label}
            isActive={lens === l.id}
            onClick={() => onLensChange(l.id)}
          />
        ))}
      </SidebarList>

      <div className="rack-section">CHANNELS</div>
      <SidebarList>
        {PLATFORMS.map((p: Platform) => {
          const active = platforms[p];
          const meta = platformMeta[p];
          return (
            <button
              key={p}
              type="button"
              className={`channel-switch ${active ? 'active' : 'muted'}`}
              onClick={() => onTogglePlatform(p)}
              aria-pressed={active}
              title={`${meta.label}: ${active ? 'ARMED' : 'MUTED'}`}
            >
              <span
                className="channel-led"
                style={{
                  background: active ? meta.color : 'transparent',
                  boxShadow: active ? `0 0 8px ${meta.color}` : 'none',
                  borderColor: active ? meta.color : 'var(--border-subtle)',
                }}
              />
              <span className="channel-icon" style={{ color: active ? meta.color : 'var(--text-muted)' }}>
                {p === 'youtube' ? <MonitorPlay size={13} /> : p === 'instagram' ? <Camera size={13} /> : <MessageCircle size={13} />}
              </span>
              <span className="channel-name">{meta.label}</span>
              <span className={`channel-badge ${active ? 'on' : 'off'}`}>
                {active ? 'ON' : 'OFF'}
              </span>
            </button>
          );
        })}
      </SidebarList>

      <div className="rack-section">DAYPARTS</div>
      <SidebarList>
        {DAYPARTS.map((d) => {
          const active = dayparts[d.id];
          const isGrave = d.id === 'GRAVEYARD';
          return (
            <button
              key={d.id}
              type="button"
              className={`daypart-switch ${active ? 'active' : 'muted'} ${isGrave ? 'grave' : ''}`}
              onClick={() => onToggleDaypart(d.id)}
              aria-pressed={active}
              title={`${d.label} (${d.range}): ${active ? 'ARMED' : 'MUTED'}`}
            >
              <span
                className="daypart-led"
                style={{
                  background: active ? (isGrave ? 'var(--threat-red)' : 'var(--accent-green)') : 'transparent',
                  boxShadow: active ? (isGrave ? '0 0 8px rgba(255,42,59,0.6)' : '0 0 8px rgba(0,255,136,0.5)') : 'none',
                  borderColor: active ? (isGrave ? 'var(--threat-red)' : 'var(--accent-green)') : 'var(--border-subtle)',
                }}
              />
              <span className="daypart-name">{d.label}</span>
              <span className="daypart-range">{d.range}</span>
              <span className={`daypart-badge ${active ? 'on' : 'off'}`}>
                {active ? 'ON' : 'OFF'}
              </span>
            </button>
          );
        })}
      </SidebarList>
      <SidebarSpacer />
    </Sidebar>
  );
}
