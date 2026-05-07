'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const { addToast } = useToast();
  const [formData, setFormData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      addToast('Passwords do not match', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await register(formData.name, formData.email, formData.password);
    } catch (error: any) {
      addToast(error?.response?.data?.message ?? 'Registration failed', 'error');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2L2 7l10 5 10-5-10-5Z" fill="var(--acc)" />
              <path d="M2 17l10 5 10-5" stroke="var(--acc)" strokeWidth="1.5" fill="none" />
              <path d="M2 12l10 5 10-5" stroke="var(--acc)" strokeWidth="1.5" fill="none" opacity="0.5" />
            </svg>
            <span className="text-2xl font-bold" style={{ color: 'var(--t1)' }}>AURA <span style={{ color: 'var(--acc)' }}>FOREX</span></span>
          </div>
          <p className="text-sm" style={{ color: 'var(--t2)' }}>Create your trading account</p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t3)' }}>Full Name</label>
              <input type="text" className="inp" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="John Doe" required autoComplete="name" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t3)' }}>Email</label>
              <input type="email" className="inp" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="you@example.com" required autoComplete="email" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t3)' }}>Password</label>
              <input type="password" className="inp" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="••••••••" required minLength={6} autoComplete="new-password" />
            </div>
            <div>
              <label className="text-xs mb-1.5 block" style={{ color: 'var(--t3)' }}>Confirm Password</label>
              <input type="password" className="inp" value={formData.confirmPassword} onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} placeholder="••••••••" required autoComplete="new-password" />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded font-semibold text-sm transition-all disabled:opacity-50"
              style={{ background: 'var(--acc)', color: '#000' }}
            >
              {submitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <p className="mt-4 text-center text-xs" style={{ color: 'var(--t3)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--acc)' }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
