'use client';

import React, { useState } from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import { useToast } from '../../context/ToastContext';
import { PAIRS } from '../../utils/constants';

const CONDITIONS = [
  { value: 'price_above', label: 'Price Above' },
  { value: 'price_below', label: 'Price Below' },
  { value: 'rsi_above', label: 'RSI Above' },
  { value: 'rsi_below', label: 'RSI Below' },
  { value: 'ai_signal_buy', label: 'AI Signal: Buy' },
  { value: 'ai_signal_sell', label: 'AI Signal: Sell' },
  { value: 'pattern_detected', label: 'Pattern Detected' },
];

const PATTERNS = [
  // ── Single / two-candle ──────────────────────────
  { value: 'Bullish Engulfing',  label: 'Bullish Engulfing ↑' },
  { value: 'Bearish Engulfing',  label: 'Bearish Engulfing ↓' },
  { value: 'Hammer',             label: 'Hammer ↑' },
  { value: 'Shooting Star',      label: 'Shooting Star ↓' },
  { value: 'Doji',               label: 'Doji (neutral)' },
  // ── Caginalp & Laurent (1998) three-day patterns ─
  { value: 'Three White Soldiers', label: 'Three White Soldiers ↑' },
  { value: 'Three Black Crows',    label: 'Three Black Crows ↓' },
  { value: 'Three Inside Up',      label: 'Three Inside Up ↑' },
  { value: 'Three Inside Down',    label: 'Three Inside Down ↓' },
  { value: 'Three Outside Up',     label: 'Three Outside Up ↑' },
  { value: 'Three Outside Down',   label: 'Three Outside Down ↓' },
  { value: 'Morning Star',         label: 'Morning Star ↑' },
  { value: 'Evening Star',         label: 'Evening Star ↓' },
];

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;

const PATTERN_TF_CONDITIONS = new Set(['pattern_detected', 'rsi_above', 'rsi_below', 'ai_signal_buy', 'ai_signal_sell']);

const DEFAULT_FORM = {
  type: 'info' as 'buy' | 'sell' | 'info',
  pair: PAIRS[0],
  condition: 'price_above',
  targetValue: '',
  targetPattern: '',
  timeframe: '1h',
  enabled: true,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <label className="toggle-switch" onClick={(e) => { e.stopPropagation(); onChange(); }}>
      <input type="checkbox" checked={checked} onChange={() => {}} />
      <span className="slider" />
    </label>
  );
}

function typeColor(t: string) {
  if (t === 'buy') return 'var(--green)';
  if (t === 'sell') return 'var(--red)';
  return 'var(--acc)';
}

