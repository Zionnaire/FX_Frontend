import api from './api';

export function getSignal(pair: string, timeframe: string, style: 'scalp' | 'swing' = 'swing') {
  return api.get(`/signal/${encodeURIComponent(pair)}`, { params: { timeframe, style } });
}

export function getSignalHistory(pair: string) {
  return api.get(`/signal/history/${encodeURIComponent(pair)}`);
}
