import api from './api';

export function getSignal(pair: string, timeframe: string) {
  return api.get(`/signal/${encodeURIComponent(pair)}`, { params: { timeframe } });
}

export function getSignalHistory(pair: string) {
  return api.get(`/signal/history/${encodeURIComponent(pair)}`);
}
