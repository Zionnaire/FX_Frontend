import { useEffect, useRef, useState } from 'react';
import { getCurrentPrice } from '../services/chart.service';

export function useRealtimePrice(pair: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);
  const prevRef = useRef<number | null>(null);

  useEffect(() => {
    if (!pair) return;

    const fetchPrice = async () => {
      try {
        const res = await getCurrentPrice(pair);
        const p: number | undefined = res.data?.data?.price;
        if (p == null) return;
        if (prevRef.current != null) {
          setDirection(p > prevRef.current ? 'up' : p < prevRef.current ? 'down' : null);
        }
        prevRef.current = p;
        setPrice(p);
      } catch {
        // silently skip failed polls
      }
    };

    fetchPrice();
    const id = setInterval(fetchPrice, 3000);
    return () => clearInterval(id);
  }, [pair]);

  return { price, direction };
}
