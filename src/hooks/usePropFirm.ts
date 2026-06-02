'use client';

import { useEffect, useState } from 'react';
import * as propFirmService from '../services/propfirm.service';

export function usePropFirm() {
  const [status, setStatus] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const res = await propFirmService.getChallengeStatus();
      setStatus(res.data.data);
    } catch (err: any) {
      if (err?.response?.status !== 404) setError('Failed to load challenge');
      setStatus(null);
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await propFirmService.getChallengeHistory();
      setHistory(res.data.data?.challenges ?? []);
    } catch { /* non-fatal */ }
  };

  const createChallenge = async (payload: any) => {
    const res = await propFirmService.createChallenge(payload);
    await fetchStatus();
    await fetchHistory();
    return res.data.data;
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchStatus(), fetchHistory()]);
      setLoading(false);
    })();
  }, []);

  return { status, history, loading, error, createChallenge, refetch: fetchStatus };
}
