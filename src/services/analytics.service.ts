import api from './api';

export function getStats(params?: { startDate?: string; endDate?: string; pair?: string }) {
  return api.get('/analytics/stats', { params });
}

export function getPnlCurve(params?: { startDate?: string; endDate?: string }) {
  return api.get('/analytics/pnl-curve', { params });
}

export function getByPair(params?: { startDate?: string; endDate?: string }) {
  return api.get('/analytics/by-pair', { params });
}
