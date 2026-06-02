import api from './api';

export function getPortfolioRisk() {
  return api.get('/portfolio/risk');
}

export function getBehaviorReport(days = 90) {
  return api.get('/portfolio/behavior', { params: { days } });
}

export function getDailyBriefing() {
  return api.get('/portfolio/briefing');
}
