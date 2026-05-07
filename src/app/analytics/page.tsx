'use client';

import React, { useEffect, useState } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { useCoaching, CoachingData, TradingProfileData } from '../../hooks/useCoaching';

// ── Shared sub-components ──────────────────────────────────────────────────────

function MetricCard({ label, value, color = 'var(--acc)', sub }: { label: string; value: any; color?: string; sub?: string }) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold font-mono-num" style={{ color }}>{value ?? '—'}</div>
      <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{label}</div>
      {sub && <div className="text-xs mt-0.5" style={{ color: 'var(--t2)' }}>{sub}</div>}
    </div>
  );
}

function WinRateBar({ label, value, total, sub }: { label: string; value: number; total?: number; sub?: string }) {
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--t2)' }}>{label}{sub ? <span style={{ color: 'var(--t3)', fontSize: 10 }}> · {sub}</span> : null}</span>
        <span className="font-mono-num font-semibold" style={{ color: value >= 60 ? 'var(--green)' : value >= 50 ? 'var(--amber)' : 'var(--red)' }}>
          {value}%{total != null ? ` (${total})` : ''}
        </span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: 'var(--border2)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: value >= 60 ? 'var(--green)' : value >= 50 ? 'var(--amber)' : 'var(--red)' }} />
      </div>
    </div>
  );
}

// ── AI Coach Tab ───────────────────────────────────────────────────────────────

