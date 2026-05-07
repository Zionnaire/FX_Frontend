'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

export default function LoginPage() {
  const { login } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(formData.email, formData.password);
    } catch {
      addToast('Invalid email or password', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="var(--acc)" />
              <path d="M2 17l10 5 10-5" stroke="var(--acc)" strokeWidth="1.5" fill="none" />
              <path d="M2 12l10 5 10-5" stroke="var(--acc)" strokeWidth="1.5" fill="none" opacity="0.5" />
            </svg>
            <span className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>AURA <span style={{ color: 'var(--acc)' }}>FOREX</span></span>
          </div>
          <p className="text-sm" style={{ color: 'var(--t2)' }}>Sign in to your trading platform</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t3)' }}>Email</label>
              <input
                type="email"
                className="inp"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                required
                autoComplete="email"
              />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t3)' }}>Password</label>
              <input
                type="password"
                className="inp"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: 'var(--acc)', color: '#000' }}
            >
              {submitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs" style={{ color: 'var(--t3)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="font-semibold" style={{ color: 'var(--acc)' }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
