'use client';

import { useState } from 'react';
import * as scannerService from '../services/scanner.service';

export function useScanner() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async (style: 'swing' | 'scalp' = 'swing') => {
    setLoading(true);
    setError(null);
    try {
      const res = await scannerService.scanPairs(style);
      setData(res.data.data);
    } catch {
      setError('Scan failed — check connection');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, scan };
}