function CoachTab() {
  const { coaching, loading, error, fetchCoaching } = useCoaching();

  useEffect(() => { fetchCoaching(); }, []);

  if (loading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="card p-4 animate-pulse h-20" style={{ background: 'var(--bg4)' }} />
        <div className="grid grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-4 animate-pulse h-24" style={{ background: 'var(--bg4)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !coaching) {
    return (
      <div className="h-40 flex flex-col items-center justify-center gap-3">
        <div className="text-xs" style={{ color: 'var(--t3)' }}>
          {error ?? 'Could not load coaching data.'}
        </div>
        <button onClick={() => fetchCoaching()} className="text-xs px-3 py-1.5 rounded font-semibold"
          style={{ background: 'var(--acc)', color: '#000' }}>
          Retry
        </button>
      </div>
    );
  }

  const { profile, insights, topSuggestion, cached, generatedAt } = coaching;
  const hasEnough = profile.totalTrades >= 5;

  return (
    <div className="flex flex-col gap-4 pb-4">

      {/* ── Top Suggestion ──────────────────────────────────── */}
      {topSuggestion && (
        <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, rgba(0,200,240,0.08), rgba(0,200,240,0.03))', border: '1px solid rgba(0,200,240,0.25)' }}>
          <div className="flex items-start gap-3">
            <span className="text-lg mt-0.5">⭐</span>
            <div>
              <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--acc)' }}>Your #1 Focus Right Now</div>
              <div className="text-sm" style={{ color: 'var(--t1)', lineHeight: 1.6 }}>{topSuggestion}</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Profile DNA + Insights ────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0">

        {/* Insights (left 2/3) */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>
              AI Coaching Insights
              {cached && generatedAt && (
                <span className="ml-2 font-normal normal-case" style={{ color: 'var(--t3)', fontSize: 9 }}>
                  · cached {new Date(generatedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <button
              onClick={() => fetchCoaching(true)}
              disabled={loading || !hasEnough}
              className="text-xs px-2.5 py-1 rounded font-semibold"
              style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border)', opacity: loading ? 0.5 : 1 }}>
              {loading ? '…' : '↻ Refresh'}
            </button>
          </div>

          {!hasEnough ? (
            <div className="card p-6 text-center">
              <div className="text-2xl mb-2">🧠</div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--t1)' }}>AI Coach Unlocks at 5 Trades</div>
              <div className="text-xs" style={{ color: 'var(--t3)' }}>
                You have {profile.totalTrades} closed trade{profile.totalTrades !== 1 ? 's' : ''}.
                Log {5 - profile.totalTrades} more to activate personalised AI coaching.
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {insights.map((insight, i) => (
                <InsightCard key={i} index={i} text={insight} />
              ))}
            </div>
          )}
        </div>

        {/* Trading DNA (right 1/3) */}
        <div className="flex flex-col gap-3" style={{ width: 260, flexShrink: 0 }}>
          <TradingDNA profile={profile} />
        </div>
      </div>

      {/* ── Style Stats ───────────────────────────────────── */}
      {hasEnough && <StyleStats profile={profile} />}
    </div>
  );
}

function InsightCard({ index, text }: { index: number; text: string }) {
  const icons   = ['📊', '⚠️', '🎯', '📅', '⏱️', '🔥'];
  const borders = [
    'rgba(0,200,240,0.2)', 'rgba(255,170,0,0.2)', 'rgba(0,230,118,0.2)',
    'rgba(0,200,240,0.15)', 'rgba(255,56,86,0.2)', 'rgba(0,200,240,0.2)',
  ];
  return (
    <div className="card p-3.5 flex gap-3 items-start" style={{ border: `1px solid ${borders[index] ?? borders[0]}` }}>
      <span className="text-base flex-shrink-0 mt-0.5">{icons[index] ?? '💡'}</span>
      <div className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>{text}</div>
    </div>
  );
}

function TradingDNA({ profile }: { profile: TradingProfileData }) {
  return (
    <>
      {/* By Pair */}
      {profile.byPair.length > 0 && (
        <div className="card p-3">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>By Pair</div>
          {profile.byPair.map((p) => (
            <WinRateBar key={p.pair} label={p.pair} value={p.winRate} total={p.count}
              sub={p.netPnL >= 0 ? `+$${p.netPnL.toFixed(0)}` : `-$${Math.abs(p.netPnL).toFixed(0)}`} />
          ))}
        </div>
      )}

      {/* By Session */}
      {profile.bySession.length > 0 && (
        <div className="card p-3">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>By Session</div>
          {profile.bySession.map((s) => (
            <WinRateBar key={s.session} label={s.session} value={s.winRate} total={s.count} />
          ))}
        </div>
      )}

      {/* By Day */}
      {profile.byDay.length > 0 && (
        <div className="card p-3">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>By Day of Week</div>
          {profile.byDay.map((d) => (
            <WinRateBar key={d.day} label={d.day} value={d.winRate} total={d.count} />
          ))}
        </div>
      )}
    </>
  );
}

function StyleStats({ profile }: { profile: TradingProfileData }) {
  const holdingColor = profile.holdingTendency === 'balanced hold time' ? 'var(--green)'
    : profile.holdingTendency === 'insufficient data' ? 'var(--t3)' : 'var(--amber)';

  const streakColor = profile.recentStreak.type === 'win' ? 'var(--green)'
    : profile.recentStreak.type === 'loss' ? 'var(--red)' : 'var(--t3)';

  const last10Color = profile.last10WinRate >= 60 ? 'var(--green)'
    : profile.last10WinRate >= 50 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* BUY vs SELL */}
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Direction Bias</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(0,230,118,0.1)', color: 'var(--green)' }}>▲ BUY</span>
            <span className="font-mono-num font-semibold" style={{ color: profile.buyWinRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
              {profile.buyWinRate}% WR
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: 'rgba(255,56,86,0.1)', color: 'var(--red)' }}>▼ SELL</span>
            <span className="font-mono-num font-semibold" style={{ color: profile.sellWinRate >= 50 ? 'var(--green)' : 'var(--red)' }}>
              {profile.sellWinRate}% WR
            </span>
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>
            {profile.buyWinRate > profile.sellWinRate
              ? `→ Focus on BUY setups`
              : profile.sellWinRate > profile.buyWinRate
              ? `→ Focus on SELL setups`
              : '→ Equal edge both ways'}
          </div>
        </div>
      </div>

      {/* Holding tendency */}
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Hold Behaviour</div>
        <div className="text-sm font-semibold mb-2" style={{ color: holdingColor }}>
          {profile.holdingTendency}
        </div>
        {profile.avgWinDurationMin > 0 && (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between">
              <span style={{ color: 'var(--green)' }}>Winners held</span>
              <span className="font-mono-num" style={{ color: 'var(--t2)' }}>
                {profile.avgWinDurationMin >= 60
                  ? `${Math.floor(profile.avgWinDurationMin / 60)}h ${profile.avgWinDurationMin % 60}m`
                  : `${profile.avgWinDurationMin}m`}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: 'var(--red)' }}>Losers held</span>
              <span className="font-mono-num" style={{ color: 'var(--t2)' }}>
                {profile.avgLossDurationMin >= 60
                  ? `${Math.floor(profile.avgLossDurationMin / 60)}h ${profile.avgLossDurationMin % 60}m`
                  : `${profile.avgLossDurationMin}m`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Recent form */}
      <div className="card p-4">
        <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Recent Form</div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span style={{ color: 'var(--t3)' }}>Last 10 trades</span>
            <span className="font-mono-num font-bold" style={{ color: last10Color }}>{profile.last10WinRate}%</span>
          </div>
          {profile.recentStreak.count > 0 && profile.recentStreak.type !== 'none' && (
            <div className="flex items-center gap-1.5 text-xs">
              <span className="h-2 w-2 rounded-full" style={{ background: streakColor }} />
              <span style={{ color: streakColor }}>
                {profile.recentStreak.count} consecutive {profile.recentStreak.type}
                {profile.recentStreak.count > 1 ? 's' : ''}
              </span>
            </div>
          )}
          {profile.recentStreak.count >= 3 && profile.recentStreak.type === 'loss' && (
            <div className="text-xs" style={{ color: 'var(--amber)' }}>
              ⚠ Consider a short break to reset.
            </div>
          )}
          {profile.recentStreak.count >= 3 && profile.recentStreak.type === 'win' && (
            <div className="text-xs" style={{ color: 'var(--green)' }}>
              🔥 Hot streak — stay disciplined.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Overview Tab ───────────────────────────────────────────────────────────────

function OverviewTab() {
  const { analytics, loading } = useAnalytics();

  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="card h-20 animate-pulse" style={{ background: 'var(--bg4)' }} />
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="h-full flex items-center justify-center text-xs" style={{ color: 'var(--t3)' }}>
        No analytics data available. Start trading to see your stats.
      </div>
    );
  }

  const pnlVal      = analytics.totalPnL ?? analytics.totalPnl ?? 0;
  const pnlPositive = pnlVal >= 0;
  const F = (v: number) => (v > 0 ? '+' : '') + v.toFixed(2);

  return (
    <div className="flex flex-col gap-3">
      {/* Top metrics */}
      <div className="grid grid-cols-4 gap-3">
        <MetricCard label="Total Trades" value={analytics.totalTrades} color="var(--acc)" />
        <MetricCard label="Win Rate" value={`${analytics.winRate ?? 0}%`} color={(analytics.winRate ?? 0) >= 50 ? 'var(--green)' : 'var(--red)'} />
        <MetricCard label="Total P&L" value={pnlVal !== 0 ? F(pnlVal) : '—'} color={pnlPositive ? 'var(--green)' : 'var(--red)'} />
        <MetricCard label="Avg Duration" value={analytics.avgTradeDuration ?? '—'} color="var(--t1)" />
      </div>

      {/* Risk metrics */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Max Drawdown" value={analytics.maxDrawdown != null ? `${analytics.maxDrawdown}%` : '—'} color="var(--red)" />
        <MetricCard label="Sharpe Ratio" value={analytics.sharpeRatio ?? '—'} color="var(--acc)" />
        <MetricCard label="Profit Factor" value={analytics.profitFactor ?? '—'} color="var(--amber)" />
      </div>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Performance by pair table */}
        <div className="card p-4 flex-1 overflow-auto">
          <div className="text-xs font-semibold uppercase mb-4" style={{ color: 'var(--t3)' }}>Performance by Pair</div>
          {analytics.performanceByPair?.length > 0 ? (
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: 'var(--t3)', borderBottom: '1px solid var(--border)' }}>
                  {['Pair', 'Trades', 'Win Rate', 'P&L', 'Best', 'Worst'].map((h) => (
                    <th key={h} className="text-left py-1.5 font-medium pr-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analytics.performanceByPair.map((p: any) => (
                  <tr key={p.pair} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 font-semibold pr-3" style={{ color: 'var(--t1)' }}>{p.pair}</td>
                    <td className="py-2 font-mono-num pr-3" style={{ color: 'var(--t2)' }}>{p.totalTrades}</td>
                    <td className="py-2 font-mono-num pr-3" style={{ color: (p.winRate ?? 0) >= 50 ? 'var(--green)' : 'var(--red)' }}>{p.winRate}%</td>
                    <td className="py-2 font-mono-num pr-3 font-semibold" style={{ color: (p.totalPnL ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {p.totalPnL != null ? F(p.totalPnL) : '—'}
                    </td>
                    <td className="py-2 font-mono-num pr-3" style={{ color: 'var(--green)' }}>{p.bestTrade  != null ? F(p.bestTrade)  : '—'}</td>
                    <td className="py-2 font-mono-num"     style={{ color: 'var(--red)'   }}>{p.worstTrade != null ? F(p.worstTrade) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-xs text-center py-8" style={{ color: 'var(--t3)' }}>No pair data yet</div>
          )}
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-3" style={{ width: 240, flexShrink: 0 }}>
          <div className="card p-4">
            <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Win Rate by Pair</div>
            {analytics.performanceByPair?.length > 0
              ? analytics.performanceByPair.map((p: any) => (
                <WinRateBar key={p.pair} label={p.pair} value={p.winRate ?? 0} total={p.totalTrades} />
              ))
              : <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>No data</div>}
          </div>

          {analytics.monthlyPerformance?.length > 0 && (
            <div className="card p-4 flex-1 overflow-auto">
              <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Monthly Performance</div>
              {analytics.monthlyPerformance.slice(0, 6).map((m: any) => (
                <div key={m.month} className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--t1)' }}>{m.month}</span>
                    <span className="font-mono-num" style={{ color: (m.totalPnL ?? 0) >= 0 ? 'var(--green)' : 'var(--red)' }}>
                      {m.totalPnL != null ? F(m.totalPnL) : '—'}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs" style={{ color: 'var(--t3)' }}>
                    <span>{m.totalTrades} trades</span>
                    <span>{m.winRate ?? 0}% win</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [tab, setTab] = useState<'overview' | 'coach'>('overview');

  return (
    <div className="flex flex-col gap-3 h-full overflow-auto">
      {/* Tab bar */}
      <div className="flex items-center gap-1 pb-1" style={{ borderBottom: '1px solid var(--border)' }}>
        {([
          { id: 'overview', label: 'Overview' },
          { id: 'coach',    label: 'AI Coach ✦' },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="text-xs px-3 py-1.5 rounded font-semibold transition-all"
            style={tab === t.id
              ? { background: 'var(--acc)', color: '#000' }
              : { background: 'transparent', color: 'var(--t3)', border: '1px solid transparent' }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' ? <OverviewTab /> : <CoachTab />}
    </div>
  );
}
