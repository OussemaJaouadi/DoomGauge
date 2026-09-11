// React & 3rd-party
import type { CSSProperties } from 'react';

// Types & Models
import { PLATFORMS, type Platform, type PlatformStats } from '../../types/models';
import type { ViewingDistribution as Distribution } from '../../types/popup';

// UI Components
import { Hint } from '../ui/Hint';
import { StateRegion } from '../ui/StateRegion';
import { ViewingDistribution } from '../charts/ViewingDistribution';

// Meta & Tokens
import { platformMeta } from '../platformMeta';

// Utilities & Helpers
import { skipDiagnostics } from '../../utils/metrics';
import { readyState, contentState, ratioState } from '../../utils/uiState';
import { measurementHints } from '../ui/hintContent';

// Styles
import './SignalsTab.css';

interface SignalsTabProps {
  data: Record<Platform, PlatformStats>;
  totalCount: number;
  totalCompleted?: number;
  totalSkips: number;
  quickSkipPct: number;
  averageSeconds: number;
  distribution: Distribution | (() => Distribution);
}

export function SignalsTab({
  data,
  totalCount,
  totalSkips,
  quickSkipPct,
  averageSeconds,
  distribution,
  totalCompleted = totalCount,
}: SignalsTabProps) {
  return (
    <div className="popup-signals">
      <StateRegion state={ratioState(totalCount, 'activity')} id="popup.average" label="Time per reel" shape="metrics">
        {() => {
          const { medianMs } = typeof distribution === 'function' ? distribution() : distribution;
          const medianSec = medianMs !== null ? medianMs / 1000 : null;
          const avgSec = totalCount > 0 ? averageSeconds : null;
          const dragSec = (medianSec !== null && avgSec !== null) ? Math.max(0, avgSec - medianSec) : null;
          const skewRatio = (medianSec !== null && medianSec > 0 && avgSec !== null) ? (avgSec / medianSec).toFixed(1) : null;

          const maxSec = Math.max(90, avgSec ? Math.ceil((avgSec * 1.3) / 15) * 15 : 90);
          const medianPct = medianSec !== null ? Math.min(95, Math.max(5, (medianSec / maxSec) * 100)) : 0;
          const avgPct = avgSec !== null ? Math.min(95, Math.max(5, (avgSec / maxSec) * 100)) : 0;

          return (
            <section className="popup-signal popup-cadence-section" aria-labelledby="average-watch-heading">
              <div className="popup-signal-heading">
                <h2 id="average-watch-heading">Flick Cadence <span>(Tempo &amp; Skew)</span></h2>
                <Hint
                  accent="blue"
                  label="How average watch time is measured"
                  text={measurementHints.average}
                />
              </div>

              <div className="popup-cadence-grid">
                <div className="popup-cadence-stat">
                  <span className="popup-cadence-val">{medianSec !== null ? `${medianSec.toFixed(1)}s` : '—'}</span>
                  <span className="popup-cadence-lbl">Median (Typical)</span>
                </div>

                {dragSec !== null && dragSec > 0.5 && (
                  <div className="popup-cadence-drag">
                    <span className="popup-cadence-drag-val">+{dragSec.toFixed(1)}s</span>
                    <span className="popup-cadence-drag-lbl">Outlier drag ({skewRatio}×)</span>
                  </div>
                )}

                <div className="popup-cadence-stat popup-cadence-stat-right">
                  <span className="popup-cadence-val">{avgSec !== null ? `${avgSec.toFixed(1)}s` : '—'}</span>
                  <span className="popup-cadence-lbl">Average (Volume)</span>
                </div>
              </div>

              {totalCount > 0 && medianSec !== null && avgSec !== null && (
                <div className="popup-cadence-track-wrap" aria-hidden="true">
                  <div className="popup-cadence-track">
                    <div
                      className="popup-cadence-span"
                      style={{
                        left: `${Math.min(medianPct, avgPct)}%`,
                        width: `${Math.abs(avgPct - medianPct)}%`,
                      }}
                    />
                    <div
                      className="popup-cadence-pin popup-cadence-pin-median"
                      style={{ left: `${medianPct}%` }}
                      title={`Median: ${medianSec.toFixed(1)}s`}
                    >
                      <span className="popup-cadence-pin-dot" />
                    </div>
                    <div
                      className="popup-cadence-pin popup-cadence-pin-avg"
                      style={{ left: `${avgPct}%` }}
                      title={`Average: ${avgSec.toFixed(1)}s`}
                    >
                      <span className="popup-cadence-pin-dot" />
                    </div>
                  </div>
                  <div className="popup-cadence-scale">
                    <span>0s</span>
                    <span>{Math.round(maxSec / 2)}s</span>
                    <span>{maxSec}s+</span>
                  </div>
                </div>
              )}
            </section>
          );
        }}
      </StateRegion>

      <StateRegion state={contentState(totalCount)} id="popup.distribution" label="Viewing duration" shape="chart">
        {() => <ViewingDistribution data={typeof distribution === 'function' ? distribution() : distribution} />}
      </StateRegion>

      <StateRegion state={ratioState(totalCompleted, 'completed')} id="popup.skips" label="Quick skips">
        <section className="popup-signal" aria-labelledby="quick-skips-heading">
          <div className="popup-signal-heading">
            <h2 id="quick-skips-heading">Impatience <span>(&lt;3s bail)</span></h2>
            <Hint
              accent="amber"
              label="How quick skips are measured"
              text={measurementHints.skipStrip}
            />
          </div>

          <div className="popup-signal-hero">
            <span className="popup-signal-hero-val">{totalCompleted ? `${quickSkipPct}%` : '—'}</span>
            <div className="popup-signal-hero-meta">
              <span className="popup-signal-hero-lbl">Impatience rate</span>
              <span className="popup-signal-hero-sub">{totalSkips} / {totalCompleted} bailed &lt;3s</span>
            </div>
          </div>

          <div className="popup-signal-platforms">
            {PLATFORMS.map(platform => {
              const stats = data[platform];
              const meta = platformMeta[platform];
              const completed = stats.completedCount ?? stats.count;
              const { pct, of10 } = skipDiagnostics(stats.skip, completed);
              return (
                <div
                  className="popup-signal-platform"
                  key={platform}
                  style={{ '--platform-color': meta.color } as CSSProperties}
                >
                  <div className="popup-signal-platform-row">
                    <div className="popup-platform-brand">
                      <span className="popup-platform-icon" style={{ color: meta.color }}>{meta.icon}</span>
                      <span className="popup-platform-name">{meta.label}</span>
                    </div>
                    <div className="popup-platform-stat-cluster">
                      <span className="popup-platform-pill">{completed ? `${pct}%` : '—'}</span>
                      <span className="popup-platform-count">{stats.skip}/{completed}</span>
                    </div>
                  </div>
                  <div className="popup-filmstrip" aria-hidden="true">
                    {Array.from({ length: 10 }, (_, index) => (
                      <span
                        key={index}
                        style={{
                          background: index < of10 ? meta.color : undefined,
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </StateRegion>
    </div>
  );
}
