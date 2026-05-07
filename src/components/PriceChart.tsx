'use client';

import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { C } from '../utils/chartColors';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Props {
  data: Bar[];
  height?: number;
}

export default function PriceChart({ data, height = 320 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { color: C.bg3 }, textColor: C.t2 },
      grid: { vertLines: { color: C.border }, horzLines: { color: C.border } },
      rightPriceScale: { borderColor: C.border },
      timeScale: { borderColor: C.border, timeVisible: true, secondsVisible: false },
      crosshair: { mode: 1 },
      width: containerRef.current.clientWidth,
      height,
    });

    const candles = chart.addCandlestickSeries({
      upColor: C.green, downColor: C.red,
      borderUpColor: C.green, borderDownColor: C.red,
      wickUpColor: C.green, wickDownColor: C.red,
    });

    if (data.length > 0) {
      candles.setData(data as any);
      chart.timeScale().fitContent();
    }

    const onResize = () => {
      if (containerRef.current) {
        chart.applyOptions({ width: containerRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      chart.remove();
    };
  }, [data, height]);

  if (data.length === 0) {
    return (
      <div
        style={{ height, background: C.bg3, color: C.t3 }}
        className="flex items-center justify-center text-xs rounded"
      >
        No chart data available
      </div>
    );
  }

  return <div ref={containerRef} className="w-full rounded overflow-hidden" />;
}
