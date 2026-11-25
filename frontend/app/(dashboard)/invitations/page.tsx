'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { UserPlus, Mail, Shield, Trash2, CheckCircle2 } from 'lucide-react';

export default function InvitationsPage() {
  const { currentOrgId, role } = useAuth();
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ORG_OWNER' | 'PROJECT_MANAGER' | 'TEAM_MEMBER' | 'AUDITOR'>('TEAM_MEMBER');
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadInvitations = () => {
    if (!currentOrgId) return;
    setLoading(true);
    apiClient<any[]>('/invitations')
      .then(setInvitations)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadInvitations();
  }, [currentOrgId]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSuccessMsg(null);

    try {
      const result = await apiClient<{ emailMode: 'mock' | 'resend' }>('/invitations', {
        method: 'POST',
        body: JSON.stringify({ email, role: inviteRole })
      });
      setSuccessMsg(result.emailMode === 'mock'
        ? `Invitation created for ${email}, but no email was sent. Configure Resend to deliver it.`
        : `Invitation created for ${email}; email delivery is queued.`);
      setEmail('');
      loadInvitations();
    } catch (err: any) {
      alert(err.message || 'Error sending invitation');
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;
    try {
      await apiClient(`/invitations/${id}`, { method: 'DELETE' });
      loadInvitations();
    } catch (err: any) {
      alert(err.message || 'Error revoking invitation');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employee Invitations</h1>
        <p className="text-sm text-slate-500">Invite new team members, managers, or external auditors.</p>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Invite Form */}
      {role !== 'AUDITOR' && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-brand-500" /> Send New Invitation
          </h2>
          <form onSubmit={handleSendInvite} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="colleague@company.com"
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Assign Role</label>
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as any)}
                className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
              >
                <option value="TEAM_MEMBER">Team Member</option>
                <option value="PROJECT_MANAGER">Project Manager</option>
                <option value="ORG_OWNER">Organization Owner</option>
                <option value="AUDITOR">Auditor (Read-Only)</option>
              </select>
            </div>

            <div className="sm:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-lg shadow-sm shadow-brand-500/30 transition disabled:opacity-60"
              >
                {sending ? 'Sending...' : 'Send Invitation Email'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invitations Table */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
        <h2 className="text-base font-bold text-slate-900 mb-4">Pending & Past Invitations</h2>
        {loading ? (
          <div className="p-6 text-center text-slate-500 text-sm">Loading invitations...</div>
        ) : invitations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No invitations found for this organization.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {invitations.map(inv => (
              <div key={inv.id} className="py-3.5 flex items-center justify-between text-sm">
                <div>
                  <div className="font-semibold text-slate-800">{inv.email}</div>
                  <div className="text-xs text-slate-400">
                    Role: <span className="font-medium text-slate-600">{inv.role}</span> • Status:{' '}
                    <span
                      className={`font-semibold ${
                        inv.status === 'PENDING'
                          ? 'text-amber-600'
                          : inv.status === 'ACCEPTED'
                          ? 'text-emerald-600'
                          : 'text-slate-400'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>

                {role !== 'AUDITOR' && inv.status === 'PENDING' && (
                  <button
                    onClick={() => handleRevoke(inv.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                    title="Cancel Invitation"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
