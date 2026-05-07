'use client';

import { useEffect, useState } from 'react';
import { getCurrentPrice } from '../services/chart.service';

const POLL_MS = 15_000;

export function useLivePrices(pairs: string[]): Record<string, number> {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const pairsKey = [...pairs].sort().join(',');

  useEffect(() => {
    if (!pairsKey) return;

    const fetchAll = async () => {
      const results: Record<string, number> = {};
      await Promise.allSettled(
        pairsKey.split(',').filter(Boolean).map(async (pair) => {
          try {
            const res = await getCurrentPrice(pair);
            const price = res.data?.data?.price;
            if (price != null) results[pair] = price;
          } catch {}
        })
      );
      if (Object.keys(results).length > 0) {
        setPrices((prev) => ({ ...prev, ...results }));
      }
    };

    fetchAll();
    const id = setInterval(fetchAll, POLL_MS);
    return () => clearInterval(id);
  }, [pairsKey]);

  return prices;
}
