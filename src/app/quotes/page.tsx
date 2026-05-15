'use client';

import React, { useEffect, useRef, useState } from 'react';
import { getCurrentPrice, getOHLCV } from '../../services/chart.service';

const PAIRS = ['GBP/USD', 'EUR/USD', 'XAU/USD', 'USD/JPY'] as const;
type Pair = typeof PAIRS[number];

// Typical broker spreads (in price units)
const SPREADS: Record<Pair, number> = {
  'GBP/USD': 0.00015,
  'EUR/USD': 0.00010,
  'XAU/USD': 0.25,
  'USD/JPY': 0.012,
};

// Price decimal places for display
const DECIMALS: Record<Pair, number> = {
  'GBP/USD': 5,
  'EUR/USD': 5,
  'XAU/USD': 2,
  'USD/JPY': 3,
};

function getSessionRating(pair: Pair, utcHour: number): 'PRIME' | 'ACTIVE' | 'AVOID' {
  switch (pair) {
    case 'XAU/USD':
      if ((utcHour >= 7 && utcHour < 12) || (utcHour >= 13 && utcHour < 16)) return 'PRIME';
      if (utcHour >= 12 && utcHour < 20) return 'ACTIVE';
      return 'AVOID';
    case 'GBP/USD':
      if (utcHour >= 13 && utcHour < 17) return 'PRIME';
      if (utcHour >= 7 && utcHour < 17) return 'ACTIVE';
      return 'AVOID';
    case 'EUR/USD':
      if (utcHour >= 13 && utcHour < 17) return 'PRIME';
      if (utcHour >= 7 && utcHour < 17) return 'ACTIVE';
      return 'AVOID';
    case 'USD/JPY':
      if (utcHour >= 13 && utcHour < 17) return 'PRIME';
      if ((utcHour >= 7 && utcHour < 17) || utcHour >= 22 || utcHour < 7) return 'ACTIVE';
      return 'AVOID';
  }
}

interface PairData {
  price: number | null;
  prevClose: number | null;
  dayOpen: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  direction: 'up' | 'down' | null;
  loading: boolean;
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    data.forEach((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    // Fill under the line
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = color.replace(')', ', 0.08)').replace('rgb', 'rgba');
    ctx.fill();
  }, [data, color]);
  return <canvas ref={canvasRef} width={80} height={30} style={{ display: 'block' }} />;
}

function usePairData(pair: Pair) {
  const [data, setData] = useState<PairData>({
    price: null, prevClose: null, dayOpen: null,
    dayHigh: null, dayLow: null, direction: null, loading: true,
  });
  const [sparkline, setSparkline] = useState<number[]>([]);
  const prevPriceRef = useRef<number | null>(null);

  useEffect(() => {
    // Load daily candle for open/prev-close
    getOHLCV(pair, '1d').then((res) => {
      const candles: any[] = res.data?.data ?? [];
      if (candles.length >= 2) {
        const today = candles[candles.length - 1];
        const yesterday = candles[candles.length - 2];
        setData((d) => ({
          ...d,
          prevClose: yesterday.close,
          dayOpen: today.open,
          dayHigh: today.high,
          dayLow: today.low,
        }));
      }
    }).catch(() => {});

    // Load 1h candles for sparkline
    getOHLCV(pair, '1h').then((res) => {
      const candles: any[] = res.data?.data ?? [];
      const last24 = candles.slice(-24).map((c: any) => c.close);
      setSparkline(last24);
    }).catch(() => {});
  }, [pair]);

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await getCurrentPrice(pair);
        const price: number | undefined = res.data?.data?.price;
        if (price == null) return;
        const prev = prevPriceRef.current;
        const direction = prev == null ? null : price > prev ? 'up' : price < prev ? 'down' : null;
        prevPriceRef.current = price;
        setData((d) => ({ ...d, price, direction, loading: false }));
      } catch {
        setData((d) => ({ ...d, loading: false }));
      }
    };
    poll();
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [pair]);

  return { data, sparkline };
}

