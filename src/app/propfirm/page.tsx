'use client';

import { useState } from 'react';
import { usePropFirm } from '../../hooks/usePropFirm';
import { useToast } from '../../context/ToastContext';

const FIRMS = ['FTMO', 'MFF', 'TFT', 'MyFundedFX', 'custom'];

function GaugeBar({ label, used, limit, color }: { label: string; used: number; limit: number; color: string }) {
  const pct = Math.min(100, (used / limit) * 100);
  const danger = pct >= 80;
  const warn   = pct >= 60;
  const barColor = danger ? 'var(--red)' : warn ? 'var(--amber)' : color;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'var(--t2)' }}>{label}</span>
        <span style={{ color: barColor, fontWeight: 600 }}>{used.toFixed(1)}% / {limit}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: barColor }} />
      </div>
      <div className="text-xs text-right" style={{ color: 'var(--t3)' }}>
        {(limit - used).toFixed(2)}% remaining
      </div>
    </div>
  );
}

function StatusBadge({ canTrade, blockReason }: { canTrade: boolean; blockReason: string | null }) {
  if (canTrade) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        style={{ background: 'rgba(0,230,118,0.08)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.2)' }}>
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }} />
        Trading Permitted
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 px-3 py-2 rounded-lg text-sm"
      style={{ background: 'rgba(255,56,86,0.08)', color: 'var(--red)', border: '1px solid rgba(255,56,86,0.2)' }}>
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--red)' }} />
        Trading BLOCKED
      </div>
      {blockReason && <div className="text-xs mt-0.5 opacity-80">{blockReason}</div>}
    </div>
  );
}

function CreateForm({ onCreate }: { onCreate: (data: any) => void }) {
  const [firm, setFirm]     = useState('FTMO');
  const [phase, setPhase]   = useState('challenge');
  const [size, setSize]     = useState(100000);
  const [dailyLoss, setDailyLoss] = useState(5);
  const [maxDD, setMaxDD]   = useState(10);
  const [target, setTarget] = useState(10);
  const [minDays, setMinDays] = useState(4);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onCreate({ firm_name: firm, phase, account_size: size, daily_loss_limit_pct: dailyLoss, max_drawdown_pct: maxDD, profit_target_pct: target, min_trading_days: minDays });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full px-3 py-2 rounded-lg text-sm focus:outline-none";
  const inputStyle = { background: 'var(--bg4)', border: '1px solid var(--border)', color: 'var(--t1)' };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 max-w-lg">
      <div>
        <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--t1)' }}>Start New Challenge</h2>
        <p className="text-xs" style={{ color: 'var(--t2)' }}>Track your prop firm evaluation in real time</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>Firm</label>
          <select value={firm} onChange={(e) => setFirm(e.target.value)} className={inputCls} style={inputStyle}>
            {FIRMS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>Phase</label>
          <select value={phase} onChange={(e) => setPhase(e.target.value)} className={inputCls} style={inputStyle}>
            <option value="challenge">Challenge</option>
            <option value="verification">Verification</option>
            <option value="funded">Funded</option>
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>Account Size ($)</label>
        <input type="number" value={size} onChange={(e) => setSize(+e.target.value)} min={1000} className={inputCls} style={inputStyle} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Daily Loss Limit %', val: dailyLoss, set: setDailyLoss },
          { label: 'Max Drawdown %',     val: maxDD,     set: setMaxDD     },
          { label: 'Profit Target %',    val: target,    set: setTarget    },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>{label}</label>
            <input type="number" value={val} onChange={(e) => set(+e.target.value)} min={1} max={50}
              className={inputCls} style={inputStyle} />
          </div>
        ))}
      </div>

      <div>
        <label className="text-xs mb-1 block" style={{ color: 'var(--t2)' }}>Min Trading Days</label>
        <input type="number" value={minDays} onChange={(e) => setMinDays(+e.target.value)} min={1} max={30}
          className="w-32 px-3 py-2 rounded-lg text-sm focus:outline-none" style={inputStyle} />
      </div>

      <button type="submit" disabled={loading}
        className="px-5 py-2.5 rounded-lg text-sm font-semibold self-start"
        style={{ background: 'var(--acc)', color: 'var(--bg)', opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Creating…' : 'Start Challenge'}
      </button>
    </form>
  );
}

