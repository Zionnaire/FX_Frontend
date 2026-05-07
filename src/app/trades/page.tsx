'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTrades } from '../../hooks/useTrades';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useLivePrices } from '../../hooks/useLivePrices';
import { PAIRS } from '../../utils/constants';
import { createChart } from 'lightweight-charts';
import { C } from '../../utils/chartColors';

// ── P&L curve chart ───────────────────────────────────────────────────────────

function PnLCurveChart({ trades }: { trades: any[] }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const closed = trades
      .filter((t) => t.pnl != null && t.exit != null)
      .sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    if (closed.length === 0) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: C.bg3 }, textColor: C.t2 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border, timeVisible: false },
      crosshair: { mode: 1 },
      width: ref.current.clientWidth,
      height: ref.current.clientHeight,
    });
    const area = chart.addAreaSeries({
      lineColor: C.acc, topColor: 'rgba(0,200,240,0.25)',
      bottomColor: 'rgba(0,0,0,0)', lineWidth: 2,
    });
    let cum = 0;
    area.setData(closed.map((t, i) => { cum += t.pnl; return { time: (i + 1) as any, value: cum }; }));
    chart.timeScale().fitContent();
    const onResize = () => { if (ref.current) chart.applyOptions({ width: ref.current.clientWidth }); };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [trades]);
  return <div ref={ref} className="w-full h-full" />;
}

// ── Live P&L helpers ──────────────────────────────────────────────────────────

function calcUnrealizedPnL(pair: string, type: string, entry: number, price: number, size: number): number {
  const dir = type === 'BUY' ? 1 : -1;
  let pnl: number;
  if (pair === 'USD/JPY')  pnl = dir * (price - entry) / price * 100_000 * size;
  else if (pair === 'XAU/USD') pnl = dir * (price - entry) * 100 * size;
  else pnl = dir * (price - entry) * 100_000 * size;
  return Math.round(pnl * 100) / 100;
}

function calcPips(pair: string, type: string, entry: number, price: number): number {
  const dir = type === 'BUY' ? 1 : -1;
  const diff = dir * (price - entry);
  if (pair === 'USD/JPY')  return Math.round(diff * 100 * 10) / 10;
  if (pair === 'XAU/USD')  return Math.round(diff * 10) / 10;
  return Math.round(diff * 10_000 * 10) / 10;
}

