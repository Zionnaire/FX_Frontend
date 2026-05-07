'use client';

import { useEffect, useState, useCallback } from 'react';
import * as ragService from '../services/rag.service';

export function useRag() {
  const [documents,    setDocuments]    = useState<any[]>([]);
  const [autoFeedDocs, setAutoFeedDocs] = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [autoLoading,  setAutoLoading]  = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const fetchRagDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await ragService.getDocuments();
      setDocuments(response.data.data ?? []);
    } catch {
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAutoFeed = useCallback(async () => {
    setAutoLoading(true);
    try {
      const response = await ragService.getAutoFeed();
      setAutoFeedDocs(response.data.data ?? []);
    } catch {
      // silent
    } finally {
      setAutoLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRagDocuments();
    fetchAutoFeed();
  }, [fetchRagDocuments, fetchAutoFeed]);

  const createDocument = async (formData: FormData) => {
    const response = await ragService.uploadDocument(formData);
    setDocuments((prev) => [response.data.data, ...prev]);
  };

  const deleteDocument = async (id: string) => {
    await ragService.deleteDocument(id);
    setDocuments((prev) => prev.filter((doc) => doc._id !== id));
    setAutoFeedDocs((prev) => prev.filter((doc) => doc._id !== id));
  };

  const queryKnowledge = async (question: string) => {
    const response = await ragService.queryKnowledgeBase(question);
    return response.data.data;
  };

  const addManualEntry = async (text: string, type: string, pair?: string) => {
    const response = await ragService.addManualEntry(text, type, pair ?? '');
    setDocuments((prev) => [response.data.data, ...prev]);
  };

  const triggerCalendarIngest = async (): Promise<number> => {
    const response = await ragService.triggerCalendarIngest();
    await fetchAutoFeed();
    return response.data.data?.eventsIngested ?? 0;
  };

  return {
    documents,
    autoFeedDocs,
    loading,
    autoLoading,
    error,
    fetchRagDocuments,
    fetchAutoFeed,
    createDocument,
    deleteDocument,
    queryKnowledge,
    addManualEntry,
    triggerCalendarIngest,
  };
}
