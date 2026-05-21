import api from './api';

export function getExecutions() {
  return api.get('/mt5/executions');
}

export function approveExecution(id: string) {
  return api.post(`/mt5/approve/${id}`);
}

export function rejectExecution(id: string) {
  return api.post(`/mt5/reject/${id}`);
}

export function updateLots(id: string, lots: number) {
  return api.patch(`/mt5/executions/${id}/lots`, { lots });
}

export function updateAutoTrade(settings: {
  enabled?: boolean;
  defaultRiskPct?: number;
  maxDailyLossPct?: number;
  maxDailyTrades?: number;
  minConfluence?: number;
  minConfidence?: number;
}) {
  return api.put('/user/autotrade', settings);
}

export function regenerateApiKey() {
  return api.post('/user/autotrade/apikey');
}
