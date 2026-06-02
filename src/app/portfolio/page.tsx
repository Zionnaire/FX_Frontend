'use client';

import { useState } from 'react';
import { usePortfolioRisk, useBehavior, useDailyBriefing } from '../../hooks/usePortfolio';

const TABS = ['Risk', 'Behavior', 'Briefing'] as const;
type Tab = typeof TABS[number];

// ─── Risk Tab ─────────────────────────────────────────────────────────────────

function RiskTab() {
  const { data, loading } = usePortfolioRisk();

  if (loading) return <Loader />;
  if (!data) return <Empty msg="Could not load portfolio risk" />;

  const budgetPct = Math.min(100, data.risk_budget_used_pct);
  const budgetColor = budgetPct >= 100 ? 'var(--red)' : budgetPct >= 80 ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Open Trades',   value: data.open_trades,                              color: 'var(--t1)' },
          { label: 'Total Risk %',  value: `${data.total_risk_pct}%`,                     color: data.total_risk_pct > 5 ? 'var(--red)' : 'var(--green)' },
          { label: 'Max Loss ($)',  value: `$${data.total_max_loss_usd?.toLocaleString() ?? '0'}`, color: 'var(--amber)' },
          { label: 'Budget Used',   value: `${data.risk_budget_used_pct?.toFixed(0)}%`,   color: budgetColor },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--t3)' }}>{label}</div>
            <div className="text-lg font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
      </div>

      {/* Budget bar */}
      <div className="p-4 rounded-xl flex flex-col gap-2" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
        <div className="flex justify-between text-xs">
          <span style={{ color: 'var(--t2)' }}>Daily Risk Budget</span>
          <span style={{ color: budgetColor, fontWeight: 600 }}>{data.total_risk_pct}% / {data.risk_budget_limit_pct}%</span>
        </div>
        <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--bg4)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${budgetPct}%`, background: budgetColor }} />
        </div>
        <p className="text-xs" style={{ color: data.is_over_budget ? 'var(--red)' : 'var(--t2)' }}>
          {data.recommendation}
        </p>
      </div>

      {/* Correlation warnings */}
      {data.correlation_warnings?.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.correlation_warnings.map((w: string, i: number) => (
            <div key={i} className="px-3 py-2 rounded-lg text-xs flex items-start gap-2"
              style={{ background: 'rgba(255,183,0,0.06)', color: 'var(--amber)', border: '1px solid rgba(255,183,0,0.15)' }}>
              <span>⚠</span><span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Open positions */}
      {data.positions?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--t3)' }}>Open Positions</h3>
          <div className="flex flex-col gap-2">
            {data.positions.map((p: any) => (
              <div key={p.tradeId} className="flex items-center justify-between px-4 py-3 rounded-xl text-sm"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div className="flex items-center gap-3">
                  <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{p.pair}</span>
                  <span style={{ color: p.direction === 'BUY' ? 'var(--green)' : 'var(--red)', fontSize: 11, fontWeight: 700 }}>{p.direction}</span>
                </div>
                <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--t2)' }}>
                  <span>SL: <span style={{ color: 'var(--t1)' }}>{p.stopLoss ?? '—'}</span></span>
                  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{p.riskPct}% risk</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Behavior Tab ─────────────────────────────────────────────────────────────

function BehaviorTab() {
  const { data, loading } = useBehavior();

  if (loading) return <Loader />;
  if (!data) return <Empty msg="No behavioral data yet — log some trades first" />;

  const score = data.psychological_score ?? 0;
  const scoreColor = score >= 80 ? 'var(--green)' : score >= 55 ? 'var(--amber)' : 'var(--red)';

  return (
    <div className="flex flex-col gap-5">
      {/* Psych score */}
      <div className="flex items-center gap-6 p-5 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--bg4)" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="15.9" fill="none" stroke={scoreColor} strokeWidth="2.5"
              strokeDasharray={`${score} ${100 - score}`} strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <span className="text-lg font-bold" style={{ color: scoreColor }}>{score}</span>
          </div>
        </div>
        <div>
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--t1)' }}>Psychological Score</div>
          <div className="text-xs" style={{ color: 'var(--t2)' }}>{data.summary}</div>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Revenge Trades', value: data.revenge_trading_incidents, bad: data.revenge_trading_incidents > 0 },
          { label: 'Overtrade Sessions', value: data.overtrade_sessions, bad: data.overtrade_sessions > 0 },
          { label: 'Tilt Sequences', value: data.tilt_sequences, bad: data.tilt_sequences > 0 },
        ].map(({ label, value, bad }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="text-2xl font-bold" style={{ color: bad && value > 0 ? 'var(--red)' : 'var(--green)' }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Patterns */}
      {data.patterns?.length > 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Detected Patterns</h3>
          {data.patterns.map((p: any, i: number) => {
            const sevColor = p.severity === 'high' ? 'var(--red)' : p.severity === 'medium' ? 'var(--amber)' : 'var(--t2)';
            return (
              <div key={i} className="p-4 rounded-xl" style={{ background: 'var(--bg3)', border: `1px solid var(--border)` }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium capitalize" style={{ color: 'var(--t1)' }}>
                    {p.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded capitalize font-semibold"
                    style={{ color: sevColor, background: `${sevColor}18` }}>
                    {p.severity}
                  </span>
                </div>
                <p className="text-xs mb-2" style={{ color: 'var(--t2)' }}>{p.description}</p>
                <p className="text-xs p-2 rounded" style={{ background: 'var(--bg4)', color: 'var(--acc)' }}>
                  💡 {p.recommendation}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {/* Best/Worst times */}
      {(data.best_hour_utc != null || data.worst_hour_utc != null) && (
        <div className="grid grid-cols-2 gap-3">
          {data.best_hour_utc != null && (
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Best Hour (UTC)</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--green)' }}>{data.best_hour_utc}:00</div>
            </div>
          )}
          {data.worst_hour_utc != null && (
            <div className="p-4 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
              <div className="text-xs mb-1" style={{ color: 'var(--t3)' }}>Worst Hour (UTC)</div>
              <div className="text-2xl font-bold" style={{ color: 'var(--red)' }}>{data.worst_hour_utc}:00</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Briefing Tab ─────────────────────────────────────────────────────────────

function BriefingTab() {
  const { data, loading } = useDailyBriefing();

  if (loading) return <Loader />;
  if (!data) return <Empty msg="Briefing unavailable" />;

  return (
    <div className="flex flex-col gap-5">
      {/* Session + learning status */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="px-3 py-1 rounded-full text-xs font-medium" style={{ background: 'var(--bg3)', color: 'var(--acc)', border: '1px solid var(--border)' }}>
          {data.session}
        </div>
        <div className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--bg3)', color: data.learning_mode === 'stabilizing' ? 'var(--amber)' : 'var(--green)', border: '1px solid var(--border)' }}>
          {data.learning_mode === 'stabilizing' ? '⚠ Stabilizing Mode' : '✓ Learning Normal'}
        </div>
        {data.best_regime_today !== 'unknown' && (
          <div className="px-3 py-1 rounded-full text-xs" style={{ background: 'var(--bg3)', color: 'var(--purple)', border: '1px solid var(--border)' }}>
            Best regime: {data.best_regime_today}
          </div>
        )}
      </div>

      {/* Cautions */}
      {data.cautions?.length > 0 && (
        <div className="flex flex-col gap-2">
          {data.cautions.map((c: string, i: number) => (
            <div key={i} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(255,56,86,0.06)', color: 'var(--red)', border: '1px solid rgba(255,56,86,0.15)' }}>
              {c}
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations?.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--t3)' }}>Recommendations</h3>
          {data.recommendations.map((r: string, i: number) => (
            <div key={i} className="px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(0,200,240,0.05)', color: 'var(--t1)', border: '1px solid var(--border)' }}>
              {r}
            </div>
          ))}
        </div>
      )}

      {/* News events */}
      {data.high_impact_events_today > 0 && (
        <div className="p-4 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{ color: 'var(--amber)' }}>📅</span>
            <span className="text-sm font-medium" style={{ color: 'var(--t1)' }}>{data.high_impact_events_today} High-Impact Events Today</span>
          </div>
          {data.next_event && <p className="text-xs" style={{ color: 'var(--t2)' }}>Next: {data.next_event}</p>}
          {data.avoid_trading_until && (
            <p className="text-xs mt-1" style={{ color: 'var(--red)' }}>⏸ Avoid trading until: {new Date(data.avoid_trading_until).toLocaleTimeString()}</p>
          )}
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Open Risk',       value: `${data.open_risk_pct?.toFixed(1) ?? 0}%`, color: 'var(--amber)' },
          { label: 'Weekly R',        value: `${data.weekly_expectancy_r >= 0 ? '+' : ''}${data.weekly_expectancy_r}R`, color: data.weekly_expectancy_r >= 0 ? 'var(--green)' : 'var(--red)' },
          { label: 'Streak',          value: data.current_streak?.count > 0 ? `${data.current_streak.count}× ${data.current_streak.type}` : '—', color: data.current_streak?.type === 'win' ? 'var(--green)' : data.current_streak?.type === 'loss' ? 'var(--red)' : 'var(--t2)' },
        ].map(({ label, value, color }) => (
          <div key={label} className="rounded-xl p-4 text-center" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
            <div className="text-lg font-bold" style={{ color }}>{value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Pair priorities */}
      {data.pair_priorities?.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--t3)' }}>Pair Priority</h3>
          <div className="grid grid-cols-2 gap-2">
            {data.pair_priorities.map((p: any) => (
              <div key={p.pair} className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--t1)', fontWeight: 500 }}>{p.pair}</span>
                <div className="flex flex-col items-end gap-0.5">
                  <span style={{ color: p.priority === 'focus' ? 'var(--green)' : p.priority === 'avoid' ? 'var(--red)' : 'var(--t2)', fontSize: 11, fontWeight: 600 }}>
                    {p.priority.toUpperCase()}
                  </span>
                  <span style={{ color: 'var(--t3)', fontSize: 10 }}>{p.reason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Shared ────────────────────────────────────────────────────────────────────

function Loader() {
  return <div className="flex items-center justify-center h-32" style={{ color: 'var(--t3)' }}>Loading…</div>;
}

function Empty({ msg }: { msg: string }) {
  return <div className="text-center py-10 text-sm" style={{ color: 'var(--t3)' }}>{msg}</div>;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const [tab, setTab] = useState<Tab>('Risk');

  return (
    <div className="flex flex-col gap-5 p-4 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>Portfolio Intelligence</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>Risk exposure, behavioral patterns, and pre-session briefing</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--bg3)' }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: tab === t ? 'var(--acc)' : 'transparent', color: tab === t ? 'var(--bg)' : 'var(--t2)' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Risk'     && <RiskTab />}
      {tab === 'Behavior' && <BehaviorTab />}
      {tab === 'Briefing' && <BriefingTab />}
    </div>
  );
}
