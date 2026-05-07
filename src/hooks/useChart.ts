'use client';

import { useEffect, useState } from 'react';
import { usePair } from './usePair';
import * as chartService from '../services/chart.service';

const POLL_INTERVAL: Record<string, number> = {
  '1m':  60_000,
  '5m':  60_000,
  '15m': 3 * 60_000,
  '1h':  3 * 60_000,
  '4h':  10 * 60_000,
  '1d':  60 * 60_000,
};

export function useChart() {
  const { activePair, activeTF } = usePair();
  const [chart, setChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChart = async () => {
    setLoading(true);
    try {
      const response = await chartService.getOHLCV(activePair, activeTF);
      setChart(response.data.data);
      setError(null);
    } catch (err) {
      setError('Failed to load chart data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChart();
    const interval = setInterval(fetchChart, POLL_INTERVAL[activeTF] ?? 60_000);
    return () => clearInterval(interval);
  }, [activePair, activeTF]);

  return { chart, loading, error, refetch: fetchChart };
}
