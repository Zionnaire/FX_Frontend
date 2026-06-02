'use client';

import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';
import { updateAutoTrade, regenerateApiKey } from '../../services/execution.service';
import api from '../../services/api';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="toggle-switch" onClick={(e) => { e.stopPropagation(); onChange(); }}>
      <input type="checkbox" checked={checked} onChange={() => {}} />
      <span className="slider" />
    </label>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--t2)' }}>{label}</label>
      {hint && <p className="text-xs mb-1.5" style={{ color: 'var(--t3)' }}>{hint}</p>}
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { addToast } = useToast();

  const at = user?.autoTrade ?? {};

  const [enabled,          setEnabled]          = useState<boolean>(at.enabled          ?? false);
  const [defaultRiskPct,   setDefaultRiskPct]   = useState<number>(at.defaultRiskPct    ?? 1);
  const [maxDailyLossPct,  setMaxDailyLossPct]  = useState<number>(at.maxDailyLossPct   ?? 5);
  const [maxDailyTrades,   setMaxDailyTrades]   = useState<number>(at.maxDailyTrades    ?? 3);
  const [minConfluence,    setMinConfluence]    = useState<number>(at.minConfluence      ?? 5);
  const [minConfidence,    setMinConfidence]    = useState<number>(at.minConfidence      ?? 65);
  const [apiKey,           setApiKey]           = useState<string>(at.mt5ApiKey          ?? '');
  const [saving,           setSaving]           = useState(false);
  const [regenerating,     setRegenerating]     = useState(false);
  const [copied,           setCopied]           = useState(false);

  const eaConnected = at.eaLastPollAt
    ? Date.now() - new Date(at.eaLastPollAt).getTime() < 30_000
    : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAutoTrade({ enabled, defaultRiskPct, maxDailyLossPct, maxDailyTrades, minConfluence, minConfidence });
      await refreshUser();
      addToast('Auto-trade settings saved', 'success');
    } catch {
      addToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenKey = async () => {
    if (!window.confirm('Regenerate API key? Your existing EA connection will stop working until you update the key in MT5.')) return;
    setRegenerating(true);
    try {
      const res = await regenerateApiKey();
      const newKey = res.data?.data?.mt5ApiKey ?? '';
      setApiKey(newKey);
      await refreshUser();
      addToast('API key regenerated — update it in your MT5 EA', 'success');
    } catch {
      addToast('Failed to regenerate key', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4 max-w-2xl mx-auto">

      {/* ── Auto-Trade Master Switch ─────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="font-semibold text-sm" style={{ color: 'var(--t1)' }}>Auto-Trade (MT5 Bridge)</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
              When enabled, A+ signals automatically queue for MT5 execution via the AURA Bridge EA.
            </div>
          </div>
          <Toggle checked={enabled} onChange={() => setEnabled(!enabled)} />
        </div>

        {/* EA connection status */}
        <div className="flex items-center gap-2 mt-3 text-xs">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: eaConnected ? 'var(--green)' : 'var(--border2)' }}
          />
          <span style={{ color: eaConnected ? 'var(--green)' : 'var(--t3)' }}>
            {eaConnected ? 'EA Connected — polling active' : 'EA not connected'}
          </span>
          {at.eaLastPollAt && (
            <span style={{ color: 'var(--t3)' }}>
              · Last seen {Math.round((Date.now() - new Date(at.eaLastPollAt).getTime()) / 1000)}s ago
            </span>
          )}
        </div>
      </div>

      {/* ── Risk Parameters ──────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--t3)' }}>Risk Parameters</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Risk per trade (%)" hint="Percentage of balance risked on each auto-trade.">
            <input className="inp" type="number" min="0.1" max="10" step="0.1"
              value={defaultRiskPct} onChange={(e) => setDefaultRiskPct(parseFloat(e.target.value))} />
          </Field>

          <Field label="Max daily loss (%)" hint="Bot stops trading when day's auto-trade losses exceed this.">
            <input className="inp" type="number" min="1" max="50" step="0.5"
              value={maxDailyLossPct} onChange={(e) => setMaxDailyLossPct(parseFloat(e.target.value))} />
          </Field>

          <Field label="Max trades per day" hint="Maximum number of auto-executions in a 24-hour period.">
            <input className="inp" type="number" min="1" max="20" step="1"
              value={maxDailyTrades} onChange={(e) => setMaxDailyTrades(parseInt(e.target.value))} />
          </Field>

          <Field label="Min confidence (%)" hint="Only auto-trade when AI confidence is at or above this level.">
            <input className="inp" type="number" min="50" max="100" step="1"
              value={minConfidence} onChange={(e) => setMinConfidence(parseInt(e.target.value))} />
          </Field>

          <Field label="Min confluence score (0–8)" hint="Only auto-trade when enough technical factors agree.">
            <input className="inp" type="number" min="1" max="8" step="1"
              value={minConfluence} onChange={(e) => setMinConfluence(parseInt(e.target.value))} />
          </Field>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 px-5 py-2 rounded text-sm font-bold transition-all"
          style={{ background: 'var(--acc)', color: '#000', opacity: saving ? 0.6 : 1 }}
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>

      {/* ── MT5 API Key ──────────────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--t3)' }}>MT5 API Key</div>
        <p className="text-xs mb-3" style={{ color: 'var(--t3)', lineHeight: 1.6 }}>
          Paste this key into the <strong style={{ color: 'var(--t2)' }}>ApiKey</strong> input parameter of the
          AURA_Bridge EA in MetaTrader 5. The EA will authenticate using this key to receive and execute trades.
        </p>

        {apiKey ? (
          <div className="flex gap-2 items-center mb-3">
            <div
              className="flex-1 px-3 py-2 rounded text-xs font-mono break-all"
              style={{ background: 'var(--bg2)', color: 'var(--acc)', border: '1px solid var(--border)' }}
            >
              {apiKey}
            </div>
            <button
              onClick={handleCopy}
              className="px-3 py-2 rounded text-xs font-semibold flex-shrink-0"
              style={{ background: copied ? 'var(--green)' : 'var(--bg4)', color: copied ? '#000' : 'var(--t2)', border: '1px solid var(--border2)' }}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <div className="text-xs mb-3" style={{ color: 'var(--t3)' }}>No API key yet — click Generate to create one.</div>
        )}

        <button
          onClick={handleRegenKey}
          disabled={regenerating}
          className="px-4 py-1.5 rounded text-xs font-semibold"
          style={{ background: 'var(--bg4)', color: 'var(--t2)', border: '1px solid var(--border2)', opacity: regenerating ? 0.6 : 1 }}
        >
          {regenerating ? 'Generating…' : apiKey ? 'Regenerate Key' : 'Generate Key'}
        </button>
      </div>

      {/* ── EA Setup Instructions ─────────────────────────────────────────────── */}
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>EA Setup Instructions</div>
        <ol className="text-xs space-y-2.5" style={{ color: 'var(--t2)', lineHeight: 1.7 }}>
          <li><span className="font-bold" style={{ color: 'var(--acc)' }}>1.</span> Download <strong>AURA_Bridge.mq5</strong> from the app and place it in your MT5 <code style={{ color: 'var(--acc)' }}>MQL5/Experts</code> folder.</li>
          <li><span className="font-bold" style={{ color: 'var(--acc)' }}>2.</span> In MT5, go to <strong>Tools → Options → Expert Advisors</strong> and add your backend URL to the <em>Allowed URLs</em> list.</li>
          <li><span className="font-bold" style={{ color: 'var(--acc)' }}>3.</span> Compile the EA in MetaEditor (F7), then attach it to any chart (the pair doesn't matter — it trades all pairs).</li>
          <li><span className="font-bold" style={{ color: 'var(--acc)' }}>4.</span> In the EA inputs, set <code style={{ color: 'var(--acc)' }}>BackendUrl</code> to your backend URL and paste your API key into <code style={{ color: 'var(--acc)' }}>ApiKey</code>.</li>
          <li><span className="font-bold" style={{ color: 'var(--acc)' }}>5.</span> Enable <strong>AutoTrading</strong> in MT5 (the green play button in the toolbar).</li>
          <li><span className="font-bold" style={{ color: 'var(--acc)' }}>6.</span> When the EA connects, the status above will turn green. You're live.</li>
        </ol>
      </div>

      {/* ── Telegram Notifications ─────────────────────────────────────────── */}
      <TelegramSection />

    </div>
  );
}

function TelegramSection() {
  const { addToast } = useToast();
  const [chatId, setChatId]     = useState('');
  const [enabled, setEnabled]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [topics, setTopics]     = useState({
    on_signal: true, on_auto_trade: true, on_alert: true,
    on_daily_briefing: true, on_circuit_breaker: true,
  });

  const save = async () => {
    if (!chatId.trim()) { addToast('Enter your Telegram Chat ID first', 'error'); return; }
    setSaving(true);
    try {
      await api.patch('/user/profile', { telegram: { chat_id: chatId, enabled, ...topics } });
      addToast('Telegram settings saved', 'success');
    } catch {
      addToast('Failed to save Telegram settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none";
  const inputStyle = { background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--t1)' };

  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--t1)' }}>Telegram Notifications</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>
            Get A+ signals, auto-trade alerts, and circuit breaker warnings in Telegram
          </p>
        </div>
        <label className="toggle-switch">
          <input type="checkbox" checked={enabled} onChange={() => setEnabled((v) => !v)} />
          <span className="slider" />
        </label>
      </div>

      {enabled && (
        <div className="flex flex-col gap-4">
          <Field label="Telegram Chat ID"
            hint='Open t.me/userinfobot in Telegram and send /start — it replies with your Chat ID'>
            <input value={chatId} onChange={(e) => setChatId(e.target.value)}
              placeholder="e.g. 123456789"
              className={inputCls} style={inputStyle} />
          </Field>

          <div>
            <label className="text-xs font-semibold block mb-3" style={{ color: 'var(--t2)' }}>Notify me for</label>
            <div className="flex flex-col gap-2">
              {([
                { key: 'on_signal',          label: 'A+ Signals generated' },
                { key: 'on_auto_trade',      label: 'Auto-trade queued' },
                { key: 'on_alert',           label: 'Price/RSI alerts fired' },
                { key: 'on_daily_briefing',  label: 'Daily pre-session briefing' },
                { key: 'on_circuit_breaker', label: 'Circuit breaker / prop firm warnings' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <span className="text-xs" style={{ color: 'var(--t1)' }}>{label}</span>
                  <label className="toggle-switch">
                    <input type="checkbox" checked={topics[key]}
                      onChange={() => setTopics((p) => ({ ...p, [key]: !p[key] }))} />
                    <span className="slider" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <button onClick={save} disabled={saving}
            className="self-start px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--acc)', color: 'var(--bg)', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Saving…' : 'Save Telegram Settings'}
          </button>
        </div>
      )}
    </div>
  );
}
