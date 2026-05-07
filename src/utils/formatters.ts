import { format } from 'date-fns';

export function formatPrice(value: number, pair: string): string {
  if (pair === 'XAU/USD' || value > 100) {
    return value.toFixed(2);
  }
  return value.toFixed(4);
}

export function formatPnl(value: number): string {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}$${Math.abs(value).toFixed(2)}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(date: string | number | Date): string {
  return format(new Date(date), 'MMM dd HH:mm');
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const parts = [];
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
}
