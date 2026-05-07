'use client';

import { useEffect, useState } from 'react';
import * as alertService from '../services/alert.service';

export function useAlerts() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const response = await alertService.getAlerts();
      setAlerts(response.data.data);
    } catch (err) {
      setError('Failed to load alerts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const createAlert = async (data: Parameters<typeof alertService.createAlert>[0]) => {
    const response = await alertService.createAlert(data);
    setAlerts((prev) => [response.data.data, ...prev]);
  };

  const updateAlert = async (id: string, data: Parameters<typeof alertService.updateAlert>[1]) => {
    const response = await alertService.updateAlert(id, data);
    setAlerts((prev) => prev.map((a) => (a._id === id ? response.data.data : a)));
  };

  const toggleAlert = async (id: string) => {
    const response = await alertService.toggleAlert(id);
    setAlerts((prev) => prev.map((a) => (a._id === id ? response.data.data : a)));
  };

  const deleteAlert = async (id: string) => {
    await alertService.deleteAlert(id);
    setAlerts((prev) => prev.filter((a) => a._id !== id));
  };

  return { alerts, loading, error, fetchAlerts, createAlert, updateAlert, toggleAlert, deleteAlert };
}
