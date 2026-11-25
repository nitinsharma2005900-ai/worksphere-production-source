'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { User, Building, Shield, CheckCircle2 } from 'lucide-react';

export default function SettingsPage() {
  const { user, currentOrgId, role } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [success, setSuccess] = useState(false);

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Account & Organization Settings</h1>
        <p className="text-sm text-slate-500">Manage your profile, security credentials, and organization preferences.</p>
      </div>

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>Settings saved successfully.</span>
        </div>
      )}

      {/* User Profile Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <User className="h-4 w-4 text-brand-500" /> User Profile
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-lg p-2.5"
            />
          </div>
        </div>

        <div className="pt-2">
          <button
            onClick={() => setSuccess(true)}
            className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-xs transition"
          >
            Save Changes
          </button>
        </div>
      </div>

      {/* Tenant Organization Info Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <Building className="h-4 w-4 text-brand-500" /> Organization Membership
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-400">Current Role</div>
            <div className="font-semibold text-slate-900 mt-0.5">{role}</div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <div className="text-xs text-slate-400">Tenant Context ID</div>
            <div className="font-mono text-xs text-slate-700 mt-0.5">{currentOrgId}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
