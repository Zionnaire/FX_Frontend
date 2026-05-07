'use client';

import { useEffect, useState } from 'react';
import * as analyticsService from '../services/analytics.service';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [statsRes, byPairRes] = await Promise.all([
        analyticsService.getStats(),
        analyticsService.getByPair(),
      ]);
      setAnalytics({
        ...statsRes.data.data,
        performanceByPair: byPairRes.data.data,
      });
    } catch (err) {
      setError('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return { analytics, loading, error, refetch: fetchAnalytics };
}
