'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSignal } from '../../hooks/useSignal';
import { useChart } from '../../hooks/useChart';
import { usePair } from '../../hooks/usePair';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { calcRSI, calcMACD, calcEMA, calcBollingerBands } from '../../utils/indicators';
import { C } from '../../utils/chartColors';

type ChartType = 'candles' | 'bars' | 'line' | 'area';

function SRLevel({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="flex justify-between items-center py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--t2)' }}>{label}</span>
      <span className="text-xs font-semibold font-mono-num" style={{ color }}>{value}</span>
    </div>
  );
}

export default function SignalsPage() {
  const { signal, loading: sigLoading } = useSignal();
  const { chart: ohlcv, loading: chartLoading } = useChart();
  const { activePair, activeTF } = usePair();

  const mainRef   = useRef<HTMLDivElement>(null);
  const rsiRef    = useRef<HTMLDivElement>(null);
  const macdRef   = useRef<HTMLDivElement>(null);
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [showEMA, setShowEMA] = useState(true);
  const [showBB, setShowBB] = useState(false);

  useEffect(() => {
    if (!mainRef.current || !ohlcv || ohlcv.length === 0) return;

    const closes = ohlcv.map((b: any) => b.close);

    const chartOpts = {
      layout: { background: { color: C.bg3 }, textColor: C.t2 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      crosshair: { mode: 1 as const },
    };

    // Main chart
    const main = createChart(mainRef.current, {
      ...chartOpts,
      rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      width: mainRef.current.clientWidth,
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

    // EMA overlays
    if (showEMA) {
      ([20, 50, 200] as const).forEach((p, idx) => {
        const emas = calcEMA(closes, p);
        const colors = [C.blue, C.amber, C.purple];
        const emaS = main.addLineSeries({ color: colors[idx], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        emaS.setData(
          ohlcv
            .map((b: any, i: number) => emas[i] !== null ? { time: b.time, value: emas[i]! } : null)
            .filter(Boolean) as any[]
        );
      });
    }

    // Bollinger Bands
    if (showBB) {
      const bbs = calcBollingerBands(closes);
      const bbColors = [C.purple, C.t3, C.purple];
      (['upper', 'middle', 'lower'] as const).forEach((band, idx) => {
        const s = main.addLineSeries({ color: bbColors[idx], lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
        s.setData(
          ohlcv
            .map((b: any, i: number) => bbs[i][band] !== null ? { time: b.time, value: bbs[i][band]! } : null)
            .filter(Boolean) as any[]
        );
      });
    }

    main.timeScale().fitContent();

    // RSI sub-chart
    let rsiChart: IChartApi | null = null;
    if (rsiRef.current) {
      rsiChart = createChart(rsiRef.current, {
        ...chartOpts,
        rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
        width: rsiRef.current.clientWidth,
        height: rsiRef.current.clientHeight,
      });
      const rsiData = calcRSI(closes);
      const rsiS = rsiChart.addLineSeries({ color: C.purple, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      rsiS.setData(
        ohlcv.map((b: any, i: number) => rsiData[i] !== null ? { time: b.time, value: rsiData[i]! } : null).filter(Boolean) as any[]
      );
      const ob = rsiChart.addLineSeries({ color: 'rgba(255,56,86,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      const os = rsiChart.addLineSeries({ color: 'rgba(0,230,118,0.4)', lineWidth: 1, priceLineVisible: false, lastValueVisible: false });
      if (ohlcv.length > 0) {
        ob.setData([{ time: ohlcv[0].time, value: 70 }, { time: ohlcv[ohlcv.length - 1].time, value: 70 }]);
        os.setData([{ time: ohlcv[0].time, value: 30 }, { time: ohlcv[ohlcv.length - 1].time, value: 30 }]);
      }
      rsiChart.timeScale().fitContent();
    }

    // MACD sub-chart
    let macdChart: IChartApi | null = null;
    if (macdRef.current) {
      macdChart = createChart(macdRef.current, {
        ...chartOpts,
        rightPriceScale: { borderColor: C.border, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
        width: macdRef.current.clientWidth,
        height: macdRef.current.clientHeight,
      });
      const macdData = calcMACD(closes);
      const macdS = macdChart.addLineSeries({ color: C.acc, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      const sigS  = macdChart.addLineSeries({ color: C.amber, lineWidth: 1, priceLineVisible: false, lastValueVisible: true });
      const histS = macdChart.addHistogramSeries({ color: C.green, priceLineVisible: false });
      macdS.setData(ohlcv.map((b: any, i: number) => macdData[i].macd !== null ? { time: b.time, value: macdData[i].macd! } : null).filter(Boolean) as any[]);
      sigS.setData(ohlcv.map((b: any, i: number) => macdData[i].signal !== null ? { time: b.time, value: macdData[i].signal! } : null).filter(Boolean) as any[]);
      histS.setData(
        ohlcv.map((b: any, i: number) => macdData[i].histogram !== null
          ? { time: b.time, value: macdData[i].histogram!, color: macdData[i].histogram! >= 0 ? C.green : C.red }
          : null).filter(Boolean) as any[]
      );
      macdChart.timeScale().fitContent();

      // Sync time scales
      main.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) {
          rsiChart?.timeScale().setVisibleLogicalRange(range);
          macdChart?.timeScale().setVisibleLogicalRange(range);
        }
      });
    }

    const onResize = () => {
      if (mainRef.current) main.applyOptions({ width: mainRef.current.clientWidth });
      if (rsiRef.current && rsiChart) rsiChart.applyOptions({ width: rsiRef.current.clientWidth });
      if (macdRef.current && macdChart) macdChart.applyOptions({ width: macdRef.current.clientWidth });
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      main.remove();
      rsiChart?.remove();
      macdChart?.remove();
    };
  }, [ohlcv, chartType, showEMA, showBB]);

  const indicators = signal?.indicators
    ? (Array.isArray(signal.indicators)
        ? signal.indicators
        : Object.entries(signal.indicators).map(([name, value]) => ({ name, value })))
    : [];

  const CHART_TYPES: { key: ChartType; label: string }[] = [
    { key: 'candles', label: 'Candles' },
    { key: 'bars', label: 'Bars' },
    { key: 'line', label: 'Line' },
    { key: 'area', label: 'Area' },
  ];

  return (
    <div className="flex gap-3 h-full overflow-hidden">
      {/* Chart area */}
      <div className="flex flex-col gap-2 flex-1 min-w-0 overflow-auto">
        {/* Chart toolbar */}
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
            { key: 'BB', active: showBB, toggle: () => setShowBB(!showBB) }].map(({ key, active, toggle }) => (
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
            <div className="ml-auto h-3 w-3 rounded-full border border-t-transparent animate-spin" style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
          )}
        </div>

        {/* Main chart */}
        <div className="card" style={{ height: 300 }}>
          <div ref={mainRef} className="w-full h-full" />
        </div>

        {/* RSI */}
        <div className="card" style={{ height: 100 }}>
          <div className="flex items-center px-3 pt-2 pb-1 gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--t3)' }}>RSI (14)</span>
            <div className="flex gap-2 text-xs">
              <span style={{ color: 'var(--red)' }}>OB: 70</span>
              <span style={{ color: 'var(--green)' }}>OS: 30</span>
            </div>
          </div>
          <div ref={rsiRef} style={{ height: 68 }} />
        </div>

        {/* MACD */}
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

      {/* Right sidebar */}
      <div className="flex flex-col gap-3 overflow-auto" style={{ width: 240, flexShrink: 0 }}>
        {/* Signal summary */}
        <div className="card p-3">
          <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Signal · {activePair} {activeTF}</div>
          {signal ? (
            <>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-sm font-bold px-3 py-1 rounded-full"
                  style={{
                    color: signal.signal === 'BUY' ? 'var(--green)' : signal.signal === 'SELL' ? 'var(--red)' : 'var(--amber)',
                    background: signal.signal === 'BUY' ? 'rgba(0,230,118,0.15)' : signal.signal === 'SELL' ? 'rgba(255,56,86,0.15)' : 'rgba(255,183,0,0.15)',
                    border: `1px solid ${signal.signal === 'BUY' ? 'rgba(0,230,118,0.4)' : signal.signal === 'SELL' ? 'rgba(255,56,86,0.4)' : 'rgba(255,183,0,0.4)'}`,
                  }}
                >
                  {signal.signal}
                </span>
                <div>
                  <div className="text-lg font-bold" style={{ color: 'var(--t1)' }}>{signal.confidence}%</div>
                  <div className="text-xs" style={{ color: 'var(--t3)' }}>confidence</div>
                </div>
              </div>
              <SRLevel label="Entry" value={signal.entry ?? '—'} color="var(--acc)" />
              <SRLevel label="Take Profit" value={signal.takeProfit ?? '—'} color="var(--green)" />
              <SRLevel label="Stop Loss" value={signal.stopLoss ?? '—'} color="var(--red)" />
              <SRLevel label="R/R Ratio" value={signal.riskReward ?? '—'} color="var(--amber)" />
              <SRLevel label="Time Horizon" value={signal.timeHorizon ?? '—'} color="var(--t1)" />
            </>
          ) : (
            <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>No signal</div>
          )}
        </div>

        {/* Technical indicators */}
        <div className="card p-3 flex-1 overflow-auto">
          <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Indicators</div>
          {indicators.length === 0
            ? <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>—</div>
            : indicators.map((ind: any, i: number) => (
              <div key={i} className="flex justify-between py-1.5 text-xs" style={{ borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--t2)' }}>{ind.name}</span>
                <span className="font-mono-num" style={{ color: 'var(--t1)' }}>{String(ind.value)}</span>
              </div>
            ))
          }
        </div>

        {/* AI Reasoning */}
        {signal?.reasoning && (
          <div className="card p-3">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>AI Reasoning</div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--t2)' }}>{signal.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