export default function PropFirmPage() {
  const { status, history, loading, createChallenge } = usePropFirm();
  const { addToast } = useToast();

  const handleCreate = async (data: any) => {
    try {
      await createChallenge(data);
      addToast('Challenge created successfully', 'success');
    } catch {
      addToast('Failed to create challenge', 'error');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48" style={{ color: 'var(--t3)' }}>Loading…</div>;
  }

  return (
    <div className="flex flex-col gap-6 p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>Prop Firm Tracker</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>Live challenge dashboard with rule-based circuit breaker</p>
      </div>

      {status ? (
        <div className="flex flex-col gap-5">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3 py-1 rounded-full text-xs font-semibold"
              style={{ background: 'var(--bg3)', color: 'var(--acc)', border: '1px solid var(--border)' }}>
              {status.challenge.firm_name} · {status.challenge.phase}
            </div>
            <StatusBadge canTrade={status.can_trade} blockReason={status.block_reason} />
          </div>

          {/* Gauges */}
          <div className="grid gap-4 p-5 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <GaugeBar label="Daily Loss Used" used={status.daily_loss_used_pct} limit={status.challenge.daily_loss_limit_pct} color="var(--blue)" />
            <GaugeBar label="Total Drawdown"  used={status.total_drawdown_pct}  limit={status.challenge.max_drawdown_pct}     color="var(--amber)" />
            <div className="flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span style={{ color: 'var(--t2)' }}>Profit Progress</span>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>{status.profit_progress_pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, status.profit_progress_pct)}%`, background: 'var(--green)' }} />
              </div>
              <div className="text-xs text-right" style={{ color: 'var(--t3)' }}>
                Target: ${(status.challenge.account_size * status.challenge.profit_target_pct / 100).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Balance',       value: `$${status.challenge.current_balance?.toLocaleString() ?? '—'}`,  color: 'var(--t1)' },
              { label: 'Daily Remaining', value: `${status.daily_loss_remaining_pct.toFixed(2)}%`,              color: status.daily_loss_remaining_pct < 1 ? 'var(--red)' : 'var(--green)' },
              { label: 'Trading Days',  value: String(status.challenge.trading_days_used),                       color: 'var(--t1)' },
              { label: 'Days Left',     value: status.trading_days_remaining != null ? String(Math.floor(status.trading_days_remaining)) : '∞', color: 'var(--t1)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--t3)' }}>{label}</div>
                <div className="text-lg font-bold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Start new challenge link */}
          <button onClick={() => createChallenge}
            className="self-start text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border)' }}>
            + Start new challenge
          </button>
        </div>
      ) : (
        <CreateForm onCreate={handleCreate} />
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--t2)' }}>Challenge History</h2>
          <div className="flex flex-col gap-2">
            {history.map((c: any) => (
              <div key={c._id} className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{c.firm_name}</span>
                  <span style={{ color: 'var(--t3)', fontSize: 11 }}>{c.phase}</span>
                  <span style={{ color: 'var(--t3)', fontSize: 11 }}>${c.account_size?.toLocaleString()}</span>
                </div>
                <span className="px-2 py-0.5 rounded text-xs font-semibold"
                  style={{
                    color: c.status === 'passed' ? 'var(--green)' : c.status === 'failed' ? 'var(--red)' : 'var(--t2)',
                    background: c.status === 'passed' ? 'rgba(0,230,118,0.08)' : c.status === 'failed' ? 'rgba(255,56,86,0.08)' : 'var(--bg4)',
                  }}>
                  {c.status?.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
