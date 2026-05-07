import api from './api';

export function getAlerts() {
  return api.get('/alerts');
}

export function createAlert(data: {
  pair: string;
  condition: string;
  type: 'buy' | 'sell' | 'info';
  targetValue?: number;
  targetPattern?: string;
  enabled?: boolean;
}) {
  return api.post('/alerts', data);
}

export function updateAlert(
  id: string,
  data: Partial<{
    pair: string;
    condition: string;
    type: 'buy' | 'sell' | 'info';
    targetValue: number;
    targetPattern: string;
    enabled: boolean;
  }>,
) {
  return api.put(`/alerts/${id}`, data);
}

export function toggleAlert(id: string) {
  return api.put(`/alerts/${id}/toggle`);
}

export function deleteAlert(id: string) {
  return api.delete(`/alerts/${id}`);
}
