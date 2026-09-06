// React & 3rd-party
import React from 'react';
import { Zap, Clock } from 'lucide-react';

// Components
import { Badge } from '../ui/Badge';
import { Hint } from '../ui/Hint';
import { platformMeta } from '../platformMeta';

// Types
import { PLATFORMS, type Platform, type PlatformStats } from '../../types/models';

// Styles
import './SignalsTab.css';

interface SignalsTabProps {
  data: Record<Platform, PlatformStats>;
  totalCount: number;
  totalSkips: number;
  impatiencePct: number;
  avgFlickSec: number;
}

export function SignalsTab({
  data,
  totalCount,
  totalSkips,
  impatiencePct,
  avgFlickSec,
}: SignalsTabProps) {
  // Pacing classification: <10s = Frantic, 10-45s = Focused, >45s = Trance Lock
  const isHunting = avgFlickSec < 10;
  const isFocused = avgFlickSec >= 10 && avgFlickSec <= 45;
  const isTrance = avgFlickSec > 45;

  return (
    <div className="signals-tab">
      {/* 1. The Dopamine Slot-Machine Monitor */}
      <div className="signals-card signals-card-hazard">
        <div className="signals-head">
          <div className="signals-title">
            <Zap size={14} style={{ color: 'var(--accent-amber)' }} />
            <span>Slot-Machine Loop (&lt;3s Skips)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge variant="warning">{impatiencePct}% COMPULSION</Badge>
            <Hint
              title="Slot-Machine Effect"
              text="Skipping reels before 3 seconds primes dopamine anticipation without delivering satisfaction, locking your brain into continuous seeking."
            />
          </div>
        </div>

        <div className="signals-hero">
          <span className="signals-hero-value">{totalSkips}</span>
          <span className="signals-hero-sub">of {totalCount} reels abandoned under 3s</span>
        </div>

        {/* Dual Progress Track */}
        <div className="compulsion-bar-track" aria-label={`${impatiencePct}% quick skips`}>
          <div className="compulsion-bar-fill" style={{ width: `${impatiencePct}%` }} />
          <div className="compulsion-bar-rest" style={{ width: `${100 - impatiencePct}%` }} />
        </div>

        {/* Per-Platform Filmstrips */}
        <div className="signals-platforms">
          {PLATFORMS.map((p) => {
            const meta = platformMeta[p];
            const stats = data[p];
            if (!stats) return null;
            const pct = stats.count > 0 ? Math.round((stats.skip / stats.count) * 100) : 0;
            const of10 = Math.min(10, Math.max(0, Math.round(pct / 10)));

            return (
              <div key={p} className="signals-platform-row">
                <div className="signals-platform-meta">
                  <span className="signals-platform-name" style={{ color: meta.color }}>
                    {meta.icon}
                    <span>{meta.label}</span>
                  </span>
                  <span className="signals-platform-stats">
                    {stats.skip}/{stats.count} · <strong style={{ color: 'var(--text-primary)' }}>{pct}%</strong>
                  </span>
                </div>
                <div className="signals-filmstrip">
                  {Array.from({ length: 10 }, (_, i) => (
                    <span
                      key={i}
                      className="signals-cell"
                      style={{
                        background: i < of10 ? meta.color : 'transparent',
                        borderColor: i < of10 ? meta.color : 'var(--border-subtle)',
                        opacity: i < of10 ? 1 : 0.35,
                      }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Attention Pacing & Dwell Time */}
      <div className="signals-card signals-card-pacing">
        <div className="signals-head">
          <div className="signals-title">
            <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
            <span>Attention Pacing · Average Dwell</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge variant="cyan">
              {isHunting ? 'RAPID FLICK (<10s)' : isFocused ? 'ENGAGED (10-45s)' : 'TRANCE LOCK (>45s)'}
            </Badge>
            <Hint
              title="Attention Pacing"
              text="Reels over 45 seconds allow natural completion and exit. Micro-reels under 10 seconds hijack executive control through rapid variable rewards."
            />
          </div>
        </div>

        <div className="signals-hero">
          <span className="signals-hero-value">{avgFlickSec}s</span>
          <span className="signals-hero-sub">average time watched per reel</span>
        </div>

        {/* Pacing Spectrum Ruler */}
        <div className="pacing-meter">
          <div className="pacing-track">
            <div className={`pacing-zone ${isHunting ? 'active' : ''}`} />
            <div className={`pacing-zone ${isFocused ? 'active' : ''}`} />
            <div className={`pacing-zone ${isTrance ? 'active' : ''}`} />
          </div>
          <div className="pacing-labels">
            <span style={{ color: isHunting ? 'var(--accent-cyan)' : undefined }}>&lt;10s Rapid Flick</span>
            <span style={{ color: isFocused ? 'var(--accent-cyan)' : undefined }}>10s–45s Engaged</span>
            <span style={{ color: isTrance ? 'var(--accent-cyan)' : undefined }}>&gt;45s Trance Lock</span>
          </div>
        </div>
      </div>
    </div>
  );
}
