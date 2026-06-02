'use client';

import { useState } from 'react';
import { useScanner } from '../../hooks/useScanner';

const TIER_COLORS: Record<string, string> = {
  'A+': 'var(--acc)',
  'A':  'var(--green)',
  'B':  'var(--amber)',
  'C':  'var(--t3)',
};

const TIER_BG: Record<string, string> = {
  'A+': 'rgba(0,200,240,0.08)',
  'A':  'rgba(0,230,118,0.06)',
  'B':  'rgba(255,183,0,0.06)',
  'C':  'transparent',
};

function TierBadge({ tier }: { tier: string }) {
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold"
      style={{ color: TIER_COLORS[tier] ?? 'var(--t2)', background: TIER_BG[tier] ?? 'transparent', border: `1px solid ${TIER_COLORS[tier] ?? 'var(--border)'}` }}>
      {tier}
    </span>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const isBuy = signal === 'BUY';
  return (
    <span className="px-2 py-0.5 rounded text-xs font-bold"
      style={{ color: isBuy ? 'var(--green)' : 'var(--red)', background: isBuy ? 'rgba(0,230,118,0.08)' : 'rgba(255,56,86,0.08)' }}>
      {signal}
    </span>
  );
}

function ScanCard({ hit }: { hit: any }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: 'var(--bg3)', border: `1px solid ${hit.estimated_tier === 'A+' ? 'var(--acc)' : 'var(--border)'}` }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm" style={{ color: 'var(--t1)' }}>{hit.pair}</span>
          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--bg4)', color: 'var(--t2)' }}>{hit.timeframe}</span>
          <SignalBadge signal={hit.signal} />
        </div>
        <TierBadge tier={hit.estimated_tier} />
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs" style={{ color: 'var(--t2)' }}>
        <span>Confluence <span style={{ color: 'var(--t1)' }}>{hit.confluence_score}/10</span></span>
        <span>Session <span style={{ color: 'var(--t1)' }}>{hit.session}</span></span>
        <span>Regime <span style={{ color: 'var(--purple)' }}>{hit.regime}</span></span>
        <span style={{ color: hit.session_rating === 'PRIME' ? 'var(--green)' : hit.session_rating === 'ACTIVE' ? 'var(--amber)' : 'var(--t3)' }}>
          {hit.session_rating}
        </span>
      </div>

      {/* Reasons */}
      {hit.reasons?.length > 0 && (
        <div className="flex flex-col gap-1">
          {hit.reasons.slice(0, 3).map((r: string, i: number) => (
            <div key={i} className="flex items-start gap-1.5 text-xs" style={{ color: 'var(--t2)' }}>
              <span style={{ color: 'var(--acc)', marginTop: 1 }}>›</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )}

      {/* Bias */}
      <div className="flex items-center gap-1.5 text-xs">
        <span style={{ color: 'var(--t3)' }}>Bias aligned:</span>
        <span style={{ color: hit.bias_aligned ? 'var(--green)' : 'var(--red)' }}>
          {hit.bias_aligned ? '✓ Yes' : '✗ No'}
        </span>
      </div>
    </div>
  );
}

export default function ScannerPage() {
  const { data, loading, error, scan } = useScanner();
  const [style, setStyle] = useState<'swing' | 'scalp'>('swing');

  const handleScan = () => scan(style);

  const hits = data?.all_hits ?? [];
  const aPlus = hits.filter((h: any) => h.estimated_tier === 'A+');
  const rest  = hits.filter((h: any) => h.estimated_tier !== 'A+');

  return (
    <div className="flex flex-col gap-6 p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--t1)' }}>Setup Scanner</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--t2)' }}>
            Scans all 4 pairs simultaneously using the rule engine — no AI call required
          </p>
        </div>
        {data && (
          <div className="text-xs px-3 py-1.5 rounded" style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border)' }}>
            {data.scanned_at ? new Date(data.scanned_at).toLocaleTimeString() : ''}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          {(['swing', 'scalp'] as const).map((s) => (
            <button key={s} onClick={() => setStyle(s)}
              className="px-4 py-2 text-sm font-medium capitalize transition-colors"
              style={{
                background: style === s ? 'var(--acc)' : 'var(--bg3)',
                color: style === s ? 'var(--bg)' : 'var(--t2)',
              }}>
              {s}
            </button>
          ))}
        </div>

        <button onClick={handleScan} disabled={loading}
          className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-opacity"
          style={{ background: 'var(--acc)', color: 'var(--bg)', opacity: loading ? 0.6 : 1 }}>
          {loading ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
              Scanning…
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              Scan Now
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(255,56,86,0.08)', color: 'var(--red)', border: '1px solid rgba(255,56,86,0.2)' }}>
          {error}
        </div>
      )}

      {/* Summary bar */}
      {data && (
        <div className="flex gap-4 p-3 rounded-xl" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--acc)' }}>{data.setups_found}</div>
            <div className="text-xs" style={{ color: 'var(--t3)' }}>Setups</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--acc)' }}>{aPlus.length}</div>
            <div className="text-xs" style={{ color: 'var(--t3)' }}>A+ Quality</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--t2)' }}>{data.pairs_scanned}</div>
            <div className="text-xs" style={{ color: 'var(--t3)' }}>Scanned</div>
          </div>
          {data.best_setup && (
            <div className="ml-auto text-xs flex items-center gap-1.5" style={{ color: 'var(--t2)' }}>
              Best:
              <span style={{ color: 'var(--t1)', fontWeight: 600 }}>{data.best_setup.pair}</span>
              <SignalBadge signal={data.best_setup.signal} />
              <TierBadge tier={data.best_setup.estimated_tier} />
            </div>
          )}
        </div>
      )}

      {/* A+ Setups */}
      {aPlus.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--acc)' }}>
            A+ Setups — Auto-Trade Eligible
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {aPlus.map((hit: any, i: number) => <ScanCard key={i} hit={hit} />)}
          </div>
        </div>
      )}

      {/* Other setups */}
      {rest.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--t3)' }}>
            Other Setups
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {rest.map((hit: any, i: number) => <ScanCard key={i} hit={hit} />)}
          </div>
        </div>
      )}

      {/* Empty */}
      {data && hits.length === 0 && (
        <div className="text-center py-12 text-sm" style={{ color: 'var(--t3)' }}>
          No active setups found. Market may be in compression or out of session.
        </div>
      )}

      {/* Idle */}
      {!data && !loading && (
        <div className="text-center py-16 flex flex-col items-center gap-3" style={{ color: 'var(--t3)' }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <p className="text-sm">Select a style and click Scan Now to find active setups across all pairs</p>
        </div>
      )}
    </div>
  );
}