function PairRow({ pair, utcHour }: { pair: Pair; utcHour: number }) {
  const { data, sparkline } = usePairData(pair);
  const [flashKey, setFlashKey] = useState(0);

  const dec = DECIMALS[pair];
  const spread = SPREADS[pair];
  const bid = data.price != null ? data.price - spread / 2 : null;
  const ask = data.price != null ? data.price + spread / 2 : null;
  const spreadPips = pair === 'USD/JPY' ? spread * 100 : pair === 'XAU/USD' ? spread * 10 : spread * 10000;

  const changeAbs = data.price != null && data.prevClose != null
    ? data.price - data.prevClose : null;
  const changePct = changeAbs != null && data.prevClose != null
    ? (changeAbs / data.prevClose) * 100 : null;

  const isUp = (changeAbs ?? 0) >= 0;
  const changeColor = changeAbs == null ? 'var(--t3)' : isUp ? 'var(--green)' : 'var(--red)';

  const session = getSessionRating(pair, utcHour);
  const sessionStyle = {
    PRIME:  { color: 'var(--green)', bg: 'rgba(0,230,118,0.12)' },
    ACTIVE: { color: 'var(--acc)',   bg: 'rgba(0,200,240,0.12)' },
    AVOID:  { color: 'var(--red)',   bg: 'rgba(255,56,86,0.12)' },
  }[session];

  // Flash on price direction change
  const prevDir = useRef<string | null>(null);
  useEffect(() => {
    if (data.direction && data.direction !== prevDir.current) {
      setFlashKey((k) => k + 1);
      prevDir.current = data.direction;
    }
  }, [data.direction]);

  const sparkColor = isUp ? '#00e676' : '#ff3856';

  return (
    <div
      className="card p-3 md:p-4 flex flex-col gap-2 transition-all"
      style={{ position: 'relative', overflow: 'hidden' }}
    >
      {/* Top row: pair + session + sparkline */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm" style={{ color: 'var(--t1)' }}>{pair}</span>
            <span
              className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: sessionStyle.bg, color: sessionStyle.color, fontSize: 10 }}
            >
              {session}
            </span>
          </div>
          {/* Bid / Ask */}
          <div className="flex items-center gap-3 mt-1">
            <div className="flex flex-col">
              <span className="text-xs" style={{ color: 'var(--t3)', fontSize: 10 }}>BID</span>
              <span
                key={`bid-${flashKey}`}
                className={data.direction === 'up' ? 'flash-up' : data.direction === 'down' ? 'flash-down' : ''}
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 15, color: 'var(--t1)', letterSpacing: '-0.01em' }}
              >
                {bid != null ? bid.toFixed(dec) : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs" style={{ color: 'var(--t3)', fontSize: 10 }}>ASK</span>
              <span
                style={{ fontFamily: 'var(--font-mono, monospace)', fontWeight: 700, fontSize: 15, color: 'var(--acc)', letterSpacing: '-0.01em' }}
              >
                {ask != null ? ask.toFixed(dec) : '—'}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-xs" style={{ color: 'var(--t3)', fontSize: 10 }}>SPREAD</span>
              <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--font-mono, monospace)' }}>
                {spreadPips.toFixed(1)} pips
              </span>
            </div>
          </div>
        </div>

        {/* Sparkline + change */}
        <div className="flex flex-col items-end gap-1">
          <MiniSparkline data={sparkline} color={sparkColor} />
          {changePct != null && (
            <span className="font-semibold text-xs" style={{ color: changeColor }}>
              {isUp ? '+' : ''}{changePct.toFixed(2)}%
            </span>
          )}
          {changeAbs != null && (
            <span className="text-xs" style={{ color: changeColor, fontSize: 10 }}>
              {isUp ? '+' : ''}{changeAbs.toFixed(dec)}
            </span>
          )}
        </div>
      </div>

      {/* Day range */}
      {data.dayLow != null && data.dayHigh != null && (
        <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <span className="text-xs" style={{ color: 'var(--t3)', fontSize: 10 }}>Day Range</span>
          <span className="font-mono text-xs" style={{ color: 'var(--red)' }}>{data.dayLow.toFixed(dec)}</span>
          <div className="flex-1 relative h-1 rounded-full" style={{ background: 'var(--border2)', minWidth: 40 }}>
            {data.price != null && data.dayLow != null && data.dayHigh != null && data.dayHigh !== data.dayLow && (
              <div
                className="absolute top-0 h-1 rounded-full"
                style={{
                  left: 0,
                  width: `${((data.price - data.dayLow) / (data.dayHigh - data.dayLow)) * 100}%`,
                  background: isUp ? 'var(--green)' : 'var(--red)',
                  transition: 'width 0.5s ease',
                }}
              />
            )}
          </div>
          <span className="font-mono text-xs" style={{ color: 'var(--green)' }}>{data.dayHigh.toFixed(dec)}</span>
          <span className="text-xs ml-auto" style={{ color: 'var(--t3)', fontSize: 10 }}>
            Open {data.dayOpen?.toFixed(dec) ?? '—'}
          </span>
        </div>
      )}

      {data.loading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg"
          style={{ background: 'rgba(0,0,0,0.4)' }}>
          <div className="h-4 w-4 rounded-full border border-t-transparent animate-spin"
            style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
        </div>
      )}
    </div>
  );
}

// 24-hour session timeline
const SESSIONS_DEF = [
  { name: 'Sydney',   start: 21, end: 6,  color: '#7c5ff5' },
  { name: 'Tokyo',    start: 0,  end: 9,  color: '#ff9900' },
  { name: 'London',   start: 7,  end: 16, color: '#00c8f0' },
  { name: 'New York', start: 12, end: 21, color: '#00e676' },
] as const;

