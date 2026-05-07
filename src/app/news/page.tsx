'use client';

import React, { useState } from 'react';
import { useNews } from '../../hooks/useNews';
import { usePair } from '../../hooks/usePair';

type Filter = 'all' | 'bullish' | 'bearish' | 'neutral' | 'high';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'bullish', label: 'Bullish' },
  { key: 'bearish', label: 'Bearish' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'high', label: 'High Impact' },
];

function sentimentColor(s: string) {
  if (s === 'bullish' || s === 'bull') return 'var(--green)';
  if (s === 'bearish' || s === 'bear') return 'var(--red)';
  return 'var(--t3)';
}

function impactColor(i: string) {
  if (i === 'high') return 'var(--red)';
  if (i === 'medium' || i === 'med') return 'var(--amber)';
  return 'var(--t3)';
}

function NewsCard({ item }: { item: any }) {
  const [expanded, setExpanded] = useState(false);
  const sc = sentimentColor(item.sentiment);
  const ic = impactColor(item.impact);
  return (
    <div className="card p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start gap-2">
        <span className="mt-1 h-2 w-2 rounded-full flex-shrink-0" style={{ background: sc }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug" style={{ color: 'var(--t1)' }}>{item.headline || item.title}</p>
            <span className="text-xs px-1.5 py-0.5 rounded flex-shrink-0" style={{ background: `${ic}22`, color: ic, border: `1px solid ${ic}44` }}>
              {item.impact ?? 'low'}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--t3)' }}>
            {item.source && <span>{item.source}</span>}
            {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleDateString()}</span>}
            <span className="capitalize" style={{ color: sc }}>{item.sentiment}</span>
            {item.pairs?.length > 0 && <span>{item.pairs.join(', ')}</span>}
          </div>
          {expanded && item.reasoning && (
            <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>{item.reasoning}</p>
          )}
        </div>
        <span className="text-xs flex-shrink-0 mt-0.5" style={{ color: 'var(--t3)' }}>{expanded ? '▲' : '▼'}</span>
      </div>
    </div>
  );
}

export default function NewsPage() {
  const { activePair } = usePair();
  const { news, calendar, loading, error } = useNews(activePair);
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = (news ?? []).filter((n: any) => {
    if (filter === 'all') return true;
    if (filter === 'bullish') return n.sentiment === 'bullish' || n.sentiment === 'bull';
    if (filter === 'bearish') return n.sentiment === 'bearish' || n.sentiment === 'bear';
    if (filter === 'neutral') return n.sentiment === 'neutral';
    if (filter === 'high') return n.impact === 'high';
    return true;
  });

  const sentimentCount = {
    bullish: (news ?? []).filter((n: any) => n.sentiment === 'bullish' || n.sentiment === 'bull').length,
    bearish: (news ?? []).filter((n: any) => n.sentiment === 'bearish' || n.sentiment === 'bear').length,
    neutral: (news ?? []).filter((n: any) => n.sentiment === 'neutral').length,
  };
  const total = (news ?? []).length || 1;
  const bullPct = Math.round((sentimentCount.bullish / total) * 100);
  const bearPct = Math.round((sentimentCount.bearish / total) * 100);

  return (
    <div className="flex gap-3 h-full overflow-hidden">
      {/* Main area */}
      <div className="flex flex-col gap-3 flex-1 min-w-0 overflow-auto">
        {/* Filter bar */}
        <div className="card px-3 py-2 flex items-center gap-2 flex-wrap">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="text-xs px-3 py-1 rounded-full font-semibold transition-all"
              style={filter === key
                ? { background: 'var(--acc)', color: '#000' }
                : { background: 'transparent', color: 'var(--t2)', border: '1px solid var(--border2)' }
              }
            >
              {label}
            </button>
          ))}
          <span className="ml-auto text-xs" style={{ color: 'var(--t3)' }}>{activePair} · {filtered.length} items</span>
        </div>

        {error && (
          <div className="card p-3 text-xs" style={{ color: 'var(--red)', border: '1px solid var(--red)' }}>{error}</div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="card h-16 animate-pulse" style={{ background: 'var(--bg4)' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-6 text-center text-xs" style={{ color: 'var(--t3)' }}>
            No news available for {activePair} with the selected filter.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((item: any, i: number) => (
              <NewsCard key={`${item.headline || item.title}-${i}`} item={item} />
            ))}
          </div>
        )}
      </div>

      {/* Right sidebar */}
      <div className="flex flex-col gap-3 overflow-auto" style={{ width: 240, flexShrink: 0 }}>
        {/* Sentiment meter */}
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Sentiment</div>
          <div className="flex h-3 rounded-full overflow-hidden mb-3">
            <div style={{ width: `${bullPct}%`, background: 'var(--green)' }} />
            <div style={{ width: `${bearPct}%`, background: 'var(--red)' }} />
            <div style={{ flex: 1, background: 'var(--border2)' }} />
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'var(--green)' }}>▲ {bullPct}% Bullish</span>
            <span style={{ color: 'var(--red)' }}>▼ {bearPct}% Bearish</span>
          </div>
          <div className="mt-3 space-y-1.5">
            {[
              { l: 'Bullish', v: sentimentCount.bullish, c: 'var(--green)' },
              { l: 'Bearish', v: sentimentCount.bearish, c: 'var(--red)' },
              { l: 'Neutral', v: sentimentCount.neutral, c: 'var(--t3)' },
            ].map(({ l, v, c }) => (
              <div key={l} className="flex justify-between text-xs">
                <span style={{ color: 'var(--t2)' }}>{l}</span>
                <span className="font-mono-num" style={{ color: c }}>{v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Economic calendar */}
        <div className="card p-4 flex-1 overflow-auto">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Economic Calendar</div>
          {(calendar ?? []).length === 0 ? (
            <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>No upcoming events</div>
          ) : (
            (calendar ?? []).map((ev: any, i: number) => {
              const ic = impactColor(ev.impact);
              return (
                <div key={i} className="mb-3 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-medium leading-snug" style={{ color: 'var(--t1)' }}>{ev.title}</span>
                    <span className="text-xs flex-shrink-0 px-1 rounded" style={{ background: `${ic}22`, color: ic }}>{ev.impact}</span>
                  </div>
                  <div className="text-xs" style={{ color: 'var(--t3)' }}>{ev.time} · {ev.country}</div>
                  {(ev.previousValue != null || ev.forecastValue != null) && (
                    <div className="flex gap-3 mt-1 text-xs" style={{ color: 'var(--t2)' }}>
                      {ev.previousValue != null && <span>Prev: {ev.previousValue}</span>}
                      {ev.forecastValue != null && <span>Fcst: {ev.forecastValue}</span>}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
