// React & 3rd-party
import { useState } from 'react';
import { Clock3, Film, Eye, OctagonPause } from 'lucide-react';

// Types & Models
import { PLATFORMS, type Platform } from '../../types/models';

// UI Components
import { Hint } from '../ui/Hint';
import { StateRegion } from '../ui/StateRegion';
import { ThemeControl } from '../../theme/ThemeControl';
import { ChoiceGroup } from '../telemetry/Primitives';

// Tokens & Meta
import { platformMeta } from '../platformMeta';

// Utilities & Helpers
import { readyState } from '../../utils/uiState';
import { hintFacts } from '../ui/hintContent';

// Styles
import './SettingsPage.css';

export function validMockLimit(value: string, maximum: number): boolean {
  const trimmed = value.trim();
  const num = Number(trimmed);
  return trimmed !== '' && Number.isInteger(num) && num >= 1 && num <= maximum;
}

export function SettingsPage() {
  const [period, setPeriod] = useState<'day' | 'session'>('day');
  const [platforms, setPlatforms] = useState<Platform[]>([...PLATFORMS]);
  const [reels, setReels] = useState('100');
  const [minutes, setMinutes] = useState('30');
  const [countEnabled, setCountEnabled] = useState(true);
  const [timeEnabled, setTimeEnabled] = useState(true);
  const [preview, setPreview] = useState(false);

  const countValid = !countEnabled || validMockLimit(reels, 10000);
  const timeValid = !timeEnabled || validMockLimit(minutes, 1440);
  const ready = platforms.length > 0 && (countEnabled || timeEnabled) && countValid && timeValid;
  const limits = [
    countEnabled ? `${reels} reels` : '',
    timeEnabled ? `${minutes} active minutes` : '',
  ].filter(Boolean);
  const scope = platforms.map(platform => platformMeta[platform].label).join(' + ');

  const handleReset = () => {
    setPeriod('day');
    setPlatforms([...PLATFORMS]);
    setReels('100');
    setMinutes('30');
    setCountEnabled(true);
    setTimeEnabled(true);
    setPreview(false);
  };

  const togglePlatform = (platform: Platform) => {
    setPlatforms(current =>
      current.includes(platform)
        ? current.filter(p => p !== platform)
        : [...current, platform]
    );
    setPreview(false);
  };

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="analysis-page-head">
        <div className="analysis-page-identity">
          <h1 id="settings-title">Settings</h1>
        </div>
      </div>

      <ThemeControl />

      <StateRegion
        state={readyState}
        id="settings.configuration"
        label="Settings"
        shape="settings"
        reasons={['settings']}
        onRetry={handleReset}
      >
        <div className="settings-stop-loss">
          <div className="settings-section-heading">
            <h2>Stop loss</h2>
            <span className="settings-mock-label">Mock · not saved or enforced</span>
            <Hint
              label="About stop loss"
              text={hintFacts(
                [
                  ['Trigger', 'Either enabled limit is reached'],
                  ['Scope', 'Selected platforms combined'],
                  ['Daily reset', 'Local midnight'],
                ],
                'Preview values are examples, not recommendations.'
              )}
            />
          </div>

          <div className="settings-rule-layout">
            <div className="settings-rule-editor">
              <div className="settings-rule-scope">
                <div className="settings-control-group">
                  <span>Count over</span>
                  <ChoiceGroup
                    label="Limit period"
                    value={period}
                    choices={[
                      { value: 'day', label: 'Each day' },
                      { value: 'session', label: 'Each session' },
                    ]}
                    onChange={value => {
                      setPeriod(value);
                      setPreview(false);
                    }}
                  />
                </div>

                <div className="settings-control-group">
                  <span>Platforms · combined</span>
                  <div
                    className="analysis-choices settings-platforms"
                    role="group"
                    aria-label="Platforms included in stop loss"
                  >
                    {PLATFORMS.map(platform => (
                      <button
                        type="button"
                        key={platform}
                        aria-pressed={platforms.includes(platform)}
                        onClick={() => togglePlatform(platform)}
                      >
                        <span style={{ color: platformMeta[platform].color }}>
                          {platformMeta[platform].icon}
                        </span>
                        {platformMeta[platform].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-limit-row">
                <Film size={22} className="settings-count-icon" />
                <div className="settings-limit-name">
                  <label htmlFor="stop-loss-reels">Reel count</label>
                  <span>Completed views</span>
                </div>
                <div className="settings-limit-input">
                  <div>
                    <input
                      id="stop-loss-reels"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={10000}
                      step={1}
                      disabled={!countEnabled}
                      value={reels}
                      aria-invalid={!countValid}
                      aria-describedby={!countValid ? 'reel-limit-error' : undefined}
                      onChange={event => {
                        setReels(event.target.value);
                        setPreview(false);
                      }}
                    />
                    <span>reels</span>
                  </div>
                  {!countValid && (
                    <small id="reel-limit-error">Use a whole number from 1 to 10,000.</small>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={countEnabled}
                  aria-label="Enable reel-count limit"
                  className="settings-toggle"
                  onClick={() => {
                    setCountEnabled(v => !v);
                    setPreview(false);
                  }}
                >
                  <span />
                </button>
              </div>

              <div className="settings-limit-row">
                <Clock3 size={22} className="settings-time-icon" />
                <div className="settings-limit-name">
                  <label htmlFor="stop-loss-minutes">Active time</label>
                  <span>
                    Paused time excluded{' '}
                    <Hint
                      label="About active-time limits"
                      text="Only active viewing counts. Pauses do not consume this limit."
                    />
                  </span>
                </div>
                <div className="settings-limit-input">
                  <div>
                    <input
                      id="stop-loss-minutes"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={1440}
                      step={1}
                      disabled={!timeEnabled}
                      value={minutes}
                      aria-invalid={!timeValid}
                      aria-describedby={!timeValid ? 'time-limit-error' : undefined}
                      onChange={event => {
                        setMinutes(event.target.value);
                        setPreview(false);
                      }}
                    />
                    <span>minutes</span>
                  </div>
                  {!timeValid && (
                    <small id="time-limit-error">Use a whole number from 1 to 1,440.</small>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={timeEnabled}
                  aria-label="Enable active-time limit"
                  className="settings-toggle"
                  onClick={() => {
                    setTimeEnabled(v => !v);
                    setPreview(false);
                  }}
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="settings-rule-preview">
              <div className="settings-rule-result">
                <div aria-live="polite">
                  {ready ? (
                    <>
                      <strong>{limits.join(' or ')}</strong>
                      <span>
                        {period === 'day' ? 'per day' : 'per session'} · {scope}
                      </span>
                    </>
                  ) : (
                    <span>
                      {!platforms.length
                        ? 'Select at least one platform.'
                        : !countEnabled && !timeEnabled
                        ? 'Enable a limit to preview it.'
                        : 'Check the highlighted limit.'}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="settings-preview-button"
                  disabled={!ready}
                  aria-expanded={preview && ready}
                  aria-controls="stop-loss-preview"
                  onClick={() => setPreview(v => !v)}
                >
                  <Eye size={16} />
                  {preview ? 'Hide preview' : 'Preview message'}
                </button>
              </div>

              {preview && ready && (
                <div className="settings-message-preview" id="stop-loss-preview">
                  <OctagonPause size={28} />
                  <div>
                    <span>Message preview</span>
                    <h3>Stop-loss limit reached</h3>
                    <p>
                      {limits.join(' or ')} {period === 'day' ? 'today' : 'this session'}.
                    </p>
                    <small>{scope}</small>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </StateRegion>

      <div className="settings-future">
        <h2>Later</h2>
        <p>AI analysis · Tab-switch tracking</p>
      </div>
    </section>
  );
}

