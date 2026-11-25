'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { Users, Plus, Shield, User } from 'lucide-react';

export default function TeamsPage() {
  const { currentOrgId, role } = useAuth();
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const loadTeams = () => {
    if (!currentOrgId) return;
    setLoading(true);
    apiClient<any[]>('/teams')
      .then(setTeams)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTeams();
  }, [currentOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/teams', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
      setShowModal(false);
      setName('');
      setDescription('');
      loadTeams();
    } catch (err: any) {
      alert(err.message || 'Error creating team');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Teams & Departments</h1>
          <p className="text-sm text-slate-500">Organize developers, managers, and stakeholders into operational units.</p>
        </div>

        {role !== 'AUDITOR' && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/30 transition"
          >
            <Plus className="h-4 w-4" /> Create Team
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading teams...</div>
      ) : teams.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No teams created</h3>
          <p className="text-sm text-slate-500 mt-1">Create teams to organize access and workload.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {teams.map(t => (
            <div key={t.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-base">{t.name}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {t.memberCount || 0} Members
                </span>
              </div>
              <p className="text-xs text-slate-500">{t.description || 'General organizational unit.'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Team</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Team Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Platform Infrastructure"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                  rows={3}
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
