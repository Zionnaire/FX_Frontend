'use client';

import { useState, useEffect, useCallback } from 'react';
import { getExecutions, approveExecution, rejectExecution, updateLots } from '../services/execution.service';

export interface PendingExecution {
  _id:             string;
  signalId:        string;
  pair:            string;
  direction:       'BUY' | 'SELL';
  entry:           number;
  stopLoss:        number;
  takeProfit:      number;
  lots:            number;
  riskPct:         number;
  riskReward:      string;
  pipsToSL:        number;
  pipsToTP:        number;
  confluenceScore: number;
  confidence:      number;
  reasoning:       string;
  entryType:       'MARKET' | 'LIMIT';
  status:          'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTING' | 'EXECUTED' | 'FAILED' | 'EXPIRED';
  mt5Ticket?:      number;
  fillPrice?:      number;
  approvalExpiresAt: string;
  createdAt:       string;
}

export function usePendingExecutions(enabled: boolean) {
  const [executions, setExecutions] = useState<PendingExecution[]>([]);
  const [loading, setLoading]       = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await getExecutions();
      setExecutions(res.data?.data ?? []);
    } catch {
      // silent — don't spam console on auth errors during polling
    }
  }, [enabled]);

  // Poll every 3 seconds when there's a pending approval, else every 10s
  useEffect(() => {
    if (!enabled) return;
    refresh();
    const hasPending = executions.some((e) => e.status === 'PENDING_APPROVAL');
    const interval = setInterval(refresh, hasPending ? 3_000 : 10_000);
    return () => clearInterval(interval);
  }, [enabled, refresh, executions.some((e) => e.status === 'PENDING_APPROVAL')]);

  const approve = useCallback(async (id: string) => {
    await approveExecution(id);
    await refresh();
  }, [refresh]);

  const reject = useCallback(async (id: string) => {
    await rejectExecution(id);
    await refresh();
  }, [refresh]);

  const setLots = useCallback(async (id: string, lots: number) => {
    await updateLots(id, lots);
    setExecutions((prev) =>
      prev.map((e) => e._id === id ? { ...e, lots } : e)
    );
  }, []);

  // First pending approval (the one to show the modal for)
  const pendingApproval = executions.find((e) => e.status === 'PENDING_APPROVAL') ?? null;

  return { executions, pendingApproval, loading, refresh, approve, reject, setLots };
}
