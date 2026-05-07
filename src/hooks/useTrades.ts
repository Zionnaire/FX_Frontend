'use client';

import { useEffect, useState } from 'react';
import * as tradeService from '../services/trade.service';

export function useTrades() {
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTrades = async () => {
    setLoading(true);
    try {
      const response = await tradeService.getTrades();
      setTrades(response.data.data ?? []);
    } catch (err) {
      setError('Failed to load trades');
    } finally {
      setLoading(false);
    }
  };

  const createTrade = async (trade: any) => {
    const response = await tradeService.createTrade(trade);
    setTrades((prev) => [response.data.data, ...prev]);
  };

  const updateTrade = async (id: string, trade: any) => {
    const response = await tradeService.updateTrade(id, trade);
    setTrades((prev) => prev.map((item) => (item._id === id ? response.data.data : item)));
  };

  const deleteTrade = async (id: string) => {
    await tradeService.deleteTrade(id);
    setTrades((prev) => prev.filter((item) => item._id !== id));
  };

  useEffect(() => {
    fetchTrades();
  }, []);

  return { trades, loading, error, fetchTrades, createTrade, updateTrade, deleteTrade };
}
