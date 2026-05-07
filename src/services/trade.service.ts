import api from './api';

export function getTrades(filters?: Record<string, any>) {
  return api.get('/trades', { params: filters });
}

export function getTradeById(id: string) {
  return api.get(`/trades/${id}`);
}

export function createTrade(data: any) {
  return api.post('/trades', data);
}

export function updateTrade(id: string, data: any) {
  return api.put(`/trades/${id}`, data);
}

export function deleteTrade(id: string) {
  return api.delete(`/trades/${id}`);
}

export function reviewTrade(id: string) {
  return api.post(`/trades/${id}/review`);
}
