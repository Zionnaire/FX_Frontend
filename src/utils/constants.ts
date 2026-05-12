export const PAIRS = ['XAU/USD', 'GBP/USD', 'EUR/USD', 'USD/JPY'];
export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'];

export function getPriceFormat(pair: string): { type: 'price'; precision: number; minMove: number } {
  if (pair === 'XAU/USD') return { type: 'price', precision: 2, minMove: 0.01 };
  if (pair === 'USD/JPY')  return { type: 'price', precision: 3, minMove: 0.001 };
  return { type: 'price', precision: 5, minMove: 0.00001 }; // GBP/USD, EUR/USD
}

export const PAIR_COLORS: Record<string, string> = {
  'XAU/USD': '#1f2b55',
  'GBP/USD': '#0f4b8c',
  'EUR/USD': '#1a4570',
  'USD/JPY': '#0b3d91',
};

export const SIGNAL_COLORS: Record<string, string> = {
  BUY: '#0fdfa4',
  SELL: '#ff4d4f',
  HOLD: '#ffd166',
};
