'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { usePair } from '../hooks/usePair';
import { useAutoTrade } from '../hooks/useAutoTrade';
import TradeConfirmModal from './TradeConfirmModal';
import { PAIRS, TIMEFRAMES } from '../utils/constants';
import { useTrades } from '../hooks/useTrades';
import { useLivePrices } from '../hooks/useLivePrices';

const PUBLIC_PATHS = ['/login', '/register'];

const NAV_ITEMS = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/signals',
    label: 'Signals',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    href: '/trades',
    label: 'Trades',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" />
      </svg>
    ),
  },
  {
    href: '/analytics',
    label: 'Analytics',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.21 15.89A10 10 0 1 1 8 2.83" /><path d="M22 12A10 10 0 0 0 12 2v10z" />
      </svg>
    ),
  },
  {
    href: '/news',
    label: 'News',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
        <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
      </svg>
    ),
  },
  {
    href: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    href: '/rag',
    label: 'AI Brain',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4c0 1.5-.8 2.8-2 3.5V11h1a3 3 0 0 1 3 3v1a3 3 0 0 1-3 3h-1v.5a2.5 2.5 0 0 1-5 0V18H8a3 3 0 0 1-3-3v-1a3 3 0 0 1 3-3h1V9.5C7.8 8.8 7 7.5 7 6a4 4 0 0 1 4-4h1Z" />
        <circle cx="9.5" cy="14.5" r="0.5" fill="currentColor" />
        <circle cx="14.5" cy="14.5" r="0.5" fill="currentColor" />
      </svg>
    ),
  },
];

const LOGOUT_ICON = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function calcUpnl(pair: string, type: string, entry: number, price: number, size: number): number {
  const dir = type === 'BUY' ? 1 : -1;
  let pnl: number;
  if (pair === 'USD/JPY')      pnl = dir * (price - entry) / price * 100_000 * size;
  else if (pair === 'XAU/USD') pnl = dir * (price - entry) * 100 * size;
  else                          pnl = dir * (price - entry) * 100_000 * size;
  return Math.round(pnl * 100) / 100;
}

