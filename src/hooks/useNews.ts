'use client';

import { useEffect, useState } from 'react';
import * as newsService from '../services/news.service';

export function useNews(pair: string) {
  const [news, setNews] = useState<any[]>([]);
  const [calendar, setCalendar] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNews = async () => {
    setLoading(true);
    try {
      const [newsResponse, calendarResponse] = await Promise.all([
        newsService.getNews(pair),
        newsService.getEconomicCalendar(),
      ]);
      setNews(newsResponse.data.data);
      setCalendar(calendarResponse.data.data);
    } catch (err) {
      setError('Failed to load news and calendar');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!pair) return;
    fetchNews();
  }, [pair]);

  return { news, calendar, loading, error, refetch: fetchNews };
}
