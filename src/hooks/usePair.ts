'use client';

import { usePairContext } from '../context/PairContext';

export function usePair() {
  return usePairContext();
}
