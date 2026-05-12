'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSignal } from '../hooks/useSignal';
import { useChart } from '../hooks/useChart';
import { usePair } from '../hooks/usePair';
import { useTrades } from '../hooks/useTrades';
import { useNews } from '../hooks/useNews';
import { createChart } from 'lightweight-charts';
import { C } from '../utils/chartColors';
import { getPriceFormat } from '../utils/constants';

function MiniChart({ data, pair }: { data: any[]; pair: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || data.length === 0) return;
    const chart = createChart(ref.current, {
      layout: { background: { color: C.bg3 }, textColor: C.t2 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.05, bottom: 0.15 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      width: ref.current.clientWidth,
      height: ref.current.clientHeight,
    });
    const candles = chart.addCandlestickSeries({
      upColor: C.green, downColor: C.red,
      borderUpColor: C.green, borderDownColor: C.red,
      wickUpColor: C.green, wickDownColor: C.red,
      priceFormat: getPriceFormat(pair),
    });
    candles.setData(data);
    chart.timeScale().fitContent();
    const onResize = () => {
      if (ref.current) chart.applyOptions({ width: ref.current.clientWidth });
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); chart.remove(); };
  }, [data, pair]);
  return <div ref={ref} className="w-full h-full" />;
}

function StatBox({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="card p-2 md:p-3 flex flex-col gap-1">
      <span className="text-xs" style={{ color: 'var(--t3)' }}>{label}</span>
      <span className="text-base md:text-xl font-semibold font-mono-num" style={{ color: color || 'var(--t1)' }}>{value}</span>
      {sub && <span className="text-xs" style={{ color: 'var(--t2)' }}>{sub}</span>}
    </div>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const color = signal === 'BUY' ? 'var(--green)' : signal === 'SELL' ? 'var(--red)' : 'var(--amber)';
  return (
    <span
      className="text-xs font-bold px-3 py-1 rounded-full"
      style={{ background: `${color}22`, color, border: `1px solid ${color}55` }}
    >
      {signal}
    </span>
  );
}

function flattenIndicators(raw: Record<string, any>): { name: string; value: string }[] {
  const fmt = (v: number) => (typeof v === 'number' ? v.toFixed(v > 10 ? 2 : 5) : String(v));
  const rows: { name: string; value: string }[] = [];
  for (const [key, val] of Object.entries(raw)) {
    if (key === 'patterns') continue;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      const label: Record<string, string> = {
        value: 'MACD', signal: 'Signal', histogram: 'Hist',
        upper: 'BB Upper', mid: 'BB Mid', lower: 'BB Lower',
        k: 'Stoch K', d: 'Stoch D',
      };
      for (const [subKey, subVal] of Object.entries(val as Record<string, number>)) {
        rows.push({ name: label[subKey] ?? `${key}.${subKey}`, value: fmt(subVal) });
      }
    } else {
      const label: Record<string, string> = {
        rsi: 'RSI', ema20: 'EMA20', ema50: 'EMA50',
        sma20: 'SMA20', sma50: 'SMA50', adx: 'ADX',
      };
      rows.push({ name: label[key] ?? key.toUpperCase(), value: fmt(val) });
    }
  }
  return rows;
}

