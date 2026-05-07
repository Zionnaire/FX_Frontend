'use client';

import { useEffect, useRef, useState } from 'react';
import { usePair } from './usePair';
import { useAuth } from './useAuth';
import { useToast } from '../context/ToastContext';
import * as signalService from '../services/signal.service';
import * as tradeService from '../services/trade.service';

const CONFIDENCE_FLOOR = 72;

export function useAutoTrade() {
  const { activePair, activeTF } = usePair();
  const { user } = useAuth();
  const { addToast } = useToast();
  const [pendingTrade, setPendingTrade] = useState<any>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const lastPromptedId = useRef<string | null>(null);

  const checkSignal = async () => {
    if (!user) return;
    try {
      const response = await signalService.getSignal(activePair, activeTF);
      const signal = response.data.data;

      if (
        signal?._id &&
        signal._id !== lastPromptedId.current &&
        signal.signal !== 'HOLD' &&
        (signal.autoTradeRecommended || signal.confidence >= CONFIDENCE_FLOOR)
      ) {
        lastPromptedId.current = signal._id;
        setPendingTrade(signal);
      }
    } catch {
      // silent — don't interrupt the user if signal fetch fails
    }
  };

  useEffect(() => {
    checkSignal();
    const id = setInterval(checkSignal, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [activePair, activeTF, user]);

  const dismissTrade = () => setPendingTrade(null);

  const confirmTrade = async (size: number) => {
    if (!pendingTrade) return;
    setIsConfirming(true);
    try {
      await tradeService.createTrade({
        pair:        pendingTrade.pair,
        type:        pendingTrade.signal,
        entry:       pendingTrade.entry,
        stopLoss:    pendingTrade.stopLoss,
        takeProfit:  pendingTrade.takeProfit,
        size,
        notes:       `AI Auto (${pendingTrade.confidence}% conf): ${pendingTrade.reasoning?.slice(0, 120)}`,
        aiSignalId:  pendingTrade._id,
        source:      'ai_auto',
      });
      addToast(`${pendingTrade.signal} trade placed on ${pendingTrade.pair}`, 'success');
      setPendingTrade(null);
    } catch {
      addToast('Failed to place trade — check connection', 'error');
    } finally {
      setIsConfirming(false);
    }
  };

  return { pendingTrade, dismissTrade, confirmTrade, isConfirming };
}
