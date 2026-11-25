'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, User } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('owner@acme.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient<{
        user: User;
        organizationId: string;
        role: string;
        accessToken: string;
        refreshToken: string;
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      login(data.accessToken, data.refreshToken, data.organizationId, data.role, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const setPreset = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 bg-brand-500 rounded-xl items-center justify-center font-bold text-white text-xl shadow-lg shadow-brand-500/40 mb-3">
          WS
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">WorkSphere Sign In</h2>
        <p className="mt-2 text-sm text-slate-400">
          Or{' '}
          <Link href="/register" className="font-medium text-brand-400 hover:text-brand-300">
            register a new organization
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-800 py-8 px-6 shadow-xl border border-slate-700 sm:rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 rounded-lg shadow-md text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition disabled:opacity-60"
            >
              {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Role Fillers */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Evaluator Role Logins
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setPreset('admin@worksphere.io', 'Password123!')}
                className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-brand-500 text-left transition"
              >
                <div className="font-semibold text-brand-400">Platform Admin</div>
                <div className="text-[11px] text-slate-400">admin@worksphere.io</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('owner@acme.com', 'Password123!')}
                className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-brand-500 text-left transition"
              >
                <div className="font-semibold text-emerald-400">Acme Owner</div>
                <div className="text-[11px] text-slate-400">owner@acme.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('pm@acme.com', 'Password123!')}
                className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-brand-500 text-left transition"
              >
                <div className="font-semibold text-amber-400">Acme PM</div>
                <div className="text-[11px] text-slate-400">pm@acme.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('dev@acme.com', 'Password123!')}
                className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-brand-500 text-left transition"
              >
                <div className="font-semibold text-sky-400">Acme Member</div>
                <div className="text-[11px] text-slate-400">dev@acme.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('auditor@acme.com', 'Password123!')}
                className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-brand-500 text-left transition"
              >
                <div className="font-semibold text-purple-400">Acme Auditor</div>
                <div className="text-[11px] text-slate-400">auditor@acme.com</div>
              </button>

              <button
                type="button"
                onClick={() => setPreset('owner@globex.com', 'Password123!')}
                className="p-2 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-brand-500 text-left transition"
              >
                <div className="font-semibold text-rose-400">Globex (Tenant B)</div>
                <div className="text-[11px] text-slate-400">owner@globex.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