export default function Dashboard() {
  const { signal, loading: sigLoading, refetch: refreshSignal } = useSignal();
  const { chart, loading: chartLoading } = useChart();
  const { activePair } = usePair();
  const { trades } = useTrades();
  const { news } = useNews(activePair);
  const [tab, setTab] = useState<'chart' | 'signal'>('chart');

  const recentTrades = (trades ?? []).slice(0, 8);
  const recentNews = (news ?? []).slice(0, 4);

  const indicators: { name: string; value: string }[] = signal?.indicators
    ? flattenIndicators(signal.indicators)
    : [];

  return (
    <div className="flex flex-col lg:flex-row gap-3 min-h-full">

      {/* ── Mobile tab switcher ─────────────────────────────────────────────── */}
      <div className="flex lg:hidden gap-1 flex-shrink-0">
        {(['chart', 'signal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-1.5 rounded text-xs font-semibold capitalize transition-all"
            style={tab === t
              ? { background: 'var(--acc)', color: '#000' }
              : { background: 'var(--bg3)', color: 'var(--t3)', border: '1px solid var(--border)' }
            }
          >
            {t === 'chart' ? 'Chart & Trades' : 'Signal & News'}
          </button>
        ))}
      </div>

      {/* ── Left column — chart + stats + trades ───────────────────────────── */}
      <div
        className="flex flex-col gap-3 flex-1 min-w-0"
        style={{ display: tab === 'signal' ? undefined : undefined }}
      >
        <div className={`flex flex-col gap-3 flex-1 min-w-0 ${tab === 'signal' ? 'hidden lg:flex' : 'flex'}`}>

          {/* Price chart */}
          <div className="card p-3" style={{ height: 260 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>{activePair} — Price</span>
              {chartLoading && (
                <div className="h-3 w-3 rounded-full border border-t-transparent animate-spin"
                  style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
              )}
            </div>
            <div style={{ height: 210 }}>
              {chart && chart.length > 0
                ? <MiniChart data={chart} pair={activePair} />
                : <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--t3)' }}>
                    {chartLoading ? 'Loading chart…' : 'No chart data'}
                  </div>
              }
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <StatBox label="Entry"       value={signal?.entry       ?? '—'} color="var(--acc)" />
            <StatBox label="Take Profit" value={signal?.takeProfit  ?? '—'} color="var(--green)" />
            <StatBox label="Stop Loss"   value={signal?.stopLoss    ?? '—'} color="var(--red)" />
            <StatBox label="Risk/Reward" value={signal?.riskReward  ?? '—'} color="var(--amber)" />
          </div>

          {/* Recent trades table */}
          <div className="card p-3 flex-1 overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Recent Trades</span>
              <a href="/trades" className="text-xs" style={{ color: 'var(--acc)' }}>View all →</a>
            </div>
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-1 font-medium">Pair</th>
                  <th className="text-left py-1 font-medium">Side</th>
                  <th className="text-right py-1 font-medium">Entry</th>
                  <th className="hidden sm:table-cell text-right py-1 font-medium">Exit</th>
                  <th className="text-right py-1 font-medium">P&L</th>
                  <th className="hidden sm:table-cell text-center py-1 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.length === 0
                  ? <tr><td colSpan={6} className="text-center py-4" style={{ color: 'var(--t3)' }}>No trades yet</td></tr>
                  : recentTrades.map((t: any) => (
                    <tr key={t._id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-1.5 font-medium" style={{ color: 'var(--t1)' }}>{t.pair}</td>
                      <td className="py-1.5">
                        <span className="font-semibold" style={{ color: t.type === 'BUY' ? 'var(--green)' : 'var(--red)' }}>{t.type}</span>
                      </td>
                      <td className="py-1.5 text-right font-mono-num" style={{ color: 'var(--t2)' }}>{t.entry}</td>
                      <td className="hidden sm:table-cell py-1.5 text-right font-mono-num" style={{ color: 'var(--t2)' }}>{t.exit ?? '—'}</td>
                      <td className="py-1.5 text-right font-mono-num" style={{ color: t.pnl > 0 ? 'var(--green)' : t.pnl < 0 ? 'var(--red)' : 'var(--t2)' }}>
                        {t.pnl != null ? `${t.pnl > 0 ? '+' : ''}${t.pnl}` : '—'}
                      </td>
                      <td className="hidden sm:table-cell py-1.5 text-center">
                        <span className="px-1.5 py-0.5 rounded text-xs font-semibold"
                          style={t.exit != null
                            ? { background: 'rgba(61,79,104,0.4)', color: 'var(--t2)' }
                            : { background: 'rgba(0,200,240,0.12)', color: 'var(--acc)' }
                          }>
                          {t.exit != null ? 'Closed' : 'Open'}
                        </span>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

        </div>
      </div>

      {/* ── Right column — signal panel + news ─────────────────────────────── */}
      <div className={`flex flex-col gap-3 lg:overflow-auto w-full lg:w-[272px] lg:flex-shrink-0 ${tab === 'chart' ? 'hidden lg:flex' : 'flex'}`}>

        {/* Signal card */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold tracking-widest uppercase" style={{ color: 'var(--t3)' }}>AI Signal</span>
            <button
              onClick={refreshSignal}
              disabled={sigLoading}
              className="text-xs px-2 py-1 rounded transition-all"
              style={{ background: 'var(--bg2)', color: 'var(--acc)', border: '1px solid var(--border2)' }}
            >
              {sigLoading ? '…' : '↻ Refresh'}
            </button>
          </div>

          {sigLoading ? (
            <div className="space-y-2 animate-pulse">
              {[80, 60, 70].map((w, i) => (
                <div key={i} className="h-3 rounded" style={{ width: `${w}%`, background: 'var(--bg4)' }} />
              ))}
            </div>
          ) : signal ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <SignalBadge signal={signal.signal} />
                <div>
                  <div className="text-2xl font-bold font-mono-num" style={{ color: 'var(--t1)' }}>
                    {signal.confidence}%
                  </div>
                  <div className="text-xs" style={{ color: 'var(--t3)' }}>confidence</div>
                </div>
              </div>

              {/* Bull/Bear confidence bars */}
              <div className="mb-4 space-y-1.5">
                {(['BUY', 'SELL', 'HOLD'] as const).map((dir) => {
                  const isActive = signal.signal === dir;
                  const pct = isActive ? signal.confidence : dir === 'HOLD' ? 20 : Math.max(0, 100 - signal.confidence - 20);
                  const col = dir === 'BUY' ? 'var(--green)' : dir === 'SELL' ? 'var(--red)' : 'var(--amber)';
                  return (
                    <div key={dir} className="flex items-center gap-2">
                      <span className="text-xs w-8" style={{ color: 'var(--t2)' }}>{dir}</span>
                      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'var(--border2)' }}>
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: col }} />
                      </div>
                      <span className="text-xs w-7 text-right font-mono-num" style={{ color: 'var(--t2)' }}>{pct}%</span>
                    </div>
                  );
                })}
              </div>

              {/* Entry / TP / SL grid */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { l: 'Entry',       v: signal.entry,      c: 'var(--acc)' },
                  { l: 'Take Profit', v: signal.takeProfit, c: 'var(--green)' },
                  { l: 'Stop Loss',   v: signal.stopLoss,   c: 'var(--red)' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="text-center p-2 rounded" style={{ background: 'var(--bg2)' }}>
                    <div className="text-xs font-semibold font-mono-num" style={{ color: c }}>{v ?? '—'}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>{l}</div>
                  </div>
                ))}
              </div>

              {/* Indicator rows */}
              {indicators.length > 0 && (
                <div className="space-y-1.5 mb-4">
                  <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--t3)' }}>Indicators</div>
                  {indicators.slice(0, 9).map((ind, i) => (
                    <div key={i} className="flex justify-between text-xs">
                      <span style={{ color: 'var(--t2)' }}>{ind.name}</span>
                      <span className="font-mono-num" style={{ color: 'var(--t1)' }}>{ind.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Reasoning */}
              {signal.reasoning && (
                <div className="text-xs leading-relaxed p-2 rounded" style={{ background: 'var(--bg2)', color: 'var(--t2)', border: '1px solid var(--border)' }}>
                  {signal.reasoning.slice(0, 200)}{signal.reasoning.length > 200 ? '…' : ''}
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-center py-6" style={{ color: 'var(--t3)' }}>No signal available</div>
          )}
        </div>

        {/* News snippets */}
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--t3)' }}>News</span>
            <a href="/news" className="text-xs" style={{ color: 'var(--acc)' }}>More →</a>
          </div>
          {recentNews.length === 0
            ? <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>No news loaded</div>
            : recentNews.map((n: any, i: number) => {
                const sentColor = n.sentiment === 'bullish' ? 'var(--green)' : n.sentiment === 'bearish' ? 'var(--red)' : 'var(--t3)';
                return (
                  <div key={i} className="py-2" style={{ borderBottom: i < recentNews.length - 1 ? '1px solid var(--border)' : '' }}>
                    <div className="flex items-start gap-1.5">
                      <span className="mt-1 h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: sentColor }} />
                      <p className="text-xs leading-snug" style={{ color: 'var(--t1)' }}>{n.title?.slice(0, 80)}{n.title?.length > 80 ? '…' : ''}</p>
                    </div>
                    {n.impact && (
                      <div className="ml-3 mt-0.5">
                        <span className="text-xs px-1 py-0.5 rounded" style={{ background: 'var(--bg2)', color: 'var(--t3)' }}>{n.impact} impact</span>
                      </div>
                    )}
                  </div>
                );
              })
          }
        </div>

      </div>
    </div>
  );
}
