'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const MAX_PULL = 72;
const THRESHOLD = 65;

export default function PullToRefresh({ onRefresh, children }: Props) {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const containerRef  = useRef<HTMLDivElement>(null);
  const startYRef     = useRef(0);
  const isPullingRef  = useRef(false);
  const pullYRef      = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Find the closest scrollable ancestor to check scrollTop
    const findScrollParent = (): HTMLElement | null => {
      let node = el.parentElement;
      while (node && node !== document.body) {
        const { overflowY } = window.getComputedStyle(node);
        if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') return node;
        node = node.parentElement;
      }
      return null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current) return;
      const scrollParent = findScrollParent();
      if (scrollParent && scrollParent.scrollTop > 0) return;
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPullingRef.current) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy <= 0) { isPullingRef.current = false; return; }
      e.preventDefault();
      const next = Math.min(dy * 0.4, MAX_PULL);
      pullYRef.current = next;
      setPullY(next);
    };

    const handleTouchEnd = async () => {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;
      const reached = pullYRef.current >= THRESHOLD;
      setPullY(0);
      pullYRef.current = 0;
      if (reached) {
        setRefreshing(true);
        refreshingRef.current = true;
        await onRefresh();
        setRefreshing(false);
        refreshingRef.current = false;
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove',  handleTouchMove,  { passive: false });
    el.addEventListener('touchend',   handleTouchEnd);

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove',  handleTouchMove);
      el.removeEventListener('touchend',   handleTouchEnd);
    };
  }, [onRefresh]);

  const isActive = pullY > 0 || refreshing;
  const isAnimating = !isPullingRef.current;

  return (
    <div ref={containerRef} className="relative min-h-full">
      {/* Pull / refresh indicator */}
      <div
        className="pointer-events-none absolute inset-x-0 flex justify-center z-20"
        style={{
          top: -44,
          height: 44,
          opacity: isActive ? 1 : 0,
          transform: `translateY(${refreshing ? 44 : pullY}px)`,
          transition: isAnimating ? 'transform 0.25s ease, opacity 0.2s' : 'none',
        }}
      >
        <div
          className={refreshing ? 'animate-ptr-spin' : ''}
          style={{
            width: 22,
            height: 22,
            marginTop: 11,
            border: '2px solid var(--border2)',
            borderTopColor: 'var(--acc)',
            borderRadius: '50%',
            transform: refreshing ? undefined : `rotate(${(pullY / MAX_PULL) * 180}deg)`,
          }}
        />
      </div>

      {/* Content — translates down while pulling */}
      <div
        style={{
          transform: pullY > 0 ? `translateY(${pullY}px)` : undefined,
          transition: isAnimating && pullY === 0 ? 'transform 0.25s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
