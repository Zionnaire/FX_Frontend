'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { getAccessToken } from '../services/api';

export interface WSEvent {
  event: string;
  data: unknown;
  timestamp: string;
}

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<WSEvent | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const token = getAccessToken();
    if (!token) return;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? '';
    // Convert http(s):// → ws(s)://
    const wsUrl = baseUrl.replace(/^http/, 'ws').replace(/\/api$/, '') + `/ws?token=${token}`;

    try {
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => setConnected(true);

      ws.current.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data) as WSEvent;
          setLastEvent(parsed);
        } catch { /* ignore malformed frames */ }
      };

      ws.current.onclose = () => {
        setConnected(false);
        // Auto-reconnect after 5 seconds
        reconnectTimer.current = setTimeout(() => connect(), 5_000);
      };

      ws.current.onerror = () => ws.current?.close();
    } catch { /* browser may block WS during SSR */ }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      ws.current?.close();
    };
  }, [connect]);

  return { connected, lastEvent };
}
