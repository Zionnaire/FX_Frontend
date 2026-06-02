import api from './api';

export function scanPairs(style: 'swing' | 'scalp' = 'swing') {
  return api.get('/scanner', { params: { style } });
}