function FloatingPnLBadge() {
  const { trades }  = useTrades();
  const openTrades  = trades.filter((t) => t.exit == null);
  const pairs       = [...new Set(openTrades.map((t) => t.pair as string))];
  const prices      = useLivePrices(pairs);
  const ready       = Object.keys(prices).length > 0;

  if (openTrades.length === 0) return null;

  const total = openTrades.reduce((sum, t) => {
    const p = prices[t.pair];
    return p != null ? sum + calcUpnl(t.pair, t.type, t.entry, p, t.size) : sum;
  }, 0);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded"
      style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
      <span className="text-xs" style={{ color: 'var(--t3)' }}>Float</span>
      {ready ? (
        <span className="text-xs font-bold font-mono"
          style={{ color: total >= 0 ? 'var(--green)' : 'var(--red)' }}>
          {(total >= 0 ? '+$' : '-$') + Math.abs(total).toFixed(2)}
        </span>
      ) : (
        <span className="text-xs font-mono" style={{ color: 'var(--t3)' }}>…</span>
      )}
    </div>
  );
}

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs text-t2">{time}</span>;
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const { addToast } = useToast();
  const { activePair, activeTF, setActivePair, setActiveTF } = usePair();

  const { pendingTrade, dismissTrade, confirmTrade, isConfirming } = useAutoTrade();

  const cleanPath = pathname.replace(/\/$/, '') || '/';
  const isPublicPath = PUBLIC_PATHS.includes(cleanPath);

  useEffect(() => {
    if (!isLoading && !user && !isPublicPath) {
      router.push('/login');
    }
  }, [user, isLoading, isPublicPath, router]);

  const handleLogout = async () => {
    try {
      await logout();
      addToast('Logged out', 'success');
    } catch {
      addToast('Logout failed', 'error');
    }
  };

  if (isPublicPath) return <>{children}</>;

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center" style={{ background: 'var(--bg)' }}>
        <div className="h-8 w-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--acc)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  if (!user) return null;

  const pageLabel = NAV_ITEMS.find((n) => n.href === cleanPath)?.label ?? '';
  const userInitial = (user?.name || user?.email || 'U')[0].toUpperCase();

  return (
    <div className="flex h-screen w-screen overflow-hidden" style={{ background: 'var(--bg)' }}>
      <TradeConfirmModal
        trade={pendingTrade}
        onConfirm={confirmTrade}
        onDismiss={dismissTrade}
        isConfirming={isConfirming}
      />

      {/* ── Desktop sidebar (hidden on mobile) ───────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col items-center py-4 gap-1 flex-shrink-0"
        style={{ width: 54, background: 'var(--bg2)', borderRight: '1px solid var(--border)' }}
      >
        {/* Logo */}
        <div className="mb-3 flex items-center justify-center" style={{ width: 34, height: 34 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="var(--acc)" opacity="0.9" />
            <path d="M2 17l10 5 10-5" stroke="var(--acc)" strokeWidth="1.5" fill="none" />
            <path d="M2 12l10 5 10-5" stroke="var(--acc)" strokeWidth="1.5" fill="none" opacity="0.5" />
          </svg>
        </div>

        {NAV_ITEMS.map((item) => {
          const active = cleanPath === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className="flex items-center justify-center rounded-lg transition-all duration-150"
              style={{
                width: 38, height: 38,
                color: active ? 'var(--acc)' : 'var(--t3)',
                background: active ? 'rgba(0,200,240,0.1)' : 'transparent',
              }}
            >
              {item.icon}
            </Link>
          );
        })}

        <div className="flex-1" />
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center justify-center rounded-lg transition-all duration-150"
          style={{ width: 38, height: 38, color: 'var(--t3)' }}
        >
          {LOGOUT_ICON}
        </button>
      </aside>

      {/* ── Main column ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>

          {/* Main header row */}
          <div className="flex items-center gap-2 px-3 md:px-4" style={{ height: 48 }}>

            {/* Page label — desktop only */}
            <span className="hidden md:block text-xs font-semibold tracking-widest uppercase flex-shrink-0"
              style={{ color: 'var(--t3)', width: 80 }}>
              {pageLabel}
            </span>

            {/* Pair tabs — scrollable */}
            <div className="flex gap-1 overflow-x-auto no-scrollbar flex-shrink-0">
              {PAIRS.map((p) => (
                <button
                  key={p}
                  onClick={() => setActivePair(p)}
                  className="pill text-xs flex-shrink-0"
                  style={
                    activePair === p
                      ? { background: 'var(--acc)', color: '#000', borderColor: 'var(--acc)', padding: '3px 8px', borderRadius: 20, border: '1px solid', fontWeight: 600, fontSize: 11 }
                      : { background: 'transparent', color: 'var(--t2)', borderColor: 'var(--border2)', padding: '3px 8px', borderRadius: 20, border: '1px solid', fontWeight: 600, fontSize: 11, cursor: 'pointer' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>

            {/* TF buttons — desktop only (shown in sub-row on mobile) */}
            <div className="hidden md:flex gap-1 ml-2">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setActiveTF(tf)}
                  className="text-xs font-semibold rounded px-2 py-1 transition-all"
                  style={
                    activeTF === tf
                      ? { background: 'rgba(0,200,240,0.15)', color: 'var(--acc)', border: '1px solid var(--acc)' }
                      : { background: 'transparent', color: 'var(--t3)', border: '1px solid transparent' }
                  }
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex-1" />

            {/* Simulation balance — desktop only */}
            {user?.simulationBalance != null && (
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded"
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--t3)' }}>Balance</span>
                <span
                  className="text-xs font-bold font-mono"
                  style={{ color: user.simulationBalance >= 10000 ? 'var(--green)' : user.simulationBalance >= 5000 ? 'var(--amber)' : 'var(--red)' }}
                >
                  ${Number(user.simulationBalance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Floating PnL — desktop only */}
            <div className="hidden md:block"><FloatingPnLBadge /></div>

            {/* LIVE badge — desktop only */}
            <div className="hidden md:flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full"
                style={{ background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulse-green 2s infinite' }} />
              <span className="text-xs font-semibold" style={{ color: 'var(--green)' }}>LIVE</span>
            </div>

            {/* Clock — large screens only */}
            <div className="hidden lg:block"><LiveClock /></div>

            {/* User avatar */}
            <div
              className="flex items-center justify-center rounded-full text-xs font-bold ml-1 flex-shrink-0"
              style={{ width: 28, height: 28, background: 'var(--acc)', color: '#000' }}
              title={user?.name || user?.email}
            >
              {userInitial}
            </div>
          </div>

          {/* TF sub-row — mobile only */}
          <div className="flex md:hidden items-center gap-1 px-3 pb-2 overflow-x-auto no-scrollbar">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf}
                onClick={() => setActiveTF(tf)}
                className="text-xs font-semibold rounded px-2.5 py-1 transition-all flex-shrink-0"
                style={
                  activeTF === tf
                    ? { background: 'rgba(0,200,240,0.15)', color: 'var(--acc)', border: '1px solid var(--acc)' }
                    : { background: 'transparent', color: 'var(--t3)', border: '1px solid var(--border2)' }
                }
              >
                {tf}
              </button>
            ))}
          </div>
        </header>

        {/* ── Page content ─────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-2 md:p-4 pb-16 md:pb-4" style={{ background: 'var(--bg)' }}>
          {children}
        </main>

        {/* ── Mobile bottom nav (hidden on desktop) ─────────────────────────── */}
        <nav
          className="flex md:hidden items-center flex-shrink-0"
          style={{ height: 56, background: 'var(--bg2)', borderTop: '1px solid var(--border)' }}
        >
          {NAV_ITEMS.map((item) => {
            const active = cleanPath === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all"
                style={{ color: active ? 'var(--acc)' : 'var(--t3)' }}
              >
                {item.icon}
                <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.03em' }}>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all"
            style={{ color: 'var(--t3)' }}
          >
            {LOGOUT_ICON}
            <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.03em' }}>Logout</span>
          </button>
        </nav>

      </div>
    </div>
  );
}
