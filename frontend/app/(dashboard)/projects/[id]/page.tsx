'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import { ArrowLeft, CheckCircle2, Clock, GitFork, ArrowRight, Plus } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const { currentOrgId, role } = useAuth();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !currentOrgId) return;
    setLoading(true);
    apiClient<any>(`/projects/${projectId}`)
      .then(setProject)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId, currentOrgId]);

  if (loading || !project) {
    return <div className="p-8 text-center text-slate-500">Loading project details...</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> Back to Projects Directory
      </Link>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="font-mono text-xs font-bold bg-brand-50 text-brand-600 px-2 py-0.5 rounded">
              {project.key}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {project.status}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{project.name}</h1>
          <p className="text-sm text-slate-500 mt-1">{project.description || 'No description provided.'}</p>
        </div>

        <Link
          href={`/tasks?projectId=${project.id}`}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm rounded-lg shadow-sm shadow-brand-500/30 transition"
        >
          Open Kanban Board <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tasks Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4">Tasks Breakdown</h2>
          <div className="space-y-3">
            {project.tasks?.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center">No tasks assigned to this project yet.</div>
            ) : (
              project.tasks?.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 text-sm">
                  <Link href={`/tasks/${t.id}`} className="font-medium text-slate-800 hover:text-brand-600">
                    {t.title}
                  </Link>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                    {t.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
            <GitFork className="h-4 w-4 text-purple-600" /> Project Milestones
          </h2>
          <div className="space-y-3">
            {project.milestones?.length === 0 ? (
              <div className="text-sm text-slate-400 py-4 text-center">No milestones tracked for this project.</div>
            ) : (
              project.milestones?.map((m: any) => (
                <div key={m.id} className="p-3 rounded-lg border border-slate-100 space-y-1">
                  <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                    <span>{m.title}</span>
                    <span className="text-xs font-bold text-emerald-600">{m.status}</span>
                  </div>
                  <p className="text-xs text-slate-500">{m.description || 'Milestone checkpoint'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
