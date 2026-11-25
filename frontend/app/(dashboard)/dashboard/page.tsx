'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiClient } from '@/lib/api';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Activity,
  ShieldCheck
} from 'lucide-react';

export default function DashboardPage() {
  const { currentOrgId, role } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentOrgId) return;

    Promise.all([
      apiClient<any[]>('/projects'),
      apiClient<any[]>('/tasks'),
      apiClient<any[]>('/activities')
    ])
      .then(([pList, tList, aList]) => {
        setProjects(pList);
        setTasks(tList);
        setActivities(aList.slice(0, 6));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentOrgId]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Organization Overview</h1>
          <p className="text-sm text-slate-500">Live operational status, project velocity, and activity telemetry.</p>
        </div>
        <div className="flex items-center gap-3">
          {role !== 'AUDITOR' && (
            <>
              <Link
                href="/projects"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-lg shadow-xs transition"
              >
                <Plus className="h-4 w-4" /> New Project
              </Link>
              <Link
                href="/tasks"
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/30 transition"
              >
                <Plus className="h-4 w-4" /> Add Task
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Projects</span>
            <div className="p-2 rounded-lg bg-sky-50 text-brand-600">
              <FolderKanban className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{projects.length}</div>
          <div className="mt-2 text-xs text-slate-500">Across current organization</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion Rate</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{completionRate}%</div>
          <div className="mt-2 text-xs text-emerald-600 font-medium">
            {completedTasks} of {totalTasks} tasks resolved
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">In Progress</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{inProgressTasks}</div>
          <div className="mt-2 text-xs text-slate-500">Actively being worked on</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Blocked Work</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="text-3xl font-bold text-slate-900">{blockedTasks}</div>
          <div className="mt-2 text-xs text-rose-500 font-medium">Requires immediate unblocking</div>
        </div>
      </div>

      {/* Main Grid: Projects & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Projects List */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-900">Projects Progress</h2>
            <Link href="/projects" className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1">
              View All <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">No active projects yet.</div>
          ) : (
            <div className="space-y-5">
              {projects.map(p => (
                <div key={p.id} className="p-4 rounded-lg border border-slate-100 hover:bg-slate-50/60 transition">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <Link href={`/projects/${p.id}`} className="font-semibold text-sm text-slate-900 hover:text-brand-600">
                        {p.name}
                      </Link>
                      <span className="ml-2 text-xs font-mono text-slate-400">[{p.key}]</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-600">{p.progressPercent || 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${p.progressPercent || 0}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity Timeline */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-500" /> Recent Activity
            </h2>
          </div>

          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">No recent events recorded.</div>
            ) : (
              activities.map(a => (
                <div key={a.id} className="flex gap-3 text-xs border-b border-slate-100 pb-3 last:border-none">
                  <div className="h-6 w-6 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {a.userName?.[0] || 'U'}
                  </div>
                  <div className="flex-1">
                    <div className="text-slate-800">
                      <span className="font-semibold">{a.userName}</span> performed{' '}
                      <code className="text-[11px] bg-slate-100 px-1 py-0.5 rounded text-slate-700">{a.action}</code>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {new Date(a.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
