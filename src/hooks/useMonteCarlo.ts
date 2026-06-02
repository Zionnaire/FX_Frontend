'use client';

import { useState } from 'react';
import * as telemetryService from '../services/telemetry.service';

export function useMonteCarlo() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (params: { days?: number; iterations?: number; balance?: number }) => {
    setLoading(true);
    setError(null);
    try {
      const res = await telemetryService.runMonteCarlo(params);
      setData(res.data.data);
    } catch {
      setError('Simulation failed');
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, run };
}
