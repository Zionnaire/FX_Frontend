'use client';

import React from 'react';
import { useToast } from '../context/ToastContext';

const COLORS: Record<string, string> = {
  success: 'var(--green)',
  error:   'var(--red)',
  warning: 'var(--amber)',
  info:    'var(--acc)',
};

const ICONS: Record<string, React.ReactNode> = {
  success: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  error:   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />,
  warning: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />,
  info:    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
};

export default function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const color = COLORS[toast.type] || COLORS.info;
        return (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm animate-slide-in"
            style={{
              background: 'var(--bg3)',
              border: `1px solid ${color}44`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.4)`,
              minWidth: 260,
              maxWidth: 360,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} style={{ flexShrink: 0 }}>
              {ICONS[toast.type]}
            </svg>
            <span className="flex-1 text-xs font-medium" style={{ color: 'var(--t1)' }}>{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-xs ml-1 transition-all"
              style={{ color: 'var(--t3)' }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
