import api from './api';

export function getOHLCV(pair: string, timeframe: string) {
  return api.get(`/chart/ohlcv/${encodeURIComponent(pair)}`, { params: { timeframe } });
}

export function getCurrentPrice(pair: string) {
  return api.get(`/chart/price/${encodeURIComponent(pair)}`);
}

export function getSupportResistance(pair: string) {
  return api.get(`/chart/support/${encodeURIComponent(pair)}`);
}

export function getFibonacci(pair: string) {
  return api.get(`/chart/fibonacci/${encodeURIComponent(pair)}`);
}
