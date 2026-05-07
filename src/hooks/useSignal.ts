'use client';

import { useEffect, useState } from 'react';
import { usePair } from './usePair';
import * as signalService from '../services/signal.service';

export function useSignal() {
  const { activePair, activeTF } = usePair();
  const [signal, setSignal] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSignal = async () => {
    setLoading(true);
    try {
      const response = await signalService.getSignal(activePair, activeTF);
      setSignal(response.data.data);
    } catch (err) {
      setError('Failed to load signal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignal();
    const interval = setInterval(fetchSignal, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [activePair, activeTF]);

  return { signal, loading, error, refetch: fetchSignal };
}
