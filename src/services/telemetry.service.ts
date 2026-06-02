import api from './api';

export function getPerformanceReport(days = 90) {
  return api.get('/telemetry/performance', { params: { days } });
}

export function getRegimeComparison(days = 90) {
  return api.get('/telemetry/regime-comparison', { params: { days } });
}

export function getRegimeWeights() {
  return api.get('/telemetry/regime-weights');
}

export function getBiasImpact(days = 90) {
  return api.get('/telemetry/bias', { params: { days } });
}

export function getSetupClusters(days = 90) {
  return api.get('/telemetry/clusters', { params: { days } });
}

export function runMonteCarlo(params: {
  days?: number;
  iterations?: number;
  balance?: number;
}) {
  return api.get('/analytics/montecarlo', { params });
}

export function exportTradesCSV() {
  return api.get('/telemetry/export/trades.csv', { responseType: 'blob' });
}

export function exportPerformanceHTML() {
  return api.get('/telemetry/export/performance.html', { responseType: 'text' });
}
