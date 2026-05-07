'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { PAIRS, TIMEFRAMES } from '../utils/constants';

interface PairContextValue {
  activePair: string;
  activeTF: string;
  setActivePair: (pair: string) => void;
  setActiveTF: (tf: string) => void;
}

const PairContext = createContext<PairContextValue | undefined>(undefined);

export function PairProvider({ children }: { children: React.ReactNode }) {
  const [activePair, setActivePairState] = useState(PAIRS[0]);
  const [activeTF, setActiveTFState] = useState(TIMEFRAMES[3]);

  useEffect(() => {
    const storedPair = window.localStorage.getItem('auraPair');
    const storedTF = window.localStorage.getItem('auraTF');
    if (storedPair) setActivePairState(storedPair);
    if (storedTF) setActiveTFState(storedTF);
  }, []);

  const setActivePair = (pair: string) => {
    setActivePairState(pair);
    window.localStorage.setItem('auraPair', pair);
  };

  const setActiveTF = (tf: string) => {
    setActiveTFState(tf);
    window.localStorage.setItem('auraTF', tf);
  };

  return (
    <PairContext.Provider value={{ activePair, activeTF, setActivePair, setActiveTF }}>
      {children}
    </PairContext.Provider>
  );
}

export function usePairContext() {
  const context = useContext(PairContext);
  if (!context) throw new Error('usePairContext must be used inside PairProvider');
  return context;
}
