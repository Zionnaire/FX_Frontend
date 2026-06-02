import api from './api';

export function createChallenge(data: {
  firm_name: string;
  phase: string;
  account_size: number;
  daily_loss_limit_pct: number;
  max_drawdown_pct: number;
  profit_target_pct: number;
  min_trading_days?: number;
  max_trading_days?: number;
}) {
  return api.post('/propfirm', data);
}

export function getChallengeStatus() {
  return api.get('/propfirm/status');
}

export function getChallengeHistory() {
  return api.get('/propfirm/history');
}
