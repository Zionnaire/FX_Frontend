import api from './api';

export function uploadDocument(formData: FormData) {
  return api.post('/rag/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getDocuments() {
  return api.get('/rag/documents');
}

export function deleteDocument(id: string) {
  return api.delete(`/rag/documents/${id}`);
}

export function queryKnowledgeBase(question: string) {
  return api.post('/rag/query', { question });
}

export function addManualEntry(text: string, type: string, pair: string) {
  return api.post('/rag/manual', { text, type, pair });
}

export function getAutoFeed() {
  return api.get('/rag/auto-feed');
}

export function triggerCalendarIngest() {
  return api.post('/rag/auto-feed/calendar');
}
