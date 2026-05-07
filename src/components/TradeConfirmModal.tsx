'use client';

import React, { useState } from 'react';

interface Props {
  trade: any;
  onConfirm: (size: number) => Promise<void>;
  onDismiss: () => void;
  isConfirming: boolean;
}

export default function TradeConfirmModal({ trade, onConfirm, onDismiss, isConfirming }: Props) {
  const [size, setSize] = useState('0.01');

  if (!trade) return null;

  const isBuy       = trade.signal === 'BUY';
  const accentColor = isBuy ? 'var(--green)' : 'var(--red)';
  const slDist      = Math.abs(trade.entry - trade.stopLoss);
  const tpDist      = Math.abs(trade.takeProfit - trade.entry);
  const lotSize     = parseFloat(size) || 0.01;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(2px)' }}
    >
      <div
        className="rounded-xl w-full shadow-2xl flex flex-col"
        style={{
          maxWidth: 460,
          maxHeight: '90vh',
          background: 'var(--bg2)',
          border: `1px solid ${accentColor}44`,
        }}
      >
        {/* Coloured top bar */}
        <div className="h-1 w-full" style={{ background: accentColor }} />

        {/* Scrollable signal info */}
        <div className="px-6 pt-6 pb-3 overflow-y-auto flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-5">
            <span
              className="h-2 w-2 rounded-full flex-shrink-0"
              style={{ background: accentColor, boxShadow: `0 0 6px ${accentColor}` }}
            />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: accentColor }}>
              AI Trade Signal
            </span>
            {trade.autoTradeRecommended && (
              <span
                className="ml-auto text-xs font-semibold px-2 py-0.5 rounded"
                style={{ background: 'rgba(0,200,240,0.12)', color: 'var(--acc)' }}
              >
                High Confidence
              </span>
            )}
          </div>

          {/* Pair + direction + meta */}
          <div className="flex items-baseline gap-3 mb-1">
            <span className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>{trade.pair}</span>
            <span className="text-xl font-bold" style={{ color: accentColor }}>{trade.signal}</span>
          </div>
          <div className="flex gap-3 mb-5 text-xs" style={{ color: 'var(--t3)' }}>
            <span>{trade.timeframe}</span>
            <span>·</span>
            <span>{trade.timeHorizon}</span>
            <span>·</span>
            <span
              className="font-semibold px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(0,200,240,0.1)', color: 'var(--acc)' }}
            >
              {trade.confidence}% confident
            </span>
          </div>

          {/* Entry / TP / SL */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Entry',       value: trade.entry,      color: 'var(--t1)'   },
              { label: 'Take Profit', value: trade.takeProfit, color: 'var(--green)' },
              { label: 'Stop Loss',   value: trade.stopLoss,   color: 'var(--red)'  },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="rounded-lg p-3 text-center"
                style={{ background: 'var(--bg3)' }}
              >
                <div className="text-xs mb-1" style={{ color: 'var(--t3)' }}>{label}</div>
                <div className="text-sm font-bold font-mono" style={{ color }}>
                  {typeof value === 'number' ? value.toFixed(5) : value}
                </div>
              </div>
            ))}
          </div>

          {/* R:R + distances */}
          <div className="flex gap-4 mb-4 text-xs" style={{ color: 'var(--t3)' }}>
            <span>R:R <strong style={{ color: 'var(--t1)' }}>{trade.riskReward}</strong></span>
            <span>SL dist <strong style={{ color: 'var(--red)' }}>{slDist.toFixed(5)}</strong></span>
            <span>TP dist <strong style={{ color: 'var(--green)' }}>{tpDist.toFixed(5)}</strong></span>
          </div>

          {/* Reasoning */}
          <p
            className="text-xs leading-relaxed mb-4 p-3 rounded-lg"
            style={{ background: 'var(--bg3)', color: 'var(--t2)' }}
          >
            {trade.reasoning}
          </p>

          {/* Key risks */}
          {trade.keyRisks?.length > 0 && (
            <div>
              <div className="text-xs mb-2 font-semibold" style={{ color: 'var(--t3)' }}>Key Risks</div>
              <div className="flex flex-wrap gap-1.5">
                {trade.keyRisks.map((r: string, i: number) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded"
                    style={{ background: 'rgba(255,80,80,0.1)', color: 'var(--red)' }}
                  >
                    {r}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pinned footer — always visible */}
        <div className="px-6 pb-6 pt-3 flex-shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
          {/* Lot size input */}
          <div
            className="flex items-center gap-3 mb-4 p-3 rounded-lg"
            style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
          >
            <span className="text-xs font-semibold" style={{ color: 'var(--t2)' }}>Lot Size</span>
            <input
              type="number"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              min="0.01"
              step="0.01"
              disabled={isConfirming}
              className="w-24 text-sm font-mono px-2 py-1 rounded text-center"
              style={{
                background: 'var(--bg2)',
                color: 'var(--t1)',
                border: '1px solid var(--border2)',
                outline: 'none',
              }}
            />
            <span className="text-xs" style={{ color: 'var(--t3)' }}>lots</span>
            <span className="ml-auto text-xs font-mono" style={{ color: 'var(--t3)' }}>
              {lotSize.toFixed(2)} × 100k units
            </span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => onConfirm(lotSize)}
              disabled={isConfirming}
              className="flex-1 py-3 rounded-lg text-sm font-bold transition-all"
              style={{
                background: accentColor,
                color: '#000',
                opacity: isConfirming ? 0.65 : 1,
                cursor: isConfirming ? 'not-allowed' : 'pointer',
              }}
            >
              {isConfirming ? 'Placing trade…' : `Execute ${trade.signal}`}
            </button>
            <button
              onClick={onDismiss}
              disabled={isConfirming}
              className="flex-1 py-3 rounded-lg text-sm font-semibold transition-all"
              style={{
                background: 'var(--bg3)',
                color: 'var(--t2)',
                border: '1px solid var(--border)',
                cursor: isConfirming ? 'not-allowed' : 'pointer',
              }}
            >
              Pass
            </button>
          </div>

          <p className="text-center text-xs mt-3" style={{ color: 'var(--t3)' }}>
            This is a paper trade logged to your journal. No real money is moved.
          </p>
        </div>
      </div>
    </div>
  );
}
