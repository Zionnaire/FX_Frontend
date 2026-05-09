'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSignal } from '../../hooks/useSignal';
import { useChart } from '../../hooks/useChart';
import { usePair } from '../../hooks/usePair';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { calcRSI, calcMACD, calcEMA, calcBollingerBands } from '../../utils/indicators';
import { C } from '../../utils/chartColors';

type ChartType = 'candles' | 'bars' | 'line' | 'area';

// ─── Utility: time-remaining from a date ──────────────────────────────────────
function useCountdown(target?: string | Date | null): string {
  const [label, setLabel] = useState('');
  useEffect(() => {
    if (!target) { setLabel(''); return; }
    const update = () => {
      const diff = new Date(target).getTime() - Date.now();
      if (diff <= 0) { setLabel('Expired'); return; }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1000);
      setLabel(h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${s}s` : `${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [target]);
  return label;
}

// ─── Confluence meter ─────────────────────────────────────────────────────────
function ConfluenceMeter({ score }: { score?: number }) {
  const total = 8;
  const s = score ?? 0;
  const color = s >= 6 ? 'var(--green)' : s >= 4 ? 'var(--amber)' : 'var(--red)';
  const label = s >= 6 ? 'A+ Setup' : s >= 4 ? 'B Setup' : 'Weak';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs" style={{ color: 'var(--t3)' }}>Confluence</span>
        <span className="text-xs font-bold" style={{ color }}>{s}/{total} — {label}</span>
      </div>
      <div className="flex gap-1">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm"
            style={{
              height: 5,
              background: i < s ? color : 'var(--border2)',
              transition: 'background 0.3s',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Session badge ────────────────────────────────────────────────────────────
function SessionBadge({ rating }: { rating?: string }) {
  if (!rating) return null;
  const styles: Record<string, { bg: string; fg: string; border: string }> = {
    PRIME:  { bg: 'rgba(0,230,118,0.12)',  fg: 'var(--green)', border: 'rgba(0,230,118,0.4)' },
    ACTIVE: { bg: 'rgba(0,200,240,0.12)',  fg: 'var(--acc)',   border: 'rgba(0,200,240,0.4)' },
    AVOID:  { bg: 'rgba(255,56,86,0.12)',  fg: 'var(--red)',   border: 'rgba(255,56,86,0.4)' },
  };
  const s = styles[rating] ?? styles.ACTIVE;
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}
    >
      {rating}
    </span>
  );
}

// ─── Entry type badge ─────────────────────────────────────────────────────────
function EntryTypeBadge({ type }: { type?: string }) {
  if (!type) return null;
  const isLimit = type === 'LIMIT';
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-semibold"
      style={{
        background: isLimit ? 'rgba(255,183,0,0.12)' : 'rgba(0,200,240,0.12)',
        color:      isLimit ? 'var(--amber)' : 'var(--acc)',
        border:     `1px solid ${isLimit ? 'rgba(255,183,0,0.4)' : 'rgba(0,200,240,0.4)'}`,
      }}
    >
      {type}
    </span>
  );
}

// ─── Level row ────────────────────────────────────────────────────────────────
function LevelRow({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <div>
        <span className="text-xs" style={{ color: 'var(--t2)' }}>{label}</span>
        {sub && <span className="text-xs ml-1" style={{ color: 'var(--t3)' }}>{sub}</span>}
      </div>
      <span className="text-xs font-semibold font-mono-num" style={{ color }}>{value}</span>
    </div>
  );
}

// ─── Build copy text ──────────────────────────────────────────────────────────
function buildCopyText(signal: any, pair: string, tf: string): string {
  if (!signal) return '';
  const lines = [
    `📊 AURA SIGNAL — ${pair} ${tf}`,
    `Direction: ${signal.signal}  (${signal.confidence}% confidence)`,
    `Entry:       ${signal.entry}  [${signal.entryType ?? 'MARKET'}]`,
    `Stop Loss:   ${signal.stopLoss}  (${signal.pipsToSL ?? '?'} pips)`,
    `Take Profit: ${signal.takeProfit}  (${signal.pipsToTP ?? '?'} pips)`,
    `R:R          ${signal.riskReward}`,
    `Time horizon: ${signal.timeHorizon}`,
    signal.htfBias ? `Bias: ${signal.htfBias}` : '',
    `Session: ${signal.sessionRating ?? ''}  |  Confluence: ${signal.confluenceScore ?? 0}/8`,
    '',
    signal.reasoning ? `Analysis: ${signal.reasoning}` : '',
  ].filter(l => l !== undefined && !(l === '' && !signal.htfBias));
  return lines.join('\n').trim();
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SignalsPage() {
  const { signal, loading: sigLoading, refetch } = useSignal();
  const { chart: ohlcv, loading: chartLoading } = useChart();
  const { activePair, activeTF } = usePair();

  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef  = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);

  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showEMA,   setShowEMA]   = useState(true);
  const [showBB,    setShowBB]    = useState(false);
  const [copied,    setCopied]    = useState(false);

  const validity = useCountdown(signal?.invalidatesAt);

  const copyToClipboard = useCallback(() => {
    const text = buildCopyText(signal, activePair, activeTF);
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [signal, activePair, activeTF]);

  useEffect(() => {
    if (!mainRef.current || !ohlcv || ohlcv.length === 0) return;

    const closes = ohlcv.map((b: any) => b.close);
    const chartOpts = {
      layout: { background: { color: C.bg3 }, textColor: C.t2 },
      grid:   { vertLines: { color: C.border }, horzLines: { color: C.border } },
      crosshair: { mode: 1 as const },
    };

    const main = createChart(mainRef.current, {
      ...chartOpts,
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      width:  mainRef.current.clientWidth,
      height: mainRef.current.clientHeight,
    });

    let priceSeries: ISeriesApi<any>;
    if (chartType === 'candles') {
      priceSeries = main.addCandlestickSeries({
        upColor: C.green, downColor: C.red,
        borderUpColor: C.green, borderDownColor: C.red,
        wickUpColor: C.green, wickDownColor: C.red,
      });
      priceSeries.setData(ohlcv);
    } else if (chartType === 'line') {
      priceSeries = main.addLineSeries({ color: C.acc, lineWidth: 1 });
      priceSeries.setData(ohlcv.map((b: any) => ({ time: b.time, value: b.close })));
    } else if (chartType === 'area') {
      priceSeries = main.addAreaSeries({ lineColor: C.acc, topColor: 'rgba(0,200,240,0.2)', bottomColor: 'rgba(0,0,0,0)', lineWidth: 1 });
      priceSeries.setData(ohlcv.map((b: any) => ({ time: b.time, value: b.close })));
    } else {
      priceSeries = main.addBarSeries({ upColor: C.green, downColor: C.red });
      priceSeries.setData(ohlcv);
    }

    if (showEMA) {
      ([20, 50, 200] as const).forEach((p, idx) => {
        const emas   = calcEMA(closes, p);
        const colors = [C.blue, C.amber, C.purple];
        const s = main.addLineSeries({ color: colors[idx], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        s.setData(ohlcv.map((b: any, i: number) => emas[i] !== null ? { time: b.time, value: emas[i]! } : null).filter(Boolean) as any[]);
      });
    }

    if (showBB) {
      const bbs = calcBollingerBands(closes);
      const bbColors = [C.purple, C.t3, C.purple];
      (['upper', 'middle', 'lower'] as const).forEach((band, idx) => {
        const s = main.addLineSeries({ color: bbColors[idx], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        s.setData(ohlcv.map((b: any, i: number) => bbs[i][band] !== null ? { time: b.time, value: bbs[i][band]! } : null).filter(Boolean) as any[]);
      });
    }

    main.timeScale().fitContent();

    // Draw signal levels as price lines
    if (signal) {
      if (signal.entry) priceSeries.createPriceLine({ price: signal.entry, color: C.acc,   lineWidth: 1, lineStyle: 2, title: 'Entry' });
      if (signal.takeProfit) priceSeries.createPriceLine({ price: signal.takeProfit, color: C.green, lineWidth: 1, lineStyle: 2, title: 'TP' });
      if (signal.stopLoss)   priceSeries.createPriceLine({ price: signal.stopLoss,   color: C.red,   lineWidth: 1, lineStyle: 2, title: 'SL' });
    }

    let rsiChart: IChartApi | null = null;
    if (rsiRef.current) {
      rsiChart = createChart(rsiRef.current, {
        ...chartOpts,
        rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
        width:  rsiRef.current.clientWidth,
        height: rsiRef.current.clientHeight,
      });
      const rsiData = calcRSI(closes);
      const rsiS = rsiChart.addLineSeries({ color: C.purple, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      rsiS.setData(ohlcv.map((b: any, i: number) => rsiData[i] !== null ? { time: b.time, value: rsiData[i]! } : null).filter(Boolean) as any[]);
      const ob = rsiChart.addLineSeries({ color: 'rgba(255,56,86,0.4)',  lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const os = rsiChart.addLineSeries({ color: 'rgba(0,230,118,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      if (ohlcv.length > 0) {
        ob.setData([{ time: ohlcv[0].time, value: 70 }, { time: ohlcv[ohlcv.length - 1].time, value: 70 }]);
        os.setData([{ time: ohlcv[0].time, value: 30 }, { time: ohlcv[ohlcv.length - 1].time, value: 30 }]);
      }
      rsiChart.timeScale().fitContent();
    }

    let macdChart: IChartApi | null = null;
    if (macdRef.current) {
      macdChart = createChart(macdRef.current, {
        ...chartOpts,
        rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
        width:  macdRef.current.clientWidth,
        height: macdRef.current.clientHeight,
      });
      const macdData = calcMACD(closes);
      const macdS = macdChart.addLineSeries({ color: C.acc,   lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      const sigS  = macdChart.addLineSeries({ color: C.amber, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      const histS = macdChart.addHistogramSeries({ color: C.green, priceLineVisible: false });
      macdS.setData(ohlcv.map((b: any, i: number) => macdData[i].macd     !== null ? { time: b.time, value: macdData[i].macd! }     : null).filter(Boolean) as any[]);
      sigS.setData( ohlcv.map((b: any, i: number) => macdData[i].signal   !== null ? { time: b.time, value: macdData[i].signal! }   : null).filter(Boolean) as any[]);
      histS.setData(ohlcv.map((b: any, i: number) => macdData[i].histogram !== null ? { time: b.time, value: macdData[i].histogram!, color: macdData[i].histogram! >= 0 ? C.green : C.red } : null).filter(Boolean) as any[]);
      macdChart.timeScale().fitContent();

      main.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) {
          rsiChart?.timeScale().setVisibleLogicalRange(range);
          macdChart?.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const onResize = () => {
      if (mainRef.current) main.applyOptions({ width: mainRef.current.clientWidth });
      if (rsiRef.current  && rsiChart)  rsiChart.applyOptions({  width: rsiRef.current.clientWidth });
      if (macdRef.current && macdChart) macdChart.applyOptions({ width: macdRef.current.clientWidth });
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      main.remove();
      rsiChart?.remove();
      macdChart?.remove();
    };
  }, [ohlcv, chartType, showEMA, showBB, signal]);

  const CHART_TYPES: { key: ChartType; label: string }[] = [
    { key: 'candles', label: 'Candles' },
    { key: 'bars',    label: 'Bars' },
    { key: 'line',    label: 'Line' },
    { key: 'area',    label: 'Area' },
  ];

  const signalColor =
    signal?.signal === 'BUY'  ? 'var(--green)' :
    signal?.signal === 'SELL' ? 'var(--red)'   : 'var(--amber)';

  const bullPct = signal?.bullScore ?? 50;
  const bearPct = signal?.bearScore ?? 50;

  return (
    <div className="flex gap-3 h-full overflow-hidden">
      {/* ── Chart area ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 flex-1 min-w-0 overflow-auto">
        {/* Toolbar */}
        <div className="card px-3 py-2 flex items-center gap-3 flex-wrap">
          <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>Chart</span>
          <div className="flex gap-1">
            {CHART_TYPES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setChartType(key)}
                className="text-xs px-2 py-1 rounded transition-all"
                style={chartType === key
                  ? { background: 'var(--acc)', color: '#000', fontWeight: 600 }
                  : { background: 'var(--bg2)', color: 'var(--t2)', border: '1px solid var(--border2)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
          <div className="w-px h-4" style={{ background: 'var(--border)' }} />
          {[{ key: 'EMA', active: showEMA, toggle: () => setShowEMA(!showEMA) },
            { key: 'BB',  active: showBB,  toggle: () => setShowBB(!showBB) }].map(({ key, active, toggle }) => (
            <button
              key={key}
              onClick={toggle}
              className="text-xs px-2 py-1 rounded transition-all"
              style={active
                ? { background: 'rgba(0,200,240,0.15)', color: 'var(--acc)', border: '1px solid var(--acc)' }
                : { background: 'transparent', color: 'var(--t3)', border: '1px solid var(--border2)' }
              }
            >
              {key}
            </button>
          ))}
          {(sigLoading || chartLoading) && (
            <div className="ml-auto h-3 w-3 rounded-full border border-t-transparent animate-spin"
              style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
          )}
        </div>

        <div className="card" style={{ height: 300 }}>
          <div ref={mainRef} className="w-full h-full" />
        </div>

        <div className="card" style={{ height: 100 }}>
          <div className="flex items-center px-3 pt-2 pb-1 gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>RSI (14)</span>
            <span className="text-xs" style={{ color: 'var(--red)' }}>OB: 70</span>
            <span className="text-xs" style={{ color: 'var(--green)' }}>OS: 30</span>
          </div>
          <div ref={rsiRef} style={{ height: 68 }} />
        </div>

        <div className="card" style={{ height: 100 }}>
          <div className="flex items-center px-3 pt-2 pb-1 gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>MACD (12,26,9)</span>
            <span className="text-xs" style={{ color: 'var(--acc)' }}>MACD</span>
            <span className="text-xs" style={{ color: 'var(--amber)' }}>Signal</span>
            <span className="text-xs" style={{ color: 'var(--green)' }}>Hist</span>
          </div>
          <div ref={macdRef} style={{ height: 68 }} />
        </div>
      </div>

      {/* ── Right sidebar ────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 overflow-auto" style={{ width: 262, flexShrink: 0 }}>

        {/* Signal header card */}
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase" style={{ color: 'var(--t3)' }}>
              {activePair} · {activeTF}
            </span>
            <button
              onClick={refetch}
              className="text-xs px-2 py-0.5 rounded transition-all"
              style={{ background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border2)' }}
              title="Refresh signal"
            >
              ↻
            </button>
          </div>

          {signal ? (
            <>
              {/* Direction + badges */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    color:      signalColor,
                    background: signal.signal === 'BUY' ? 'rgba(0,230,118,0.15)' : signal.signal === 'SELL' ? 'rgba(255,56,86,0.15)' : 'rgba(255,183,0,0.15)',
                    border:     `1px solid ${signal.signal === 'BUY' ? 'rgba(0,230,118,0.4)' : signal.signal === 'SELL' ? 'rgba(255,56,86,0.4)' : 'rgba(255,183,0,0.4)'}`,
                  }}
                >
                  {signal.signal}
                </span>
                <div className="flex-1">
                  <div className="text-base font-bold" style={{ color: 'var(--t1)' }}>{signal.confidence}%</div>
                  <div className="text-xs" style={{ color: 'var(--t3)' }}>confidence</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <SessionBadge rating={signal.sessionRating} />
                  <EntryTypeBadge type={signal.entryType} />
                </div>
              </div>

              {/* Confluence meter */}
              <ConfluenceMeter score={signal.confluenceScore} />

              {/* Validity */}
              {validity && (
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>Valid for</span>
                  <span className="text-xs font-semibold font-mono-num" style={{ color: validity === 'Expired' ? 'var(--red)' : 'var(--acc)' }}>
                    {validity}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>
              {sigLoading ? 'Analysing...' : 'No signal'}
            </div>
          )}
        </div>

        {/* Trade levels card */}
        {signal && (
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase mb-1" style={{ color: 'var(--t3)' }}>Trade Levels</div>
            <LevelRow
              label="Entry"
              value={signal.entry ?? '—'}
              sub={signal.entryType ? `(${signal.entryType})` : undefined}
              color="var(--acc)"
            />
            <LevelRow
              label="Take Profit"
              value={signal.takeProfit ?? '—'}
              sub={signal.pipsToTP ? `+${signal.pipsToTP} pips` : undefined}
              color="var(--green)"
            />
            <LevelRow
              label="Stop Loss"
              value={signal.stopLoss ?? '—'}
              sub={signal.pipsToSL ? `${signal.pipsToSL} pips` : undefined}
              color="var(--red)"
            />
            <LevelRow label="R/R Ratio"    value={signal.riskReward ?? '—'} color="var(--amber)" />
            <LevelRow label="Time Horizon" value={signal.timeHorizon ?? '—'} color="var(--t1)" />

            {/* Copy to broker button */}
            <button
              onClick={copyToClipboard}
              className="w-full mt-3 py-1.5 rounded text-xs font-semibold transition-all"
              style={{
                background: copied ? 'rgba(0,230,118,0.15)' : 'rgba(0,200,240,0.1)',
                color:      copied ? 'var(--green)' : 'var(--acc)',
                border:     `1px solid ${copied ? 'rgba(0,230,118,0.4)' : 'rgba(0,200,240,0.3)'}`,
              }}
            >
              {copied ? '✓ Copied!' : 'Copy Signal for Broker'}
            </button>
          </div>
        )}

        {/* Market bias card */}
        {signal && (signal.htfBias || signal.bullScore != null) && (
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Market Bias</div>

            {/* Bull / Bear score bar */}
            <div className="mb-2">
              <div className="flex justify-between text-xs mb-1">
                <span style={{ color: 'var(--green)' }}>Bull {bullPct}%</span>
                <span style={{ color: 'var(--red)' }}>Bear {bearPct}%</span>
              </div>
              <div className="flex rounded-full overflow-hidden" style={{ height: 6, background: 'var(--border2)' }}>
                <div style={{ width: `${bullPct}%`, background: 'var(--green)', transition: 'width 0.5s' }} />
                <div style={{ width: `${bearPct}%`, background: 'var(--red)',   transition: 'width 0.5s' }} />
              </div>
            </div>

            {signal.htfBias && (
              <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>
                {signal.htfBias}
              </p>
            )}
          </div>
        )}

        {/* Key risks */}
        {signal?.keyRisks?.length > 0 && (
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Key Risks</div>
            <ul className="flex flex-col gap-1">
              {signal.keyRisks.slice(0, 3).map((r: string, i: number) => (
                <li key={i} className="text-xs leading-relaxed flex gap-1.5" style={{ color: 'var(--t2)' }}>
                  <span style={{ color: 'var(--amber)', flexShrink: 0 }}>▸</span>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Reasoning */}
        {signal?.reasoning && (
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>AI Analysis</div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>{signal.reasoning}</p>
          </div>
        )}

        {/* Auto-trade badge */}
        {signal?.autoTradeRecommended && (
          <div
            className="card p-3 text-center text-xs font-semibold"
            style={{
              background: 'rgba(0,230,118,0.08)',
              border: '1px solid rgba(0,230,118,0.3)',
              color: 'var(--green)',
            }}
          >
            ✓ Auto-Trade Recommended
          </div>
        )}

      </div>
    </div>
  );
}