export default function AlertsPage() {
  const { alerts, loading, createAlert, updateAlert, toggleAlert, deleteAlert } = useAlerts();
  const { addToast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingAlert, setEditingAlert] = useState<any>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });

  const isPattern = formData.condition === 'pattern_detected';
  const needsValue = !['ai_signal_buy', 'ai_signal_sell', 'pattern_detected'].includes(formData.condition);
  const needsTf = PATTERN_TF_CONDITIONS.has(formData.condition);

  const buildPayload = () => {
    const p: any = { type: formData.type, pair: formData.pair, condition: formData.condition, enabled: formData.enabled };
    if (isPattern) p.targetPattern = formData.targetPattern;
    else if (needsValue) p.targetValue = parseFloat(formData.targetValue);
    if (needsTf) p.timeframe = formData.timeframe;
    return p;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAlert) { await updateAlert(editingAlert._id, buildPayload()); addToast('Alert updated', 'success'); }
      else { await createAlert(buildPayload()); addToast('Alert created', 'success'); }
      setShowForm(false); setEditingAlert(null); setFormData({ ...DEFAULT_FORM });
    } catch { addToast('Failed to save alert', 'error'); }
  };

  const handleEdit = (a: any) => {
    setEditingAlert(a);
    setFormData({ type: a.type, pair: a.pair, condition: a.condition, targetValue: a.targetValue?.toString() ?? '', targetPattern: a.targetPattern ?? '', timeframe: a.timeframe ?? '1h', enabled: a.enabled });
    setShowForm(true);
  };

  const handleToggle = async (a: any) => {
    try { await toggleAlert(a._id); addToast(`Alert ${a.enabled ? 'disabled' : 'enabled'}`, 'success'); }
    catch { addToast('Failed to toggle', 'error'); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this alert?')) return;
    try { await deleteAlert(id); addToast('Deleted', 'success'); }
    catch { addToast('Failed to delete', 'error'); }
  };

  const activeCount = alerts.filter((a) => a.enabled).length;
  const triggeredCount = alerts.filter((a) => a.triggered).length;

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card p-3">
          <div className="text-xs" style={{ color: 'var(--t3)' }}>Total Alerts</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--acc)' }}>{alerts.length}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs" style={{ color: 'var(--t3)' }}>Active</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--green)' }}>{activeCount}</div>
        </div>
        <div className="card p-3">
          <div className="text-xs" style={{ color: 'var(--t3)' }}>Triggered</div>
          <div className="text-2xl font-bold mt-1" style={{ color: 'var(--amber)' }}>{triggeredCount}</div>
        </div>
      </div>

      {/* Form toggle */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Price Alerts</span>
          <button
            onClick={() => { setShowForm(!showForm); if (showForm) setEditingAlert(null); }}
            className="text-xs px-3 py-1.5 rounded font-semibold transition-all"
            style={{ background: showForm ? 'var(--bg2)' : 'var(--acc)', color: showForm ? 'var(--t2)' : '#000', border: showForm ? '1px solid var(--border2)' : 'none' }}
          >
            {showForm ? '✕ Cancel' : '+ New Alert'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="p-3 rounded" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Alert Type</label>
                <select className="inp" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value as any })} required>
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                  <option value="info">Info</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Pair</label>
                <select className="inp" value={formData.pair} onChange={(e) => setFormData({ ...formData, pair: e.target.value })} required>
                  {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Condition</label>
                <select className="inp" value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value, targetValue: '', targetPattern: '' })} required>
                  {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              {isPattern && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Pattern</label>
                  <select className="inp" value={formData.targetPattern} onChange={(e) => setFormData({ ...formData, targetPattern: e.target.value })} required>
                    <option value="">Select pattern</option>
                    {PATTERNS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
              )}
              {needsValue && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Target Value</label>
                  <input className="inp" type="number" step="0.00001" value={formData.targetValue} onChange={(e) => setFormData({ ...formData, targetValue: e.target.value })} placeholder="Enter value" required />
                </div>
              )}
              {needsTf && (
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Timeframe</label>
                  <select className="inp" value={formData.timeframe} onChange={(e) => setFormData({ ...formData, timeframe: e.target.value })}>
                    {TIMEFRAMES.map((tf) => <option key={tf} value={tf}>{tf}</option>)}
                  </select>
                </div>
              )}
              <div className="flex items-center gap-2 mt-4">
                <Toggle checked={formData.enabled} onChange={() => setFormData({ ...formData, enabled: !formData.enabled })} />
                <span className="text-xs" style={{ color: 'var(--t2)' }}>{formData.enabled ? 'Enabled' : 'Disabled'}</span>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" className="text-xs px-4 py-2 rounded font-semibold" style={{ background: 'var(--acc)', color: '#000' }}>
                {editingAlert ? 'Update Alert' : 'Create Alert'}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Alerts list */}
      <div className="card flex-1 overflow-auto">
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="h-12 rounded animate-pulse" style={{ background: 'var(--bg4)' }} />)}
          </div>
        ) : alerts.length === 0 ? (
          <div className="text-center py-12 text-xs" style={{ color: 'var(--t3)' }}>
            No alerts configured. Create your first alert to get started.
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
              <tr style={{ color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>
                {['Pair', 'Type', 'Condition', 'Value / Pattern', 'TF', 'Enabled', 'Status', ''].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const tc = typeColor(a.type);
                return (
                  <tr key={a._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-3 py-2 font-semibold" style={{ color: 'var(--t1)' }}>{a.pair}</td>
                    <td className="px-3 py-2">
                      <span className="px-1.5 py-0.5 rounded text-xs font-bold capitalize" style={{ color: tc, background: `${tc}18` }}>{a.type}</span>
                    </td>
                    <td className="px-3 py-2 capitalize" style={{ color: 'var(--t2)' }}>{a.condition.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2 font-mono-num" style={{ color: 'var(--t2)' }}>{a.targetPattern ?? a.targetValue ?? '—'}</td>
                    <td className="px-3 py-2 font-mono-num text-xs" style={{ color: 'var(--t3)' }}>{a.timeframe ?? '1h'}</td>
                    <td className="px-3 py-2">
                      <Toggle checked={a.enabled} onChange={() => handleToggle(a)} />
                    </td>
                    <td className="px-3 py-2">
                      {a.triggered
                        ? <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(255,183,0,0.15)', color: 'var(--amber)' }}>Triggered</span>
                        : a.enabled
                          ? <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--green)' }}>Watching</span>
                          : <span className="px-1.5 py-0.5 rounded text-xs font-bold" style={{ background: 'rgba(61,79,104,0.4)', color: 'var(--t3)' }}>Paused</span>
                      }
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(a)} className="text-xs" style={{ color: 'var(--acc)' }}>Edit</button>
                        <button onClick={() => handleDelete(a._id)} className="text-xs" style={{ color: 'var(--red)' }}>Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
