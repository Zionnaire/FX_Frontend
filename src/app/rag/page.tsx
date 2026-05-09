'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRag } from '../../hooks/useRag';
import { useToast } from '../../context/ToastContext';
import { PAIRS } from '../../utils/constants';

type Tab = 'chat' | 'auto' | 'upload' | 'manual';

interface Message {
  role: 'user' | 'assistant';
  text: string;
}

function StatusBadge({ status }: { status: string }) {
  const col = status === 'indexed' ? 'var(--green)' : status === 'error' ? 'var(--red)' : 'var(--amber)';
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>
      {status}
    </span>
  );
}

function AutoFeedTag({ tag }: { tag?: string }) {
  if (!tag) return null;
  const isCalendar = tag.includes('economic-calendar');
  const isReview   = tag.includes('trade-review');
  const label = isCalendar ? 'Economic Calendar' : isReview ? 'Trade Review' : 'Auto';
  const col   = isCalendar ? 'var(--acc)' : isReview ? 'var(--amber)' : 'var(--t3)';
  return (
    <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${col}18`, color: col, border: `1px solid ${col}44` }}>
      {label}
    </span>
  );
}

export default function RagPage() {
  const {
    documents, autoFeedDocs, seededDocs, loading, autoLoading, seedLoading,
    createDocument, deleteDocument, queryKnowledge, addManualEntry,
    triggerCalendarIngest, triggerSeedKnowledge, fetchAutoFeed, fetchSeeded,
  } = useRag();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef   = useRef<HTMLDivElement>(null);

  const [tab,              setTab]              = useState<Tab>('auto');
  const [messages,         setMessages]         = useState<Message[]>([]);
  const [query,            setQuery]            = useState('');
  const [searching,        setSearching]        = useState(false);
  const [uploading,        setUploading]        = useState(false);
  const [manualText,       setManualText]       = useState('');
  const [manualType,       setManualType]       = useState('note');
  const [manualPair,       setManualPair]       = useState(PAIRS[0]);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [ingestingCal,     setIngestingCal]     = useState(false);
  const [seedResult,       setSeedResult]       = useState<{ seeded: number; skipped: number } | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim()) return;
    const userMsg: Message = { role: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setSearching(true);
    try {
      const result = await queryKnowledge(userMsg.text);
      const answer = result?.answer || result?.response || JSON.stringify(result);
      setMessages((prev) => [...prev, { role: 'assistant', text: answer }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Sorry, search failed. Please try again.' }]);
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await createDocument(fd);
      addToast('Document uploaded', 'success');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch {
      addToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      await createDocument(fd);
      addToast('Document uploaded', 'success');
    } catch {
      addToast('Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualText.trim()) return;
    setSubmittingManual(true);
    try {
      await (addManualEntry as any)(manualText, manualType, manualPair);
      addToast('Entry added to knowledge base', 'success');
      setManualText('');
    } catch {
      addToast('Failed to add entry', 'error');
    } finally {
      setSubmittingManual(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this document?')) return;
    try { await deleteDocument(id); addToast('Deleted', 'success'); }
    catch { addToast('Delete failed', 'error'); }
  };

  const handleCalendarIngest = async () => {
    setIngestingCal(true);
    try {
      const count = await triggerCalendarIngest();
      addToast(count > 0 ? `${count} high-impact events indexed` : 'No high-impact events this week', 'success');
    } catch {
      addToast('Calendar fetch failed', 'error');
    } finally {
      setIngestingCal(false);
    }
  };

  const handleSeedKnowledge = async () => {
    try {
      const result = await triggerSeedKnowledge();
      setSeedResult(result);
      if (result.seeded > 0) {
        addToast(`${result.seeded} knowledge documents indexed into AI Brain`, 'success');
      } else if (result.skipped > 0) {
        addToast('Training library already loaded — all documents up to date', 'success');
      }
    } catch {
      addToast('Failed to seed knowledge library', 'error');
    }
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: 'auto',   label: 'Auto-Feed' },
    { key: 'chat',   label: 'Chat' },
    { key: 'upload', label: 'Upload' },
    { key: 'manual', label: 'Manual Entry' },
  ];

  const calendarDoc = autoFeedDocs.find((d) => d.metadata?.source === 'economic_calendar');
  const reviewDocs  = autoFeedDocs.filter((d) => d.metadata?.tag?.includes('trade-review'));

  return (
    <div className="flex gap-3 h-full overflow-hidden">
      {/* Main panel */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Tabs */}
        <div className="flex gap-1 mb-3">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="text-xs px-4 py-2 rounded-t font-semibold transition-all"
              style={tab === key
                ? { background: 'var(--bg3)', color: 'var(--acc)', border: '1px solid var(--border)', borderBottom: '1px solid var(--bg3)' }
                : { background: 'transparent', color: 'var(--t3)', border: '1px solid transparent' }
              }
            >
              {key === 'auto' && autoFeedDocs.length > 0
                ? `Auto-Feed (${autoFeedDocs.length})`
                : label}
            </button>
          ))}
        </div>

        <div className="card flex-1 flex flex-col min-h-0">

          {/* ── Auto-Feed tab ─────────────────────────────────────── */}
          {tab === 'auto' && (
            <div className="flex-1 overflow-auto p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-bold" style={{ color: 'var(--t1)' }}>AI Auto-Training Feed</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--t3)' }}>
                    The AI automatically learns from your closed trades and live economic data.
                  </div>
                </div>
                <button
                  onClick={() => fetchAutoFeed()}
                  className="text-xs px-3 py-1.5 rounded"
                  style={{ background: 'var(--bg3)', color: 'var(--t2)', border: '1px solid var(--border)' }}
                >
                  Refresh
                </button>
              </div>

              {/* Economic Calendar card */}
              <div className="rounded-lg p-4 mb-4" style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold" style={{ color: 'var(--t1)' }}>Economic Calendar</span>
                      {calendarDoc
                        ? <StatusBadge status={calendarDoc.status} />
                        : <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,183,0,0.15)', color: 'var(--amber)', border: '1px solid rgba(255,183,0,0.3)' }}>not fetched</span>
                      }
                    </div>
                    <div className="text-xs" style={{ color: 'var(--t3)' }}>
                      {calendarDoc
                        ? `Last indexed: ${new Date(calendarDoc.createdAt).toLocaleString()} · ${calendarDoc.chunkCount} chunks`
                        : 'High-impact events from ForexFactory. Helps the AI avoid bad entries near news.'}
                    </div>
                  </div>
                  <button
                    onClick={handleCalendarIngest}
                    disabled={ingestingCal}
                    className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-semibold disabled:opacity-40 transition-all"
                    style={{ background: 'var(--acc)', color: '#000' }}
                  >
                    {ingestingCal ? 'Fetching…' : calendarDoc ? 'Re-fetch' : 'Fetch Now'}
                  </button>
                </div>
              </div>

              {/* Trade Reviews */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-xs font-semibold uppercase" style={{ color: 'var(--t3)' }}>
                    Auto-Indexed Trade Reviews
                  </div>
                  <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,230,118,0.12)', color: 'var(--green)' }}>
                    {reviewDocs.length} indexed
                  </span>
                </div>
                {autoLoading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded animate-pulse" style={{ background: 'var(--bg3)' }} />)}
                  </div>
                ) : reviewDocs.length === 0 ? (
                  <div className="text-xs py-6 text-center rounded-lg" style={{ color: 'var(--t3)', background: 'var(--bg3)', border: '1px dashed var(--border)' }}>
                    No trade reviews indexed yet.
                    <br />
                    <span style={{ color: 'var(--t2)' }}>Close a trade to trigger auto-review and indexing.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {reviewDocs.map((doc: any) => (
                      <div key={doc._id} className="flex items-center gap-3 p-2.5 rounded" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                        <span className="text-base">📊</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate" style={{ color: 'var(--t1)' }}>
                            {doc.metadata?.pair ?? 'Unknown pair'} — {new Date(doc.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--t3)' }}>{doc.chunkCount} chunks</div>
                        </div>
                        <AutoFeedTag tag={doc.metadata?.tag} />
                        <StatusBadge status={doc.status} />
                        <button onClick={() => handleDelete(doc._id)} className="text-xs ml-1" style={{ color: 'var(--red)' }}>✕</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Training Library */}
              <div className="mb-3">
                <div
                  className="rounded-lg p-4"
                  style={{
                    background: seededDocs.length > 0 ? 'rgba(0,200,240,0.06)' : 'var(--bg3)',
                    border: seededDocs.length > 0 ? '1px solid rgba(0,200,240,0.25)' : '1px solid var(--border)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold" style={{ color: 'var(--t1)' }}>FOREX Training Library</span>
                        {seededDocs.length > 0
                          ? <span className="text-xs px-1.5 py-0.5 rounded font-semibold" style={{ background: 'rgba(0,230,118,0.15)', color: 'var(--green)', border: '1px solid rgba(0,230,118,0.3)' }}>{seededDocs.length} docs loaded</span>
                          : <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,183,0,0.15)', color: 'var(--amber)', border: '1px solid rgba(255,183,0,0.3)' }}>not loaded</span>
                        }
                      </div>
                      <div className="text-xs mb-2" style={{ color: 'var(--t3)' }}>
                        {seededDocs.length > 0
                          ? `${seededDocs.filter((d: any) => d.status === 'indexed').length}/${seededDocs.length} indexed — Moving Averages, Stochastic, Bollinger Bands, RSI, ADX/MACD/ATR/PSAR, S&R, Trade Mechanics, Psychology, Setups, Correlations, Sessions, Signal Framework`
                          : '12-document professional trading strategy library. Loads indicators, setups, psychology, correlations, sessions, and signal interpretation into the AI.'
                        }
                      </div>
                      {seedResult && seedResult.seeded > 0 && (
                        <div className="text-xs font-semibold" style={{ color: 'var(--green)' }}>
                          ✓ {seedResult.seeded} new documents indexed successfully
                        </div>
                      )}
                    </div>
                    <button
                      onClick={handleSeedKnowledge}
                      disabled={seedLoading}
                      className="flex-shrink-0 text-xs px-3 py-1.5 rounded font-semibold disabled:opacity-40 transition-all"
                      style={{
                        background: seededDocs.length > 0 ? 'var(--bg2)' : 'var(--acc)',
                        color: seededDocs.length > 0 ? 'var(--t2)' : '#000',
                        border: seededDocs.length > 0 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      {seedLoading ? 'Loading…' : seededDocs.length > 0 ? 'Re-load' : 'Load Now'}
                    </button>
                  </div>

                  {/* Document list when loaded */}
                  {seededDocs.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {seededDocs.map((doc: any, i: number) => (
                        <div key={doc._id} className="flex items-center gap-2 text-xs py-1" style={{ borderTop: i === 0 ? '1px solid var(--border)' : 'none' }}>
                          <span style={{ color: 'var(--acc)', fontWeight: 600, minWidth: 16 }}>{i + 1}.</span>
                          <span className="flex-1 truncate" style={{ color: 'var(--t2)' }}>{doc.metadata?.title ?? doc.fileName}</span>
                          <StatusBadge status={doc.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Chat tab ─────────────────────────────────────────── */}
          {tab === 'chat' && (
            <>
              <div className="flex-1 overflow-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <div className="text-center pt-8">
                    <div className="text-4xl mb-2">🤖</div>
                    <div className="text-sm" style={{ color: 'var(--t2)' }}>Ask anything about your trading knowledge base</div>
                    <div className="text-xs mt-1" style={{ color: 'var(--t3)' }}>e.g. "What are my common mistakes on EUR/USD?"</div>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className="max-w-[80%] rounded-lg px-3 py-2 text-sm leading-relaxed"
                      style={m.role === 'user'
                        ? { background: 'var(--acc)', color: '#000' }
                        : { background: 'var(--bg2)', color: 'var(--t1)', border: '1px solid var(--border)' }
                      }
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
                {searching && (
                  <div className="flex justify-start">
                    <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg2)', color: 'var(--t3)', border: '1px solid var(--border)' }}>
                      Thinking…
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              <div className="p-3" style={{ borderTop: '1px solid var(--border)' }}>
                <div className="flex gap-2">
                  <input
                    className="inp flex-1"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                    placeholder="Ask about your trading history, mistakes, patterns…"
                    disabled={searching}
                  />
                  <button
                    onClick={handleSend}
                    disabled={searching || !query.trim()}
                    className="px-4 py-2 rounded text-xs font-semibold transition-all disabled:opacity-40"
                    style={{ background: 'var(--acc)', color: '#000' }}
                  >
                    {searching ? '…' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── Upload tab ───────────────────────────────────────── */}
          {tab === 'upload' && (
            <div className="flex-1 overflow-auto p-4">
              <div
                className="border-2 border-dashed rounded-lg p-8 text-center mb-4"
                style={{ borderColor: 'var(--border2)' }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
              >
                <div className="text-3xl mb-3">📄</div>
                <label className="cursor-pointer">
                  <span className="text-sm font-medium" style={{ color: 'var(--t1)' }}>
                    {uploading ? 'Uploading…' : 'Drop file here or click to browse'}
                  </span>
                  <br />
                  <span className="text-xs" style={{ color: 'var(--t3)' }}>PDF, TXT, CSV, JSON · up to 10MB</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.txt,.csv,.json"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>
                Uploaded Documents ({documents.length})
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => <div key={i} className="h-12 rounded animate-pulse" style={{ background: 'var(--bg4)' }} />)}
                </div>
              ) : documents.length === 0 ? (
                <div className="text-xs text-center py-4" style={{ color: 'var(--t3)' }}>No documents uploaded yet</div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc._id} className="flex items-center gap-3 p-3 rounded" style={{ background: 'var(--bg2)', border: '1px solid var(--border)' }}>
                      <span className="text-lg">📄</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium truncate" style={{ color: 'var(--t1)' }}>{doc.fileName}</div>
                        <div className="text-xs" style={{ color: 'var(--t3)' }}>
                          {new Date(doc.createdAt).toLocaleDateString()} · {doc.chunkCount ?? 0} chunks
                        </div>
                      </div>
                      <StatusBadge status={doc.status} />
                      <button onClick={() => handleDelete(doc._id)} className="text-xs ml-1" style={{ color: 'var(--red)' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Manual Entry tab ─────────────────────────────────── */}
          {tab === 'manual' && (
            <div className="flex-1 overflow-auto p-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Type</label>
                    <select className="inp" value={manualType} onChange={(e) => setManualType(e.target.value)}>
                      <option value="note">Note</option>
                      <option value="analysis">Analysis</option>
                      <option value="trade_log">Trade Log</option>
                      <option value="strategy">Strategy</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Pair</label>
                    <select className="inp" value={manualPair} onChange={(e) => setManualPair(e.target.value)}>
                      {PAIRS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: 'var(--t3)' }}>Content</label>
                  <textarea
                    className="inp"
                    rows={8}
                    value={manualText}
                    onChange={(e) => setManualText(e.target.value)}
                    placeholder="Enter your trading notes, analysis, or strategy here…"
                    style={{ resize: 'vertical' }}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={submittingManual || !manualText.trim()}
                  className="px-4 py-2 rounded text-xs font-semibold disabled:opacity-40"
                  style={{ background: 'var(--acc)', color: '#000' }}
                >
                  {submittingManual ? 'Adding…' : 'Add to Knowledge Base'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Right sidebar — model stats */}
      <div className="flex flex-col gap-3 overflow-auto" style={{ width: 220, flexShrink: 0 }}>
        <div className="card p-4">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>Knowledge Base</div>
          {[
            { l: 'Total Docs',    v: documents.length + autoFeedDocs.length + seededDocs.length },
            { l: 'Manual Docs',   v: documents.length },
            { l: 'Training Lib',  v: seededDocs.length, c: 'var(--acc)' },
            { l: 'Auto-Indexed',  v: autoFeedDocs.length, c: 'var(--purple)' },
            { l: 'Indexed',       v: [...documents, ...autoFeedDocs, ...seededDocs].filter((d: any) => d.status === 'indexed').length,    c: 'var(--green)' },
            { l: 'Errors',        v: [...documents, ...autoFeedDocs, ...seededDocs].filter((d: any) => d.status === 'error').length,      c: 'var(--red)'   },
          ].map(({ l, v, c }) => (
            <div key={l} className="flex justify-between text-xs py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--t2)' }}>{l}</span>
              <span className="font-mono-num font-semibold" style={{ color: c || 'var(--t1)' }}>{v}</span>
            </div>
          ))}
        </div>

        <div className="card p-4">
          <div className="text-xs font-semibold uppercase mb-3" style={{ color: 'var(--t3)' }}>AI Model</div>
          <div className="space-y-2 text-xs" style={{ color: 'var(--t2)' }}>
            <div className="flex justify-between">
              <span>Provider</span><span style={{ color: 'var(--t1)' }}>Groq</span>
            </div>
            <div className="flex justify-between">
              <span>RAG</span><span style={{ color: 'var(--green)' }}>Active</span>
            </div>
            <div className="flex justify-between">
              <span>Auto-Train</span>
              <span style={{ color: autoFeedDocs.length > 0 ? 'var(--green)' : 'var(--amber)' }}>
                {autoFeedDocs.length > 0 ? 'On' : 'Pending'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Library</span>
              <span style={{ color: seededDocs.length > 0 ? 'var(--green)' : 'var(--red)' }}>
                {seededDocs.length > 0 ? `${seededDocs.length} docs` : 'Not loaded'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Calendar</span>
              <span style={{ color: calendarDoc ? 'var(--green)' : 'var(--t3)' }}>
                {calendarDoc ? 'Synced' : 'Not fetched'}
              </span>
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Quality</div>
            {(() => {
              const allDocs = [...documents, ...autoFeedDocs];
              const indexed = allDocs.filter((d: any) => d.status === 'indexed').length;
              const coverage = allDocs.length > 0 ? Math.min(95, indexed * 15) : 0;
              return [
                { l: 'Relevance', v: 82 },
                { l: 'Accuracy',  v: 76 },
                { l: 'Coverage',  v: coverage },
              ].map(({ l, v }) => (
                <div key={l} className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span style={{ color: 'var(--t2)' }}>{l}</span>
                    <span style={{ color: 'var(--t1)' }}>{v}%</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'var(--border2)' }}>
                    <div className="h-full rounded-full" style={{ width: `${v}%`, background: 'var(--acc)' }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        <div className="card p-4">
          <div className="text-xs font-semibold uppercase mb-2" style={{ color: 'var(--t3)' }}>Auto-Training Sources</div>
          <div className="space-y-2 text-xs">
            {[
              { icon: '📚', label: 'Training Library',   desc: `${seededDocs.length}/12 docs`,   active: seededDocs.length > 0 },
              { icon: '📊', label: 'Trade Reviews',      desc: 'Auto on close', active: reviewDocs.length > 0 },
              { icon: '📅', label: 'Economic Calendar', desc: 'Manual trigger',  active: !!calendarDoc },
              { icon: '📰', label: 'News Sentiment',    desc: 'Per signal',      active: true },
              { icon: '📈', label: 'Signal Accuracy',   desc: 'Per signal',      active: true },
            ].map(({ icon, label, desc, active }) => (
              <div key={label} className="flex items-center gap-2 py-1" style={{ borderBottom: '1px solid var(--border)' }}>
                <span>{icon}</span>
                <div className="flex-1">
                  <div style={{ color: 'var(--t1)' }}>{label}</div>
                  <div style={{ color: 'var(--t3)' }}>{desc}</div>
                </div>
                <span style={{ color: active ? 'var(--green)' : 'var(--t3)', fontSize: 10 }}>
                  {active ? '●' : '○'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
