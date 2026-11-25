'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, User } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { Building2, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';

function RegisterForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const invite = searchParams.get('invite');
    if (invite) {
      setInvitationToken(invite);
    }
  }, [searchParams]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiClient<{
        user: User;
        organizationId: string;
        role: string;
        accessToken: string;
        refreshToken: string;
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name,
          email,
          password,
          organizationName: invitationToken ? undefined : organizationName,
          invitationToken: invitationToken || undefined
        })
      });

      login(data.accessToken, data.refreshToken, data.organizationId, data.role, data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-800 py-8 px-6 shadow-xl border border-slate-700 sm:rounded-2xl sm:px-10">
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {invitationToken && (
        <div className="mb-4 p-3 rounded-lg bg-brand-500/10 border border-brand-500/20 text-brand-300 text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span>Joining organization via invitation link</span>
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Full Name</label>
          <input
            type="text"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Sarah Connor"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Work Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="sarah@cyberdyne.com"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Minimum 8 characters"
            className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
        </div>

        {!invitationToken && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Organization Name</label>
            <input
              type="text"
              required
              value={organizationName}
              onChange={e => setOrganizationName(e.target.value)}
              placeholder="Acme Innovations"
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center items-center gap-2 mt-2 py-2.5 px-4 rounded-lg shadow-md text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 transition disabled:opacity-60"
        >
          {loading ? 'Creating Organization...' : 'Complete Onboarding'} <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-12 w-12 bg-brand-500 rounded-xl items-center justify-center font-bold text-white text-xl shadow-lg shadow-brand-500/40 mb-3">
          WS
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">Create your WorkSphere Account</h2>
        <p className="mt-2 text-sm text-slate-400">
          Already registered?{' '}
          <Link href="/login" className="font-medium text-brand-400 hover:text-brand-300">
            Sign in here
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense fallback={<div className="text-white text-center py-8">Loading form...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </div>
  );
}