function isSessionActive(start: number, end: number, hour: number): boolean {
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end; // wraps midnight
}

function SessionTimeline({ utcHour, utcMin }: { utcHour: number; utcMin: number }) {
  const totalMins = utcHour * 60 + utcMin;
  const nowPct = (totalMins / 1440) * 100;

  return (
    <div className="card p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase" style={{ color: 'var(--t3)' }}>
          Forex Sessions (UTC)
        </span>
        <span className="text-xs font-mono" style={{ color: 'var(--acc)' }}>
          {String(utcHour).padStart(2,'0')}:{String(utcMin).padStart(2,'0')} UTC
        </span>
      </div>

      {/* Timeline bars */}
      <div className="space-y-2">
        {SESSIONS_DEF.map((s) => {
          const active = isSessionActive(s.start, s.end, utcHour);
          // Convert to % of 24h
          const startPct = (s.start / 24) * 100;
          const endPct   = (s.end   / 24) * 100;
          const wraps    = s.start > s.end;
          return (
            <div key={s.name} className="flex items-center gap-2">
              <div className="w-16 flex-shrink-0 flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: active ? s.color : 'var(--border2)', boxShadow: active ? `0 0 5px ${s.color}` : 'none' }} />
                <span className="text-xs" style={{ color: active ? 'var(--t1)' : 'var(--t3)', fontSize: 10, fontWeight: active ? 600 : 400 }}>
                  {s.name}
                </span>
              </div>
              <div className="flex-1 relative h-4 rounded" style={{ background: 'var(--bg4)' }}>
                {/* Session bar */}
                {wraps ? (
                  <>
                    <div className="absolute top-0 h-full rounded-l" style={{ left: `${startPct}%`, width: `${100 - startPct}%`, background: active ? s.color : s.color + '55', transition: 'background 0.3s' }} />
                    <div className="absolute top-0 h-full rounded-r" style={{ left: 0, width: `${endPct}%`, background: active ? s.color : s.color + '55', transition: 'background 0.3s' }} />
                  </>
                ) : (
                  <div className="absolute top-0 h-full rounded" style={{ left: `${startPct}%`, width: `${endPct - startPct}%`, background: active ? s.color : s.color + '55', transition: 'background 0.3s' }} />
                )}
                {/* Now marker */}
                <div className="absolute top-0 h-full w-0.5" style={{ left: `${nowPct}%`, background: 'white', opacity: 0.8, zIndex: 1 }} />
                {/* Hour labels */}
                <div className="absolute top-0 h-full flex items-center" style={{ left: `${startPct}%`, transform: 'translateX(2px)' }}>
                  <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.7)', lineHeight: 1 }}>{String(s.start).padStart(2,'0')}h</span>
                </div>
              </div>
              <span className="text-xs flex-shrink-0" style={{ color: active ? s.color : 'var(--t3)', fontSize: 10, fontWeight: active ? 700 : 400, width: 40, textAlign: 'right' }}>
                {active ? 'OPEN' : `${String(s.start).padStart(2,'0')}:00`}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend: active sessions summary */}
      <div className="mt-2 pt-2 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border)' }}>
        {SESSIONS_DEF.filter(s => isSessionActive(s.start, s.end, utcHour)).length === 0 ? (
          <span className="text-xs" style={{ color: 'var(--t3)' }}>No major session open right now</span>
        ) : (
          SESSIONS_DEF.filter(s => isSessionActive(s.start, s.end, utcHour)).map(s => (
            <span key={s.name} className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: s.color + '22', color: s.color, border: `1px solid ${s.color}55` }}>
              {s.name} OPEN
            </span>
          ))
        )}
        {SESSIONS_DEF.filter(s => isSessionActive(s.start, s.end, utcHour)).length >= 2 && (
          <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.4)' }}>
            OVERLAP — Peak Liquidity
          </span>
        )}
      </div>
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-sm font-bold" style={{ color: 'var(--acc)' }}>{time}</span>;
}

export default function QuotesPage() {
  const [utcNow, setUtcNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setUtcNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);
  const utcHour = utcNow.getUTCHours();
  const utcMin  = utcNow.getUTCMinutes();

  return (
    <div className="flex flex-col gap-3 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold" style={{ color: 'var(--t1)' }}>Market Watch</h1>
          <p className="text-xs" style={{ color: 'var(--t3)' }}>Live bid/ask prices · refreshes every 4s</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse-green 2s infinite' }} />
          <LiveClock />
        </div>
      </div>

      {/* 4-session timeline */}
      <SessionTimeline utcHour={utcHour} utcMin={utcMin} />

      {/* Pair cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PAIRS.map((pair) => (
          <PairRow key={pair} pair={pair} utcHour={utcHour} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs pt-1" style={{ color: 'var(--t3)' }}>
        Bid/ask estimated from mid-price with typical broker spreads. For reference only.
      </p>
    </div>
  );
}
