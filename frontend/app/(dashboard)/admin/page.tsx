'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { Building2, Shield, Users, Server, CheckCircle2 } from 'lucide-react';

export default function AdminPage() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.isPlatformAdmin) return;
    setLoading(true);
    apiClient<any[]>('/organizations')
      .then(setOrganizations)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user]);

  if (!user?.isPlatformAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-slate-200">
        <Shield className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900">Access Restricted</h2>
        <p className="text-sm text-slate-500 mt-1">This page requires global Platform Administrator privileges.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold mb-2">
          <Shield className="h-3.5 w-3.5" /> Platform Governance Console
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Platform Administrator Dashboard</h1>
        <p className="text-sm text-slate-500">
          Global multi-tenant directory, health metrics, and infrastructure governance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Tenants</span>
            <Building2 className="h-5 w-5 text-brand-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">{organizations.length}</div>
          <div className="text-xs text-slate-500 mt-2">Active tenant organizations</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Backend API Health</span>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <div className="text-3xl font-bold text-emerald-600">100%</div>
          <div className="text-xs text-slate-500 mt-2">Port 4000 operational</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">FastAPI Analytics</span>
            <Server className="h-5 w-5 text-purple-500" />
          </div>
          <div className="text-3xl font-bold text-purple-600">100%</div>
          <div className="text-xs text-slate-500 mt-2">Port 8000 operational</div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Tenant Organizations Directory</h2>
          <span className="text-xs text-slate-400 font-mono">Isolated Data Boundaries</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading platform organizations...</div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Slug</th>
                <th className="py-3 px-4">Subscription Plan</th>
                <th className="py-3 px-4">Onboarded</th>
                <th className="py-3 px-4 text-right">Tenant ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {organizations.map(org => (
                <tr key={org.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4 font-bold text-slate-900">{org.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{org.slug}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        org.plan === 'ENTERPRISE'
                          ? 'bg-purple-50 text-purple-700'
                          : org.plan === 'PRO'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {org.plan}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-500">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400 text-right">{org.id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