function formatDuration(openTime: string): string {
  const ms = Date.now() - new Date(openTime).getTime();
  const h  = Math.floor(ms / 3_600_000);
  const m  = Math.floor((ms % 3_600_000) / 60_000);
  if (h === 0)  return `${m}m`;
  if (h < 24)   return `${h}h ${m}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function fmtPrice(pair: string, price: number): string {
  if (pair === 'XAU/USD') return price.toFixed(2);
  if (pair === 'USD/JPY') return price.toFixed(3);
  return price.toFixed(5);
}

// ── Position Card ─────────────────────────────────────────────────────────────

function PositionCard({
  trade, price, tick, onClose,
}: {
  trade: any; price: number | undefined; tick: number; onClose: () => void;
}) {
  const isBuy    = trade.type === 'BUY';
  const hasPrice = price != null;
  const upnl     = hasPrice ? calcUnrealizedPnL(trade.pair, trade.type, trade.entry, price!, trade.size) : null;
  const pips     = hasPrice ? calcPips(trade.pair, trade.type, trade.entry, price!) : null;

  const progress = (() => {
    if (!hasPrice || trade.stopLoss == null || trade.takeProfit == null) return null;
    const totalMove = isBuy ? trade.takeProfit - trade.entry : trade.entry - trade.takeProfit;
    if (totalMove <= 0) return null;
    const moved = isBuy ? price! - trade.entry : trade.entry - price!;
    return Math.max(0, Math.min(100, (moved / totalMove) * 100));
  })();

  const pnlColor    = upnl == null ? 'var(--t3)' : upnl >= 0 ? 'var(--green)' : 'var(--red)';
  const borderColor = upnl == null ? 'var(--border)' : upnl >= 0 ? 'rgba(0,230,118,0.3)' : 'rgba(255,56,86,0.3)';

  return (
    <div className="flex-shrink-0 rounded-xl overflow-hidden" style={{ width: 224, background: 'var(--bg2)', border: `1px solid ${borderColor}` }}>
      <div className="h-0.5" style={{ background: isBuy ? 'var(--green)' : 'var(--red)' }} />

      {/* Header */}
      <div className="px-3 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold" style={{ color: 'var(--t1)' }}>{trade.pair}</span>
          <span className="text-xs font-bold px-1.5 py-0.5 rounded"
            style={{ color: isBuy ? 'var(--green)' : 'var(--red)', background: isBuy ? 'rgba(0,230,118,0.1)' : 'rgba(255,56,86,0.1)' }}>
            {isBuy ? '▲' : '▼'} {trade.type}
          </span>
        </div>
        <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>{formatDuration(trade.createdAt)}</span>
      </div>

      {/* Entry → Current */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 text-xs">
        <span className="font-mono-num" style={{ color: 'var(--t3)' }}>{fmtPrice(trade.pair, trade.entry)}</span>
        <span style={{ color: 'var(--t3)' }}>→</span>
        <span className="font-mono-num font-semibold" style={{ color: hasPrice ? pnlColor : 'var(--t3)' }}>
          {hasPrice ? fmtPrice(trade.pair, price!) : '…'}
        </span>
        {pips != null && (
          <span className="font-semibold" style={{ color: pnlColor }}>
            {pips >= 0 ? '+' : ''}{pips.toFixed(1)}p
          </span>
        )}
      </div>

      {/* SL/TP progress bar */}
      {trade.stopLoss != null && trade.takeProfit != null && (
        <div className="px-3 pb-1">
          <div className="flex justify-between mb-1" style={{ fontSize: 9 }}>
            <span style={{ color: 'var(--red)' }}>SL {fmtPrice(trade.pair, trade.stopLoss)}</span>
            <span style={{ color: 'var(--green)' }}>TP {fmtPrice(trade.pair, trade.takeProfit)}</span>
          </div>
          <div className="h-1.5 rounded-full" style={{ background: 'var(--border2)' }}>
            {progress != null && (
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: progress >= 70 ? 'var(--green)' : progress >= 35 ? 'var(--amber)' : 'var(--red)' }} />
            )}
          </div>
          {progress != null && (
            <div className="mt-0.5" style={{ fontSize: 9, color: 'var(--t3)' }}>{progress.toFixed(0)}% to TP</div>
          )}
        </div>
      )}

      {/* Footer: lots + live PnL + close */}
      <div className="px-3 pb-2.5 pt-1.5 flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--t3)' }}>{trade.size} lots</span>
        <div className="flex items-center gap-2">
          <span className="text-base font-bold font-mono-num" style={{ color: pnlColor }}>
            {upnl != null
              ? (upnl >= 0 ? '+$' : '-$') + Math.abs(upnl).toFixed(2)
              : hasPrice ? '—' : '…'}
          </span>
          <button
            onClick={onClose}
            className="text-xs px-2 py-0.5 rounded font-semibold"
            style={{ background: 'rgba(255,56,86,0.12)', color: 'var(--red)', border: '1px solid rgba(255,56,86,0.3)' }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form default ──────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  pair: PAIRS[0], type: 'BUY', entry: '', exit: '',
  stopLoss: '', takeProfit: '', size: '0.10', notes: '',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TradesPage() {
  const { trades, loading, createTrade, updateTrade, deleteTrade } = useTrades();
  const { analytics } = useAnalytics();
  const { addToast }  = useToast();
  const { refreshUser } = useAuth();

  // Duration refresh ticker (every 60s)
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Live prices for open positions
  const openTrades = useMemo(() => trades.filter((t) => t.exit == null), [trades]);
  const openPairs  = useMemo(() => [...new Set(openTrades.map((t) => t.pair))], [openTrades]);
  const livePrices = useLivePrices(openPairs);

  // Form state
  const [showForm,      setShowForm]      = useState(false);
  const [editingTrade,  setEditingTrade]  = useState<any>(null);
  const [formData,      setFormData]      = useState({ ...EMPTY_FORM });
  const [closingTrade,  setClosingTrade]  = useState<any>(null);
  const [closeExitPrice, setCloseExitPrice] = useState('');

  // Filter state
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [pairFilter,   setPairFilter]   = useState('');

  // Sort state
  const [sortCol, setSortCol]   = useState<string>('date');
  const [sortDir, setSortDir]   = useState<'asc' | 'desc'>('desc');

  const toggleSort = (col: string) => {
    if (sortCol === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  };

  // Filtered + sorted trades
  const filteredTrades = useMemo(() => {
    let list = trades.filter((t) => {
      if (statusFilter === 'open'   && t.exit != null)  return false;
      if (statusFilter === 'closed' && t.exit == null)  return false;
      if (pairFilter && t.pair !== pairFilter)          return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    list = [...list].sort((a, b) => {
      switch (sortCol) {
        case 'pair':   return dir * a.pair.localeCompare(b.pair);
        case 'pnl':    return dir * ((a.pnl ?? -Infinity) - (b.pnl ?? -Infinity));
        case 'entry':  return dir * (a.entry - b.entry);
        default:       return dir * (new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
      }
    });
    return list;
  }, [trades, statusFilter, pairFilter, sortCol, sortDir]);

  // Live P&L helpers (use tick so duration updates)
  const getUpnl = (t: any) => {
    void tick; // depend on tick to re-evaluate
    const price = livePrices[t.pair];
    if (price == null || t.exit != null) return null;
    return calcUnrealizedPnL(t.pair, t.type, t.entry, price, t.size);
  };
  const getLivePips = (t: any) => {
    const price = livePrices[t.pair];
    if (price == null || t.exit != null) return null;
    return calcPips(t.pair, t.type, t.entry, price);
  };

  const pricesReady = Object.keys(livePrices).length > 0;
  const totalFloat  = useMemo(
    () => openTrades.reduce((sum, t) => sum + (getUpnl(t) ?? 0), 0),
    [openTrades, livePrices]
  );

  // R:R preview in form
  const rrPreview = (() => {
    const e = parseFloat(formData.entry), sl = parseFloat(formData.stopLoss), tp = parseFloat(formData.takeProfit);
    if (!e || !sl || !tp) return null;
    const risk = Math.abs(e - sl), reward = Math.abs(tp - e);
    if (risk === 0) return null;
    return `1:${(reward / risk).toFixed(2)}`;
  })();

  // Handlers
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        pair:  formData.pair,
        type:  formData.type,
        entry: Number(formData.entry),
        size:  Number(formData.size),
        notes: formData.notes || undefined,
      };
      if (formData.exit)       payload.exit       = Number(formData.exit);
      if (formData.stopLoss)   payload.stopLoss   = Number(formData.stopLoss);
      if (formData.takeProfit) payload.takeProfit = Number(formData.takeProfit);

      if (editingTrade) {
        const update: any = { size: payload.size, notes: payload.notes };
        if (formData.exit)       update.exit       = payload.exit;
        if (formData.stopLoss)   update.stopLoss   = payload.stopLoss;
        if (formData.takeProfit) update.takeProfit = payload.takeProfit;
        await updateTrade(editingTrade._id, update);
        addToast('Trade updated', 'success');
      } else {
        await createTrade(payload);
        addToast('Trade added', 'success');
      }
      setShowForm(false); setEditingTrade(null); setFormData({ ...EMPTY_FORM });
    } catch { addToast('Failed to save trade', 'error'); }
  };

  const handleEdit = (t: any) => {
    setEditingTrade(t);
    setFormData({ pair: t.pair, type: t.type, entry: t.entry?.toString() || '', exit: t.exit?.toString() || '', stopLoss: t.stopLoss?.toString() || '', takeProfit: t.takeProfit?.toString() || '', size: t.size?.toString() || '0.10', notes: t.notes || '' });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this trade?')) return;
    try { await deleteTrade(id); addToast('Trade deleted', 'success'); }
    catch { addToast('Failed to delete', 'error'); }
  };

  const handleCloseTrade = async () => {
    if (!closingTrade || !closeExitPrice) return;
    try {
      await updateTrade(closingTrade._id, { exit: Number(closeExitPrice) });
      await refreshUser();
      addToast('Position closed', 'success');
      setClosingTrade(null); setCloseExitPrice('');
    } catch { addToast('Failed to close trade', 'error'); }
  };

  const exportCSV = () => {
    const headers = ['Date','Pair','Side','Entry','Exit','SL','TP','Lots','P&L','R:R','Status','Notes'];
    const rows = trades.map((t) => [
      t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '',
      t.pair, t.type, t.entry, t.exit ?? '', t.stopLoss ?? '', t.takeProfit ?? '',
      t.size, t.pnl != null ? t.pnl.toFixed(2) : '', t.rr ?? '', t.status,
      `"${(t.notes ?? '').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `trades_${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const pairStats = PAIRS.map((p) => {
    const pt   = trades.filter((t) => t.pair === p);
    const wins = pt.filter((t) => (t.pnl ?? 0) > 0).length;
    return { pair: p, count: pt.length, winRate: pt.length ? Math.round((wins / pt.length) * 100) : 0 };
  }).filter((s) => s.count > 0);

  const stats = {
    total:        trades.length,
    wins:         trades.filter((t) => (t.pnl ?? 0) > 0).length,
    losses:       trades.filter((t) => (t.pnl ?? 0) < 0).length,
    open:         openTrades.length,
    totalPnl:     trades.reduce((a, t) => a + (t.pnl ?? 0), 0),
    winRate:      analytics?.winRate ?? (trades.length ? Math.round((trades.filter((t) => (t.pnl ?? 0) > 0).length / trades.length) * 100) : 0),
    profitFactor: analytics?.profitFactor ?? 0,
    avgRR:        analytics?.avgRR ?? 0,
  };

  const F  = (v: number) => (v > 0 ? '+' : '') + v.toFixed(2);
  const F$ = (v: number) => (v >= 0 ? '+$' : '-$') + Math.abs(v).toFixed(2);
  const set = (k: keyof typeof EMPTY_FORM) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setFormData((p) => ({ ...p, [k]: e.target.value }));

  const SortTh = ({ col, label }: { col: string; label: string }) => (
    <th
      className="px-2 py-2 text-left font-medium whitespace-nowrap cursor-pointer select-none"
      onClick={() => toggleSort(col)}
      style={{ color: sortCol === col ? 'var(--acc)' : 'var(--t3)' }}
    >
      {label}{sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">

      {/* ── Close modal ────────────────────────────────────────── */}
      {closingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}>
          <div className="rounded-xl shadow-2xl overflow-hidden" style={{ width: 340, background: 'var(--bg2)', border: '1px solid var(--border)' }}>
            <div className="h-1" style={{ background: 'var(--red)' }} />
            <div className="p-5">
              <div className="text-sm font-bold mb-1" style={{ color: 'var(--t1)' }}>Close Position</div>
              <div className="flex items-center gap-2 mb-4 text-xs flex-wrap" style={{ color: 'var(--t3)' }}>
                <span className="font-semibold" style={{ color: closingTrade.type === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{closingTrade.type}</span>
                <span style={{ color: 'var(--t1)' }}>{closingTrade.pair}</span>
                <span>·</span>
                <span>Entry <strong style={{ color: 'var(--t2)' }}>{closingTrade.entry}</strong></span>
                <span>·</span>
                <span>{closingTrade.size} lots</span>
                {livePrices[closingTrade.pair] && (
                  <>
                    <span>·</span>
                    <span>Now <strong style={{ color: 'var(--acc)' }}>{fmtPrice(closingTrade.pair, livePrices[closingTrade.pair])}</strong></span>
                  </>
                )}
              </div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Exit Price</label>
              <input
                type="number" step="0.00001" className="inp w-full mb-1"
                value={closeExitPrice}
                onChange={(e) => setCloseExitPrice(e.target.value)}
                placeholder={livePrices[closingTrade.pair] ? fmtPrice(closingTrade.pair, livePrices[closingTrade.pair]) : 'Enter current price'}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCloseTrade()}
              />
              {livePrices[closingTrade.pair] && !closeExitPrice && (
                <button
                  className="text-xs mb-3 underline"
                  style={{ color: 'var(--acc)' }}
                  onClick={() => setCloseExitPrice(livePrices[closingTrade.pair].toFixed(5))}
                >
                  Use live price ({fmtPrice(closingTrade.pair, livePrices[closingTrade.pair])})
                </button>
              )}
              {closeExitPrice && closingTrade.entry && (
                <div className="mb-4 mt-2 text-xs px-2 py-1.5 rounded" style={{ background: 'var(--bg3)' }}>
                  {(() => {
                    const upnl = calcUnrealizedPnL(closingTrade.pair, closingTrade.type, closingTrade.entry, Number(closeExitPrice), closingTrade.size);
                    const pips = calcPips(closingTrade.pair, closingTrade.type, closingTrade.entry, Number(closeExitPrice));
                    return (
                      <span style={{ color: upnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
                        Est. P&L: {F$(upnl)} &nbsp;·&nbsp; {pips >= 0 ? '+' : ''}{pips.toFixed(1)} pips
                      </span>
                    );
                  })()}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={handleCloseTrade} disabled={!closeExitPrice}
                  className="flex-1 py-2.5 rounded text-sm font-bold"
                  style={{ background: 'var(--red)', color: '#fff', opacity: closeExitPrice ? 1 : 0.5 }}>
                  Close Position
                </button>
                <button onClick={() => { setClosingTrade(null); setCloseExitPrice(''); }}
                  className="flex-1 py-2.5 rounded text-sm font-semibold"
                  style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border)' }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats bar (8 metrics) ────────────────────────────── */}
      <div className="grid grid-cols-8 gap-2">
        {[
          { l: 'Trades',        v: stats.total,                                                           c: 'var(--acc)'   },
          { l: 'Win Rate',      v: stats.total > 0 ? `${stats.winRate}%` : '—',                           c: 'var(--green)' },
          { l: 'Total P&L',     v: stats.totalPnl !== 0 ? F(stats.totalPnl) : '—',                        c: stats.totalPnl >= 0 ? 'var(--green)' : 'var(--red)' },
          { l: 'Float P&L',     v: openTrades.length > 0 ? (pricesReady ? F$(totalFloat) : '…') : '—',   c: totalFloat >= 0 ? 'var(--green)' : 'var(--red)' },
          { l: 'Open',          v: stats.open,                                                             c: 'var(--amber)' },
          { l: 'Profit Factor', v: stats.profitFactor > 0 ? stats.profitFactor.toFixed(2) : '—',          c: stats.profitFactor >= 2 ? 'var(--green)' : stats.profitFactor >= 1 ? 'var(--amber)' : 'var(--red)' },
          { l: 'Avg R:R',       v: stats.avgRR > 0 ? `1:${stats.avgRR.toFixed(2)}` : '—',                 c: stats.avgRR >= 2 ? 'var(--green)' : stats.avgRR >= 1 ? 'var(--amber)' : 'var(--t2)' },
          { l: 'W / L',         v: stats.total > 0 ? `${stats.wins} / ${stats.losses}` : '—',             c: 'var(--t2)'    },
        ].map(({ l, v, c }) => (
          <div key={l} className="card p-3">
            <div className="text-xs" style={{ color: 'var(--t3)' }}>{l}</div>
            <div className="text-lg font-semibold font-mono-num mt-1 truncate" style={{ color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* ── Live positions ───────────────────────────────────── */}
      {openTrades.length > 0 && (
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full flex-shrink-0"
                style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse-green 2s infinite' }} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
                Live Positions &middot; {openTrades.length}
              </span>
            </div>
            {pricesReady && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--t3)' }}>Total Float</span>
                <span className="text-xs font-bold font-mono-num" style={{ color: totalFloat >= 0 ? 'var(--green)' : 'var(--red)' }}>
                  {F$(totalFloat)}
                </span>
              </div>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'thin' }}>
            {openTrades.map((t) => (
              <PositionCard
                key={t._id}
                trade={t}
                price={livePrices[t.pair]}
                tick={tick}
                onClose={() => { setClosingTrade(t); setCloseExitPrice(''); }}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Main area ────────────────────────────────────────── */}
      <div className="flex gap-3 flex-1 min-h-0">

        {/* Left: journal + table */}
        <div className="flex flex-col gap-3 flex-1 min-w-0">

          {/* Journal header + controls */}
          <div className="card p-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Trade Journal</span>

              {/* Status tabs */}
              <div className="flex gap-1">
                {(['all', 'open', 'closed'] as const).map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className="text-xs px-2.5 py-1 rounded font-semibold capitalize"
                    style={statusFilter === s
                      ? { background: 'var(--acc)', color: '#000' }
                      : { background: 'transparent', color: 'var(--t3)', border: '1px solid var(--border)' }}>
                    {s}
                  </button>
                ))}
              </div>

              {/* Pair filter */}
              <select value={pairFilter} onChange={(e) => setPairFilter(e.target.value)}
                className="text-xs px-2 py-1 rounded"
                style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border)' }}>
                <option value="">All Pairs</option>
                {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>

              <span className="text-xs" style={{ color: 'var(--t3)' }}>{filteredTrades.length} of {trades.length}</span>

              <div className="flex-1" />

              <button onClick={exportCSV}
                className="text-xs px-3 py-1.5 rounded font-semibold"
                style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border2)' }}>
                ↓ CSV
              </button>
              <button
                onClick={() => { setShowForm(!showForm); if (showForm) { setEditingTrade(null); setFormData({ ...EMPTY_FORM }); } }}
                className="text-xs px-3 py-1.5 rounded font-semibold"
                style={{ background: showForm ? 'var(--bg2)' : 'var(--acc)', color: showForm ? 'var(--t2)' : '#000', border: showForm ? '1px solid var(--border2)' : 'none' }}>
                {showForm ? '✕ Cancel' : '+ New Trade'}
              </button>
            </div>

            {showForm && (
              <form onSubmit={handleSubmit} className="mt-3 p-3 rounded" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Pair</label>
                    <select className="inp" value={formData.pair} onChange={set('pair')} required>
                      {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Side</label>
                    <select className="inp" value={formData.type} onChange={set('type')} required>
                      <option value="BUY">BUY</option>
                      <option value="SELL">SELL</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Lot Size</label>
                    <input className="inp" type="number" step="0.01" min="0.01" value={formData.size} onChange={set('size')} required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Entry</label>
                    <input className="inp" type="number" step="0.00001" value={formData.entry}
                      onChange={set('entry')} required={!editingTrade} disabled={!!editingTrade} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--t3)' }}>
                      Stop Loss <span style={{ color: 'var(--red)', fontSize: 10 }}>■</span>
                    </label>
                    <input className="inp" type="number" step="0.00001" value={formData.stopLoss} onChange={set('stopLoss')} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--t3)' }}>
                      Take Profit <span style={{ color: 'var(--green)', fontSize: 10 }}>■</span>
                    </label>
                    <input className="inp" type="number" step="0.00001" value={formData.takeProfit} onChange={set('takeProfit')} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Exit (to close)</label>
                    <input className="inp" type="number" step="0.00001" value={formData.exit} onChange={set('exit')} placeholder="Leave blank if open" />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Notes / Rationale</label>
                    <input className="inp" value={formData.notes} onChange={set('notes')} placeholder="e.g. Trend pullback buy at EMA20…" />
                  </div>
                </div>
                {rrPreview && (
                  <div className="mb-3 flex items-center gap-2 text-xs px-2 py-1.5 rounded"
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border2)' }}>
                    <span style={{ color: 'var(--t3)' }}>Risk:Reward</span>
                    <span className="font-mono-num font-bold"
                      style={{ color: parseFloat(rrPreview.split(':')[1]) >= 2 ? 'var(--green)' : parseFloat(rrPreview.split(':')[1]) >= 1 ? 'var(--amber)' : 'var(--red)' }}>
                      {rrPreview}
                    </span>
                    <span style={{ color: 'var(--t3)' }}>·</span>
                    <span style={{ color: 'var(--t3)' }}>
                      SL {Math.abs((parseFloat(formData.entry) - parseFloat(formData.stopLoss)) * 10000).toFixed(1)} pips
                      · TP {Math.abs((parseFloat(formData.takeProfit) - parseFloat(formData.entry)) * 10000).toFixed(1)} pips
                    </span>
                  </div>
                )}
                <div className="flex justify-end">
                  <button type="submit" className="text-xs px-4 py-2 rounded font-semibold"
                    style={{ background: 'var(--acc)', color: '#000' }}>
                    {editingTrade ? 'Update Trade' : 'Log Trade'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Table */}
          <div className="card flex-1 overflow-auto">
            <table className="w-full text-xs">
              <thead style={{ position: 'sticky', top: 0, background: 'var(--bg3)', zIndex: 1 }}>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <SortTh col="pair"  label="Pair" />
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>Side</th>
                  <SortTh col="entry" label="Entry" />
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>SL</th>
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>TP</th>
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>Exit / Now</th>
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>Lots</th>
                  <SortTh col="pnl"   label="P&L" />
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>Pips</th>
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>R:R</th>
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>Status</th>
                  <th className="px-2 py-2 text-left font-medium whitespace-nowrap" style={{ color: 'var(--t3)' }}>Notes</th>
                  <th className="px-2 py-2" style={{ color: 'var(--t3)' }} />
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={13} className="text-center py-8" style={{ color: 'var(--t3)' }}>Loading…</td></tr>
                ) : filteredTrades.length === 0 ? (
                  <tr><td colSpan={13} className="text-center py-8" style={{ color: 'var(--t3)' }}>No trades match this filter.</td></tr>
                ) : filteredTrades.map((t) => {
                  const isOpen   = t.exit == null;
                  const upnl     = getUpnl(t);
                  const livePips = getLivePips(t);
                  const livePrice = livePrices[t.pair];
                  const displayPnl  = isOpen ? upnl    : t.pnl;
                  const displayPips = isOpen ? livePips : null;
                  const rowBg = !isOpen && t.pnl != null
                    ? t.pnl > 0 ? 'rgba(0,230,118,0.04)' : 'rgba(255,56,86,0.04)'
                    : undefined;

                  return (
                    <tr key={t._id} style={{ borderBottom: '1px solid var(--border)', background: rowBg }}>
                      <td className="px-2 py-2 font-semibold" style={{ color: 'var(--t1)' }}>{t.pair}</td>
                      <td className="px-2 py-2">
                        <span className="px-1.5 py-0.5 rounded text-xs font-bold"
                          style={{ color: t.type === 'BUY' ? 'var(--green)' : 'var(--red)', background: t.type === 'BUY' ? 'rgba(0,230,118,0.12)' : 'rgba(255,56,86,0.12)' }}>
                          {t.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono-num" style={{ color: 'var(--t2)' }}>{t.entry}</td>
                      <td className="px-2 py-2 font-mono-num" style={{ color: 'var(--red)' }}>
                        {t.stopLoss ?? <span style={{ color: 'var(--t3)' }}>—</span>}
                      </td>
                      <td className="px-2 py-2 font-mono-num" style={{ color: 'var(--green)' }}>
                        {t.takeProfit ?? <span style={{ color: 'var(--t3)' }}>—</span>}
                      </td>
                      <td className="px-2 py-2 font-mono-num" style={{ color: isOpen ? 'var(--acc)' : 'var(--t2)' }}>
                        {isOpen
                          ? livePrice != null ? fmtPrice(t.pair, livePrice) : <span style={{ color: 'var(--t3)' }}>…</span>
                          : t.exit ?? <span style={{ color: 'var(--t3)' }}>—</span>}
                      </td>
                      <td className="px-2 py-2 font-mono-num" style={{ color: 'var(--t2)' }}>{t.size ?? '—'}</td>
                      <td className="px-2 py-2 font-mono-num font-semibold"
                        style={{ color: displayPnl != null && displayPnl > 0 ? 'var(--green)' : displayPnl != null && displayPnl < 0 ? 'var(--red)' : 'var(--t2)' }}>
                        {displayPnl != null ? F(displayPnl) : isOpen ? <span style={{ color: 'var(--t3)' }}>…</span> : '—'}
                      </td>
                      <td className="px-2 py-2 font-mono-num"
                        style={{ color: displayPips != null && displayPips > 0 ? 'var(--green)' : displayPips != null && displayPips < 0 ? 'var(--red)' : 'var(--t3)' }}>
                        {displayPips != null ? (displayPips >= 0 ? '+' : '') + displayPips.toFixed(1) : '—'}
                      </td>
                      <td className="px-2 py-2 font-mono-num" style={{ color: 'var(--amber)' }}>
                        {t.rr ?? <span style={{ color: 'var(--t3)' }}>—</span>}
                      </td>
                      <td className="px-2 py-2">
                        {isOpen ? (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-semibold w-fit"
                            style={{ background: 'rgba(0,200,240,0.1)', color: 'var(--acc)' }}>
                            <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'var(--green)', animation: 'pulse-green 2s infinite' }} />
                            LIVE
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                            style={{ background: t.pnl != null && t.pnl > 0 ? 'rgba(0,230,118,0.1)' : 'rgba(255,56,86,0.1)', color: t.pnl != null && t.pnl > 0 ? 'var(--green)' : 'var(--red)' }}>
                            {t.status === 'win' ? 'WIN' : t.status === 'loss' ? 'LOSS' : 'Closed'}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2 max-w-[100px] truncate" style={{ color: 'var(--t3)' }}>{t.notes || '—'}</td>
                      <td className="px-2 py-2">
                        <div className="flex gap-2">
                          {isOpen && (
                            <button
                              onClick={() => { setClosingTrade(t); setCloseExitPrice(''); }}
                              className="text-xs font-semibold"
                              style={{ color: 'var(--amber)' }}>
                              Close
                            </button>
                          )}
                          <button onClick={() => handleEdit(t)} className="text-xs" style={{ color: 'var(--acc)' }}>Edit</button>
                          <button onClick={() => handleDelete(t._id)} className="text-xs" style={{ color: 'var(--red)' }}>Del</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Sidebar ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3" style={{ width: 240, flexShrink: 0 }}>
          <div className="card p-3" style={{ height: 180 }}>
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>P&L Curve</div>
            <div style={{ height: 140 }}>
              {trades.filter((t) => t.pnl != null).length > 0
                ? <PnLCurveChart trades={trades} />
                : <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--t3)' }}>No closed trades</div>}
            </div>
          </div>

          <div className="card p-3 flex-1">
            <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>By Pair</div>
            {pairStats.length === 0
              ? <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>No data</div>
              : pairStats.map(({ pair, count, winRate }) => (
                <div key={pair} className="mb-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--t1)' }}>{pair}</span>
                    <span style={{ color: 'var(--t2)' }}>{count} · {winRate}%</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'var(--border2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${winRate}%`, background: winRate >= 50 ? 'var(--green)' : 'var(--red)' }} />
                  </div>
                </div>
              ))}
          </div>

          <div className="card p-3">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Pro Rules</div>
            {[
              { rule: 'Risk ≤ 1–2% per trade',    ok: true },
              { rule: 'R:R ≥ 1:2 before entry',   ok: true },
              { rule: 'Always set a Stop Loss',    ok: true },
              { rule: 'Trade with the trend',      ok: true },
              { rule: 'Journal every trade',       ok: true },
            ].map(({ rule, ok }) => (
              <div key={rule} className="flex items-center gap-2 mb-1.5">
                <span style={{ color: ok ? 'var(--green)' : 'var(--red)', fontSize: 10 }}>●</span>
                <span className="text-xs" style={{ color: 'var(--t2)' }}>{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
