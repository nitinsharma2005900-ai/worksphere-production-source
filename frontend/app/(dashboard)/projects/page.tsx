'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { FolderKanban, Plus, ArrowRight, Calendar, CheckCircle2 } from 'lucide-react';

export default function ProjectsPage() {
  const { currentOrgId, role } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [description, setDescription] = useState('');

  const loadProjects = () => {
    if (!currentOrgId) return;
    setLoading(true);
    apiClient<any[]>('/projects')
      .then(setProjects)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProjects();
  }, [currentOrgId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/projects', {
        method: 'POST',
        body: JSON.stringify({ name, key: key.toUpperCase(), description })
      });
      setShowModal(false);
      setName('');
      setKey('');
      setDescription('');
      loadProjects();
    } catch (err: any) {
      alert(err.message || 'Error creating project');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Projects Directory</h1>
          <p className="text-sm text-slate-500">Track and manage all organizational initiatives and repositories.</p>
        </div>

        {role !== 'AUDITOR' && (
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/30 transition"
          >
            <Plus className="h-4 w-4" /> New Project
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-500">Loading projects...</div>
      ) : projects.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200">
          <FolderKanban className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No projects created yet</h3>
          <p className="text-sm text-slate-500 mt-1">Get started by creating your first organizational project.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded">
                    {p.key}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {p.status}
                  </span>
                </div>
                <h3 className="font-bold text-base text-slate-900 mb-1">{p.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4">{p.description || 'No description provided.'}</p>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span className="font-semibold">{p.progressPercent || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4">
                  <div className="bg-brand-500 h-full rounded-full" style={{ width: `${p.progressPercent || 0}%` }}></div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
                  <span className="text-slate-400">{p.taskCount || 0} Tasks</span>
                  <Link href={`/projects/${p.id}`} className="font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
                    Details <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Cloud Security Pipeline"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Project Key (2-6 chars)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={key}
                  onChange={e => setKey(e.target.value.toUpperCase())}
                  placeholder="e.g. SEC"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5 uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Project goals and deliverables..."
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
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
