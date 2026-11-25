'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/authContext';
import { apiClient, ApiError } from '@/lib/api';
import { getSocket } from '@/lib/socket';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreVertical,
  ArrowRight,
  Filter,
  CheckSquare2,
  RefreshCw
} from 'lucide-react';

interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'BACKLOG' | 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  assigneeName?: string;
  version: number;
  subtaskCount: number;
  completedSubtasks: number;
}

const COLUMNS: Array<{ id: Task['status']; title: string; color: string }> = [
  { id: 'BACKLOG', title: 'Backlog', color: 'border-slate-300' },
  { id: 'TODO', title: 'To Do', color: 'border-slate-300' },
  { id: 'IN_PROGRESS', title: 'In Progress', color: 'border-sky-400' },
  { id: 'IN_REVIEW', title: 'In Review', color: 'border-purple-400' },
  { id: 'DONE', title: 'Done', color: 'border-emerald-400' },
  { id: 'BLOCKED', title: 'Blocked', color: 'border-rose-400' }
];

export default function TasksPage() {
  const { currentOrgId, role } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [conflictNotice, setConflictNotice] = useState<string | null>(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newProjectId, setNewProjectId] = useState('');

  const loadData = () => {
    if (!currentOrgId) return;
    setLoading(true);

    Promise.all([
      apiClient<any[]>('/projects'),
      apiClient<Task[]>(selectedProject ? `/tasks?projectId=${selectedProject}` : '/tasks')
    ])
      .then(([pList, tList]) => {
        setProjects(pList);
        if (pList.length > 0 && !newProjectId) {
          setNewProjectId(pList[0].id);
        }
        setTasks(tList);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [currentOrgId, selectedProject]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('task:created', (newTask: Task) => {
      if (selectedProject && newTask.projectId !== selectedProject) return;
      setTasks(prev => [newTask, ...prev.filter(t => t.id !== newTask.id)]);
    });

    socket.on('task:updated', (updated: Task) => {
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    });

    socket.on('task:conflict', (conflictData: any) => {
      setConflictNotice(`⚡ Real-time Conflict: ${conflictData.message}`);
    });

    return () => {
      socket.off('task:created');
      socket.off('task:updated');
      socket.off('task:conflict');
    };
  }, [currentOrgId, selectedProject]);

  // Move task status with optimistic locking
  const handleStatusChange = async (task: Task, nextStatus: Task['status']) => {
    setConflictNotice(null);

    try {
      const updated = await apiClient<Task>(`/tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          version: task.version // SEND EXPECTED VERSION FOR OPTIMISTIC CONCURRENCY
        })
      });

      // Update state locally
      setTasks(prev => prev.map(t => (t.id === updated.id ? updated : t)));
    } catch (err: any) {
      if (err.status === 409) {
        setConflictNotice(
          `⚠️ Optimistic Lock Conflict: Task "${task.title}" was modified by another user! The board has refreshed with current state.`
        );
        loadData();
      } else {
        alert(err.message || 'Failed to update task');
      }
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await apiClient<Task>('/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: newProjectId,
          title: newTitle,
          priority: newPriority,
          status: 'TODO'
        })
      });

      if (!selectedProject || created.projectId === selectedProject) {
        setTasks(prev => [created, ...prev.filter(task => task.id !== created.id)]);
      }
      setShowModal(false);
      setNewTitle('');
    } catch (err: any) {
      alert(err.message || 'Error creating task');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Interactive Task Board</h1>
          <p className="text-sm text-slate-500">Live Kanban board with versioned optimistic concurrency protection.</p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedProject}
            onChange={e => setSelectedProject(e.target.value)}
            className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white text-slate-700 shadow-xs focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Projects</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.key})
              </option>
            ))}
          </select>

          <button
            onClick={loadData}
            className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg text-slate-600 transition"
            title="Refresh Tasks"
          >
            <RefreshCw className="h-4 w-4" />
          </button>

          {role !== 'AUDITOR' && (
            <button
              onClick={() => setShowModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-lg shadow-sm shadow-brand-500/30 transition"
            >
              <Plus className="h-4 w-4" /> Add Task
            </button>
          )}
        </div>
      </div>

      {/* Optimistic Concurrency Conflict Banner */}
      {conflictNotice && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm flex items-center justify-between shadow-xs animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
            <span>{conflictNotice}</span>
          </div>
          <button onClick={() => setConflictNotice(null)} className="text-xs font-bold text-amber-700 hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {COLUMNS.map(col => {
          const colTasks = tasks.filter(t => t.status === col.id);
          return (
            <div key={col.id} className="bg-slate-100/70 rounded-xl p-3 flex flex-col min-h-[550px]">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-xs text-slate-700 uppercase tracking-wider">{col.title}</span>
                  <span className="h-5 w-5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center">
                    {colTasks.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto">
                {colTasks.map(task => {
                  const prioColors = {
                    LOW: 'bg-slate-100 text-slate-600',
                    MEDIUM: 'bg-blue-50 text-blue-700',
                    HIGH: 'bg-amber-50 text-amber-700',
                    URGENT: 'bg-rose-50 text-rose-700 border border-rose-200'
                  };

                  return (
                    <div
                      key={task.id}
                      className="bg-white rounded-lg p-3.5 border border-slate-200/80 shadow-xs hover:shadow-md transition space-y-2.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prioColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400" title="Optimistic Locking Version">
                          v{task.version}
                        </span>
                      </div>

                      <Link href={`/tasks/${task.id}`} className="block font-medium text-sm text-slate-900 hover:text-brand-600">
                        {task.title}
                      </Link>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <CheckSquare2 className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {task.completedSubtasks || 0}/{task.subtaskCount || 0}
                          </span>
                        </div>

                        {role !== 'AUDITOR' && (
                          <div className="flex items-center gap-1">
                            {col.id !== 'TODO' && (
                              <button
                                onClick={() => handleStatusChange(task, 'TODO')}
                                className="px-1.5 py-0.5 text-[10px] bg-slate-50 hover:bg-slate-200 rounded text-slate-600"
                                title="Move to To Do"
                              >
                                ←
                              </button>
                            )}
                            {col.id !== 'DONE' && (
                              <button
                                onClick={() => handleStatusChange(task, 'DONE')}
                                className="px-1.5 py-0.5 text-[10px] bg-emerald-50 hover:bg-emerald-100 rounded text-emerald-700 font-bold"
                                title="Mark Done"
                              >
                                ✓
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Project</label>
                <select
                  required
                  value={newProjectId}
                  onChange={e => setNewProjectId(e.target.value)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.key})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Implement refresh token rotation"
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={e => setNewPriority(e.target.value as any)}
                  className="w-full text-sm border border-slate-200 rounded-lg p-2.5"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
