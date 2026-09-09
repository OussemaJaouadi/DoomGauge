import { StateRegion } from '../ui/StateRegion';
import { measurementHints } from '../ui/hintContent';
import { PLATFORMS, type Platform, type PlatformStats } from '../../types/models';
import { platformMeta } from '../platformMeta';
import { skipDiagnostics } from '../../utils/metrics';
import { Hint } from '../ui/Hint';
import { ViewingDistribution } from '../charts/ViewingDistribution';
import type { ViewingDistribution as Distribution } from '../../utils/popupActivity';
import './SignalsTab.css';

interface SignalsTabProps {
  data: Record<Platform, PlatformStats>;
  totalCount: number;
  totalCompleted?: number;
  totalSkips: number;
  quickSkipPct: number;
  averageSeconds: number;
  distribution: Distribution;
}

export function SignalsTab({ data, totalCount, totalSkips, quickSkipPct, averageSeconds, distribution, totalCompleted = totalCount }: SignalsTabProps) {
  return (
    <div className="popup-signals">
      <StateRegion id="popup.skips" label="Quick skips"><section className="popup-signal" aria-labelledby="quick-skips-heading">
        <div className="popup-signal-heading">
          <h2 id="quick-skips-heading">Quick skips <span>(&lt;3s)</span></h2>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span className="popup-signal-percent">{totalCompleted ? `${quickSkipPct}%` : '—'}</span>
            <Hint
              accent="amber"
              label="How quick skips are measured"
              text={measurementHints.skipStrip}
            />
          </div>
        </div>
        <p className="popup-signal-value">{totalSkips}<span> / {totalCompleted} completed</span></p>
        <div className="popup-signal-platforms">
          {PLATFORMS.map(platform => {
            const stats = data[platform];
            const meta = platformMeta[platform];
            const { pct, of10 } = skipDiagnostics(stats.skip, stats.completedCount ?? stats.count);
            return (
              <div className="popup-signal-platform" key={platform}>
                <div className="popup-signal-platform-label">
                  <span><span style={{ color: meta.color }}>{meta.icon}</span>{meta.label}</span>
                  <span>{stats.skip}/{stats.completedCount ?? stats.count} · <strong className="popup-platform-pct">{(stats.completedCount ?? stats.count) ? `${pct}%` : '—'}</strong></span>
                </div>
                <div className="popup-filmstrip" aria-hidden="true">
                  {Array.from({ length: 10 }, (_, index) => (
                    <span key={index} style={{ background: index < of10 ? meta.color : undefined }} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section></StateRegion>

      <StateRegion id="popup.distribution" label="Viewing duration" shape="chart"><ViewingDistribution data={distribution} /></StateRegion>

      <StateRegion id="popup.average" label="Time per reel" shape="metrics"><section className="popup-signal" aria-labelledby="average-watch-heading">
        <div className="popup-signal-heading">
          <h2 id="average-watch-heading">Time per reel</h2>
          <Hint
            accent="blue"
            label="How average watch time is measured"
            text={measurementHints.average}
          />
        </div>
        <div className="popup-watch-summary">
          <p className="popup-signal-value">{totalCount ? `${averageSeconds.toFixed(1)}s` : '—'} <span>average</span></p>
          <p className="popup-signal-value">{distribution.medianMs === null ? '—' : `${(distribution.medianMs / 1000).toFixed(1)}s`} <span>median</span></p>
        </div>
      </section></StateRegion>
    </div>
  );
}
