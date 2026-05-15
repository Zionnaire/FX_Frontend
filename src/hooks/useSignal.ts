'use client';

import { useEffect, useState } from 'react';
import { usePair } from './usePair';
import * as signalService from '../services/signal.service';

export function useSignal(tradingStyle: 'scalp' | 'swing' = 'swing') {
  const { activePair, activeTF } = usePair();
  const [signal, setSignal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignal = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await signalService.getSignal(activePair, activeTF, tradingStyle);
      setSignal(response.data.data);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Failed to load signal';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignal();
    const interval = setInterval(fetchSignal, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activePair, activeTF, tradingStyle]);

  return { signal, loading, error, refetch: fetchSignal };
}
