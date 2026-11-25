'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { GitFork, Plus, Calendar, CheckCircle2 } from 'lucide-react';

export default function MilestonesPage() {
  const { currentOrgId, role } = useAuth();
  const [milestones, setMilestones] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');

  const loadData = () => {
    if (!currentOrgId) return;
    setLoading(true);
    Promise.all([apiClient<any[]>('/milestones'), apiClient<any[]>('/projects')])
      .then(([mList, pList]) => {
        setMilestones(mList);
        setProjects(pList);
        if (pList.length > 0 && !projectId) setProjectId(pList[0].id);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/milestones', {
        method: 'POST',
        body: JSON.stringify({ projectId, title, description })
      });
      setShowModal(false);
      setTitle('');
      setDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Error creating milestone');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Project Milestones</h1>
          <p className="text-sm text-slate-500">Track delivery gates and release checkpoints.</p>
        </div>

        {role !== 'AUDITOR' && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/30 transition"
          >
            <Plus className="h-4 w-4" /> Add Milestone
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading milestones...</div>
      ) : milestones.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <GitFork className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No milestones tracked</h3>
          <p className="text-sm text-slate-500 mt-1">Define milestones to group and deliver project stages.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {milestones.map(m => (
            <div key={m.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-base">{m.title}</span>
                <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                  {m.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">{m.description || 'No description provided.'}</p>
              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Created: {new Date(m.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Add Milestone</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Project</label>
                <select
                  required
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Beta Release 1.0"
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
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
