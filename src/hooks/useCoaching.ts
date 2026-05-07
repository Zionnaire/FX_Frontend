'use client';

import { useState, useCallback } from 'react';
import api from '../services/api';

export interface TradingProfileData {
  totalTrades:        number;
  winRate:            number;
  profitFactor:       number;
  avgRR:              number;
  byPair:             { pair: string; count: number; winRate: number; netPnL: number; buyWinRate: number; sellWinRate: number }[];
  bySession:          { session: string; count: number; winRate: number; netPnL: number }[];
  byDay:              { day: string; count: number; winRate: number }[];
  buyWinRate:         number;
  sellWinRate:        number;
  avgWinDurationMin:  number;
  avgLossDurationMin: number;
  holdingTendency:    string;
  recentStreak:       { type: string; count: number };
  last10WinRate:      number;
  bestPair:           string | null;
  worstPair:          string | null;
  bestSession:        string | null;
  bestDay:            string | null;
}

export interface CoachingData {
  profile:       TradingProfileData;
  insights:      string[];
  topSuggestion: string;
  cached:        boolean;
  generatedAt?:  string;
}

export function useCoaching() {
  const [coaching,  setCoaching]  = useState<CoachingData | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const fetchCoaching = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/analytics/coaching', {
        params: forceRefresh ? { refresh: 'true' } : {},
      });
      setCoaching(res.data.data);
    } catch {
      setError('Failed to load coaching data');
    } finally {
      setLoading(false);
    }
  }, []);

  return { coaching, loading, error, fetchCoaching };
}
