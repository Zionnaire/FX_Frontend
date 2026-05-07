import api from './api';

export function getNews(pair: string) {
  return api.get(`/news/${encodeURIComponent(pair)}`);
}

export function getEconomicCalendar() {
  return api.get('/news/calendar');
}
